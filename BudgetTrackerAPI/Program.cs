using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using BudgetTrackerAPI.Data;
using BudgetTrackerAPI.Models;
using BudgetTrackerAPI.Services;
using System.Text;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// 1. REGISTER SERVICES
// ==========================================

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS Policy
builder.Services.AddScoped<EmailService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "https://budget-tracker-sooty-theta.vercel.app") 
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

app.MapPost("/api/expenses/process-recurring", async (BudgetTrackerContext db, ClaimsPrincipal user) =>
{
    var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var now = DateTime.UtcNow;

    var recurringExpenses = await db.Expenses
        .Where(e => e.UserId == userId && e.IsRecurring && !e.IsPending)
        .ToListAsync();

    int generatedCount = 0;

    foreach (var re in recurringExpenses)
    {
        DateTime baseDate = re.LastProcessedDate ?? re.Date;
        DateTime nextDueDate = baseDate.AddMonths(1);

        if (now >= nextDueDate)
        {
            var pendingExpense = new Expense
            {
                UserId = userId!,
                Description = re.Description,
                Amount = re.Amount,
                Category = re.Category,
                Date = nextDueDate,
                IsRecurring = false, 
                IsPending = true,    
                ReceiptUrl = null 
            };
            
            db.Expenses.Add(pendingExpense);
            re.LastProcessedDate = nextDueDate;
            generatedCount++;
        }
    }

    if (generatedCount > 0) await db.SaveChangesAsync();
    return Results.Ok(new { Generated = generatedCount });
}).RequireAuthorization();

app.MapGet("/api/expenses", async (string? search, string? category, BudgetTrackerContext db, ClaimsPrincipal user) =>
{
    var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var query = db.Expenses.Where(e => e.UserId == userId);

    if (!string.IsNullOrEmpty(search))
    {
        query = query.Where(e => e.Description.ToLower().Contains(search.ToLower()));
    }

    if (!string.IsNullOrEmpty(category) && category != "All")
    {
        query = query.Where(e => e.Category == category);
    }

    return await query.OrderByDescending(e => e.Date).ToListAsync();
}).RequireAuthorization();

app.MapGet("/api/expenses/insights", async (BudgetTrackerContext db, ClaimsPrincipal user) =>
{
    var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var expenses = await db.Expenses.Where(e => e.UserId == userId).ToListAsync();

    if (!expenses.Any())
        return Results.Ok(new { Message = "Add some expenses to unlock personalized insights!" });

    var topCategory = expenses
        .GroupBy(e => e.Category)
        .OrderByDescending(g => g.Sum(e => e.Amount))
        .First();

    var currentMonth = DateTime.UtcNow.Month;
    var currentYear = DateTime.UtcNow.Year;
    var thisMonthTotal = expenses
        .Where(e => e.Date.Month == currentMonth && e.Date.Year == currentYear)
        .Sum(e => e.Amount);

    string message = $"You've spent R {thisMonthTotal:N2} this month. Your biggest expense category is {topCategory.Key}.";

    return Results.Ok(new { Message = message });
}).RequireAuthorization();

app.MapGet("/api/budgets", async (BudgetTrackerContext db, ClaimsPrincipal user) =>
{
    var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    return await db.Budgets.Where(b => b.UserId == userId).ToListAsync();
}).RequireAuthorization();

app.MapPost("/api/budgets", async (Budget budget, BudgetTrackerContext db, ClaimsPrincipal user) =>
{
    var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    budget.UserId = userId!;

    var existingBudget = await db.Budgets.FirstOrDefaultAsync(b => b.UserId == userId && b.Category == budget.Category);

    if (existingBudget != null)
    {
        existingBudget.MonthlyLimit = budget.MonthlyLimit;
    }
    else
    {
        db.Budgets.Add(budget);
    }

    await db.SaveChangesAsync();
    return Results.Ok(budget);
}).RequireAuthorization();

app.MapGet("/api/expenses/{id}", async (int id, BudgetTrackerContext db, ClaimsPrincipal user) =>
{
    var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var expense = await db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
    return expense is not null ? Results.Ok(expense) : Results.NotFound();
}).RequireAuthorization();

app.MapPost("/api/expenses", async (Expense expense, BudgetTrackerContext db, ClaimsPrincipal user) =>
{
    var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    expense.UserId = userId!; 
    
    db.Expenses.Add(expense);
    await db.SaveChangesAsync();
    return Results.Created($"/api/expenses/{expense.Id}", expense);
}).RequireAuthorization();

app.MapPut("/api/expenses/{id}", async (int id, Expense inputExpense, BudgetTrackerContext db, ClaimsPrincipal user) =>
{
    var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var expense = await db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
    
    if (expense is null) return Results.NotFound();

    expense.Description = inputExpense.Description;
    expense.Amount = inputExpense.Amount;
    expense.Date = inputExpense.Date;
    expense.Category = inputExpense.Category;
    expense.ReceiptUrl = inputExpense.ReceiptUrl; 
    expense.IsRecurring = inputExpense.IsRecurring;
    expense.IsPending = inputExpense.IsPending;

    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();  

app.MapDelete("/api/expenses/{id}", async (int id, BudgetTrackerContext db, ClaimsPrincipal user) =>
{
    var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var expense = await db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
    
    if (expense is null) return Results.NoContent();

    db.Expenses.Remove(expense);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

app.MapDelete("/api/budgets/{id}", async (int id, BudgetTrackerContext db, ClaimsPrincipal user) =>
{
    var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var budget = await db.Budgets.FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);
    
    if (budget is null) return Results.NotFound();

    db.Budgets.Remove(budget);
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

authGroup.MapPost("/forgot-password", async (UserManager<AppUser> userManager, EmailService emailService, ForgotPasswordDto dto) =>
{
    var user = await userManager.FindByEmailAsync(dto.Email);
    if (user == null) return Results.Ok(new { Message = "If an account exists, a reset link has been sent." });

    var token = await userManager.GeneratePasswordResetTokenAsync(user);
    var encodedToken = Uri.EscapeDataString(token);

    // NOTE: Change this to your Vercel URL once deployed! 
    var resetLink = $"https://budget-tracker-sooty-theta.vercel.app/reset-password?email={dto.Email}&token={encodedToken}";

    try
    {
        var emailBody = $@"
            <h2>Password Reset Request</h2>
            <p>Hello {user.FirstName},</p>
            <p>You requested to reset your password. Click the link below to set a new one:</p>
            <a href='{resetLink}' style='padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;'>Reset Password</a>
            <p>If you didn't request this, you can safely ignore this email.</p>
        ";

        await emailService.SendEmailAsync(dto.Email, "Reset Your Budget Tracker Password", emailBody);
        
        return Results.Ok(new { Message = "If an account exists, a reset link has been sent." });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Email failed: {ex.Message}");
        // THIS WAS THE LINE WITH THE SYNTAX ERROR (Missing closing brace)
        return Results.BadRequest(new { Message = "Failed to send email. Please try again later." });
    }
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

record RegisterDto(string Email, string Password, string FirstName, string LastName);
record LoginDto(string Email, string Password);
record ForgotPasswordDto(string Email);
record ResetPasswordDto(string Email, string Token, string NewPassword);