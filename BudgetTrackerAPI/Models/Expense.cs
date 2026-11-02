using System.ComponentModel.DataAnnotations;

namespace BudgetTrackerAPI.Models
{
    public class Expense
    {
        [Key]
        public int Id { get; set; }

        public string Description { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public DateTime Date { get; set; } = DateTime.UtcNow;

        public string Category { get; set; } = "General";

        public string UserId { get; set; } = string.Empty;
        public string? ReceiptUrl { get; set; } 
        public bool IsRecurring { get; set; } = false; 
        public bool IsPending { get; set; } = false; 
        public DateTime? LastProcessedDate { get; set; } 


    }
}