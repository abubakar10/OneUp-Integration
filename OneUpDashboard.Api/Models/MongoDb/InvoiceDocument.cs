using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OneUpDashboard.Api.Models.MongoDb
{
    public class InvoiceDocument
    {
        [BsonId]
        [BsonRepresentation(BsonType.Int32)]
        public int Id { get; set; }
        
        [BsonElement("invoiceNumber")]
        public string InvoiceNumber { get; set; } = string.Empty;
        
        [BsonElement("invoiceDate")]
        public DateTime InvoiceDate { get; set; }
        
        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; }
        
        [BsonElement("customerName")]
        public string CustomerName { get; set; } = string.Empty;
        
        [BsonElement("total")]
        public decimal Total { get; set; }
        
        [BsonElement("currency")]
        public string Currency { get; set; } = "USD";
        
        [BsonElement("employeeId")]
        public int? EmployeeId { get; set; }
        
        [BsonElement("salespersonName")]
        public string SalespersonName { get; set; } = string.Empty;
        
        [BsonElement("description")]
        public string? Description { get; set; }
        
        [BsonElement("status")]
        public string? Status { get; set; }
        
        [BsonElement("syncedAt")]
        public DateTime SyncedAt { get; set; } = DateTime.UtcNow;
        
        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
