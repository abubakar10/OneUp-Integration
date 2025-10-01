using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OneUpDashboard.Api.Models.MongoDb
{
    public class SyncLogDocument
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;
        
        [BsonElement("syncType")]
        public string SyncType { get; set; } = string.Empty;
        
        [BsonElement("startTime")]
        public DateTime StartTime { get; set; }
        
        [BsonElement("endTime")]
        public DateTime? EndTime { get; set; }
        
        [BsonElement("status")]
        public string Status { get; set; } = string.Empty;
        
        [BsonElement("totalRecords")]
        public int TotalRecords { get; set; }
        
        [BsonElement("processedRecords")]
        public int ProcessedRecords { get; set; }
        
        [BsonElement("apiCallsCount")]
        public int ApiCallsCount { get; set; }
        
        [BsonElement("durationSeconds")]
        public int? DurationSeconds { get; set; }
        
        [BsonElement("errorMessage")]
        public string? ErrorMessage { get; set; }
        
        [BsonElement("notes")]
        public string? Notes { get; set; }
        
        [BsonElement("lastPageProcessed")]
        public int? LastPageProcessed { get; set; }
        
        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
