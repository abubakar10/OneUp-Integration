using System.ComponentModel.DataAnnotations;

namespace OneUpDashboard.Api.Models
{
    public class SyncLog
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string SyncType { get; set; } = string.Empty; // "invoices", "employees", "full"
        
        public DateTime StartTime { get; set; }
        
        public DateTime? EndTime { get; set; }
        
        [MaxLength(50)]
        public string Status { get; set; } = "running"; // "running", "completed", "failed"
        
        public int TotalRecords { get; set; }
        
        public int ProcessedRecords { get; set; }
        
        public int FailedRecords { get; set; }
        
        [MaxLength(1000)]
        public string? ErrorMessage { get; set; }
        
        [MaxLength(2000)]
        public string? Notes { get; set; }
        
        // Duration in seconds
        public int? DurationSeconds { get; set; }
        
        // API calls made during sync
        public int ApiCallsCount { get; set; }
        
        // Last page processed (for resume functionality)
        public int? LastPageProcessed { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

