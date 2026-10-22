using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace BudgetTrackerAPI.Data
{
    public class BudgetTrackerContextFactory : IDesignTimeDbContextFactory<BudgetTrackerContext>
    {
         public BudgetTrackerContext CreateDbContext(string[] args)
        {
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json")
                .AddJsonFile("appsettings.Development.json", optional: true)
                .AddUserSecrets<BudgetTrackerContextFactory>()
                .Build();

         var connectionString = configuration.GetConnectionString("SupabaseConnection");

         var optionsBuilder = new DbContextOptionsBuilder<BudgetTrackerContext>();
            optionsBuilder.UseNpgsql(connectionString);

        return new BudgetTrackerContext(optionsBuilder.Options);       }
    }
}
