using Microsoft.AspNetCore.Identity;

namespace BudgetTrackerAPI.Models;

public class AppUser : IdentityUser
{
    // Custom fields we are adding to the default user
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}
