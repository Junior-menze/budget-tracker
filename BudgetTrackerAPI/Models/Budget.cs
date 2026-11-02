using System.ComponentModel.DataAnnotations;

namespace BudgetTrackerAPI.Models
{
    public class Budget
    {
        [Key]
        public int Id {get; set;}
        public string UserId {get; set;} = string.Empty;
        public string Category {get; set;} = string.Empty;
        public decimal MonthlyLimit {get; set;}

    }
}
