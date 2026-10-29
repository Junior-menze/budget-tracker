using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using BudgetTrackerAPI.Data;
using BudgetTrackerAPI.Models;
using System.Text;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// 1. REGISTER SERVICES
// ==========================================

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Database (Supabase PostgreSQL)
builder.Services.AddDbContext<BudgetTrackerContext>(options => 
    options.UseNpgsql(builder.Configuration.GetConnectionString("SupabaseConnection")));

// ASP.NET Core Identity
builder.Services.AddIdentity<AppUser, IdentityRole>()
    .AddEntityFrameworkStores<BudgetTrackerContext>()
    .AddDefaultTokenProviders()
    .AddTokenProvider<DataProtectorTokenProvider<AppUser>>(TokenOptions.DefaultProvider);

builder.Services.Configure<DataProtectionTokenProviderOptions>(options =>
{
    options.TokenLifespan = TimeSpan.FromHours(2);
});

// JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

// ==========================================
// 2. MIDDLEWARE PIPELINE
// ==========================================

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// IMPORTANT: Order matters here
app.UseCors("AllowAngular");
app.UseAuthentication();
app.UseAuthorization();

// ==========================================
// 3. EXPENSES ENDPOINTS (Protected)
// ==========================================

// GET: Retrieve ONLY the logged-in user's expenses
app.MapGet("/api/expenses", async (BudgetTrackerContext db, ClaimsPrincipal user) =>
{
    var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    return await db.Expenses.Where(e => e.UserId == userId).ToListAsync();
}).RequireAuthorization();

// GET: Retrieve a single expense by ID (Only if it belongs to the user)
app.MapGet("/api/expenses/{id}", async (int id, BudgetTrackerContext db, ClaimsPrincipal user) =>
{
    var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var expense = await db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
    return expense is not null ? Results.Ok(expense) : Results.NotFound();
}).RequireAuthorization();

// POST: Create a new expense and assign it to the logged-in user
app.MapPost("/api/expenses", async (Expense expense, BudgetTrackerContext db, ClaimsPrincipal user) =>
{
    var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    expense.UserId = userId!; // Override whatever the frontend sent with the true UserId
    
    db.Expenses.Add(expense);
    await db.SaveChangesAsync();
    return Results.Created($"/api/expenses/{expense.Id}", expense);
}).RequireAuthorization();

// PUT: Update an existing expense (Only if it belongs to the user)
app.MapPut("/api/expenses/{id}", async (int id, Expense inputExpense, BudgetTrackerContext db, ClaimsPrincipal user) =>
{
    var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var expense = await db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
    
    if (expense is null) return Results.NotFound();

    expense.Description = inputExpense.Description;
    expense.Amount = inputExpense.Amount;
    expense.Date = inputExpense.Date;
    expense.Category = inputExpense.Category;

    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

// DELETE: Remove an expense (Only if it belongs to the user)
app.MapDelete("/api/expenses/{id}", async (int id, BudgetTrackerContext db, ClaimsPrincipal user) =>
{
    var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var expense = await db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
    
    if (expense is null) return Results.NoContent();

    db.Expenses.Remove(expense);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();


// ==========================================
// 4. AUTHENTICATION ENDPOINTS
// ==========================================

var authGroup = app.MapGroup("/api/auth");

authGroup.MapPost("/register", async (UserManager<AppUser> userManager, RegisterDto dto) =>
{
    var user = new AppUser 
    { 
        UserName = dto.Email, 
        Email = dto.Email,
        FirstName = dto.FirstName, 
        LastName = dto.LastName 
    };
    
    var result = await userManager.CreateAsync(user, dto.Password);

    if (!result.Succeeded) return Results.BadRequest(result.Errors);
    return Results.Ok(new { Message = "User created successfully!" });
});

authGroup.MapPost("/login", async (UserManager<AppUser> userManager, IConfiguration config, LoginDto dto) =>
{
    var user = await userManager.FindByEmailAsync(dto.Email);
    if (user == null || !await userManager.CheckPasswordAsync(user, dto.Password))
        return Results.Unauthorized();

    // Generate JWT Token
    var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
    var key = Encoding.UTF8.GetBytes(config["Jwt:Key"]!);
    var tokenDescriptor = new SecurityTokenDescriptor
    {
        Subject = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email!)
        }),
        Expires = DateTime.UtcNow.AddDays(7),
        Issuer = config["Jwt:Issuer"],
        Audience = config["Jwt:Audience"],
        SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
    };

    var token = tokenHandler.CreateToken(tokenDescriptor);
    return Results.Ok(new { Token = tokenHandler.WriteToken(token) });
});

authGroup.MapPost("/forgot-password", async (UserManager<AppUser> userManager, ForgotPasswordDto dto) =>
{
    var user = await userManager.FindByEmailAsync(dto.Email);
    if (user == null) return Results.Ok(new { Message = "If an account exists, a reset link has been sent." });

    var token = await userManager.GeneratePasswordResetTokenAsync(user);
    
    // Print to console for local testing
    Console.WriteLine($"\n=======================================================");
    Console.WriteLine($"PASSWORD RESET LINK FOR: {dto.Email}");
    Console.WriteLine($"http://localhost:4200/reset-password?email={dto.Email}&token={Uri.EscapeDataString(token)}");
    Console.WriteLine($"=======================================================\n");

    return Results.Ok(new { Message = "If an account exists, a reset link has been sent." });
});

authGroup.MapPost("/reset-password", async (UserManager<AppUser> userManager, ResetPasswordDto dto) =>
{
    var user = await userManager.FindByEmailAsync(dto.Email);
    if (user == null) return Results.BadRequest(new { Message = "Invalid request." });

    var result = await userManager.ResetPasswordAsync(user, dto.Token, dto.NewPassword);
    if (result.Succeeded) return Results.Ok(new { Message = "Password reset successfully." });

    return Results.BadRequest(result.Errors);
});

// ==========================================
// 5. START APP & RECORDS
// ==========================================

app.Run();

// DTOs (Data Transfer Objects)
record RegisterDto(string Email, string Password, string FirstName, string LastName);
record LoginDto(string Email, string Password);
record ForgotPasswordDto(string Email);
record ResetPasswordDto(string Email, string Token, string NewPassword);