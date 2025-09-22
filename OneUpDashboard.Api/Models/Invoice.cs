using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OneUpDashboard.Api.Models
{
    public class Invoice
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string InvoiceNumber { get; set; } = string.Empty;
        
        public DateTime InvoiceDate { get; set; }
        
        public DateTime CreatedAt { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string CustomerName { get; set; } = string.Empty;
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal Total { get; set; }
        
        [MaxLength(10)]
        public string Currency { get; set; } = "USD";
        
        public int? EmployeeId { get; set; }
        
        [MaxLength(200)]
        public string SalespersonName { get; set; } = string.Empty;
        
        // Additional fields for comprehensive data
        [MaxLength(500)]
        public string? Description { get; set; }
        
        [MaxLength(50)]
        public string? Status { get; set; }
        
        // Tracking fields
        public DateTime SyncedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation property
        public virtual Employee? Employee { get; set; }
    }
}

