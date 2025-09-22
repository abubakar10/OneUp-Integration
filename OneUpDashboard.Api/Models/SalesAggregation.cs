using System.ComponentModel.DataAnnotations;

namespace OneUpDashboard.Api.Models
{
    public class SalesAggregation
    {
        [Key]
        public int Id { get; set; }
        
        public int EmployeeId { get; set; }
        public string SalespersonName { get; set; } = string.Empty;
        
        // Aggregated data
        public decimal TotalSales { get; set; }
        public int InvoiceCount { get; set; }
        public decimal AverageSale { get; set; }
        
        // Time period filters
        public DateTime? PeriodStart { get; set; }
        public DateTime? PeriodEnd { get; set; }
        public string Currency { get; set; } = "USD";
        
        // Metadata
        public DateTime LastUpdated { get; set; }
        public string AggregationType { get; set; } = "AllTime"; // AllTime, Daily, Monthly, Quarterly, Yearly
    }
}

