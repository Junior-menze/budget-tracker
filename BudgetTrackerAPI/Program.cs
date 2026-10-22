using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using BudgetTrackerAPI.Data;
using BudgetTrackerAPI.Models;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

//1. Add CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<BudgetTrackerContext>(options => options.UseNpgsql(builder.Configuration.GetConnectionString("SupabaseConnection")));

var app = builder.Build();

app.UseCors("AllowAngular");

//1. GET: Retrieve all expenses
app.MapGet("api/expenses", async (BudgetTrackerContext db) => await db.Expenses.ToListAsync());

//2 GET: Retrieve a single expense by ID
app.MapGet("api/expenses/{id}", async (int id, BudgetTrackerContext db) => await db.Expenses.FindAsync(id) is Expense expense
            ? Results.Ok(expense): Results.NotFound());

//3. POST: Create a new expense 
app.MapPost("api/expenses", async (Expense expense, BudgetTrackerContext db) =>
{
    db.Expenses.Add(expense);
    await db.SaveChangesAsync();

    return Results.Created($"api/expenses/{expense.Id}", expense);
});

//4. PUT: update and existing expense
app.MapPut("api/expenses/{id}", async (int id, Expense inputExpense, BudgetTrackerContext db) =>
{
    var expense = await db.Expenses.FindAsync(id);
    if (expense is null) return Results.NotFound();

    expense.Description = inputExpense.Description;
    expense.Amount = inputExpense.Amount;
    expense.Date = inputExpense.Date;
    expense.Category = inputExpense.Category;

    await db.SaveChangesAsync();
    return Results.NoContent();
});

//5. DELETE: Remove an expense
app.MapDelete("api/expenses/{id}", async (int id, BudgetTrackerContext db) =>
{
    var expense = await db.Expenses.FindAsync(id);
    if (expense is null) return Results.NoContent();

    db.Expenses.Remove(expense);
    await db.SaveChangesAsync();
    return Results.NoContent();
});


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseSwagger();
app.UseSwaggerUI();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};


app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
