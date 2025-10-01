using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OneUpDashboard.Api.Models.MongoDb
{
    public class EmployeeDocument
    {
        [BsonId]
        [BsonRepresentation(BsonType.Int32)]
        public int Id { get; set; }
        
        [BsonElement("firstName")]
        public string FirstName { get; set; } = string.Empty;
        
        [BsonElement("lastName")]
        public string LastName { get; set; } = string.Empty;
        
        [BsonElement("email")]
        public string? Email { get; set; }
        
        [BsonElement("phone")]
        public string? Phone { get; set; }
        
        [BsonElement("department")]
        public string? Department { get; set; }
        
        [BsonElement("position")]
        public string? Position { get; set; }
        
        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;
        
        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Computed property for full name
        [BsonIgnore]
        public string FullName => $"{FirstName} {LastName}".Trim();
    }
}
