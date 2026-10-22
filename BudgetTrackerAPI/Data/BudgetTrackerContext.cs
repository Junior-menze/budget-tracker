using System;
using Microsoft.EntityFrameworkCore;
using BudgetTrackerAPI.Models;

namespace BudgetTrackerAPI.Data;

public class BudgetTrackerContext: DbContext
{
	public BudgetTrackerContext(DbContextOptions<BudgetTrackerContext> options): base (options)
	{

	}

	//This maps to the postgres 'Expense' table
	public DbSet<Expense> Expenses { get; set; }
}
