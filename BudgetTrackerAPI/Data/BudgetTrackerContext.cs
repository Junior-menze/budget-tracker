using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using BudgetTrackerAPI.Models;

namespace BudgetTrackerAPI.Data;

public class BudgetTrackerContext: IdentityDbContext<AppUser>
{
	public BudgetTrackerContext(DbContextOptions<BudgetTrackerContext> options): base (options)
	{

	}

	//This maps to the postgres data tables
	public DbSet<Expense> Expenses { get; set; }
	public DbSet<Budget> Budgets { get; set; }

}
