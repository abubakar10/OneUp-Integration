using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OneUpDashboard.Api.Services;
using OneUpDashboard.Api.Models.MongoDb;
using System.Text.Json;

namespace OneUpDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TestController : ControllerBase
    {
        private readonly DataSyncService _syncService;
        private readonly OneUpClient _oneUpClient;
        private readonly MongoDbService _mongoDbService;
        private readonly ILogger<TestController> _logger;

        public TestController(
            DataSyncService syncService,
            OneUpClient oneUpClient,
            MongoDbService mongoDbService,
            ILogger<TestController> logger)
        {
            _syncService = syncService;
            _oneUpClient = oneUpClient;
            _mongoDbService = mongoDbService;
            _logger = logger;
        }

        /// <summary>
        /// Test OneUp API connection directly
        /// </summary>
        [HttpGet("oneup-test")]
        public async Task<IActionResult> TestOneUpApi()
        {
            try
            {
                _logger.LogInformation("Testing OneUp API connection...");
                var result = await _oneUpClient.GetInvoicesPageAsync(1, 5);
                return Ok(new { success = true, data = result, message = "OneUp API is working!" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OneUp API test failed");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        /// <summary>
        /// Debug endpoint to check database status and frontend connectivity
        /// </summary>
        [HttpGet("debug-status")]
        public async Task<IActionResult> DebugStatus()
        {
            try
            {
                var invoiceCount = await _mongoDbService.GetInvoiceCountAsync();
                var sampleInvoices = await _mongoDbService.GetInvoicesAsync(0, 3);

                var sampleData = sampleInvoices.Select(i => new { 
                    i.Id, 
                    i.InvoiceNumber, 
                    i.CustomerName, 
                    i.Total, 
                    i.Currency,
                    Date = i.InvoiceDate.ToString("yyyy-MM-dd")
                }).ToList();

                return Ok(new {
                    success = true,
                    timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC"),
                    database = new {
                        totalInvoices = invoiceCount,
                        sampleInvoices = sampleData
                    },
                    message = $"MongoDB database has {invoiceCount} invoices. Frontend should be able to see this data!"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        /// <summary>
        /// Populate database with sample invoices from OneUp API (MongoDB version)
        /// </summary>
        [HttpPost("populate-db")]
        public async Task<IActionResult> PopulateDatabase()
        {
            try
            {
                _logger.LogInformation("🚀 Populating MongoDB database with sample invoices...");
                
                // Fetch invoices from OneUp API
                var jsonResponse = await _oneUpClient.GetInvoicesPageAsync(1, 20);
                var jsonData = JsonSerializer.Deserialize<JsonElement>(jsonResponse);
                
                var invoices = new List<InvoiceDocument>();
                
                if (jsonData.ValueKind == JsonValueKind.Array)
                {
                    foreach (var invoiceElement in jsonData.EnumerateArray())
                    {
                        var invoice = new InvoiceDocument
                        {
                            Id = GetIntProperty(invoiceElement, "id"),
                            InvoiceNumber = GetStringProperty(invoiceElement, "user_code") ?? "INV-" + GetIntProperty(invoiceElement, "id"),
                            CustomerName = GetCustomerName(invoiceElement),
                            Currency = GetStringProperty(invoiceElement, "currency_iso_code") ?? "USD",
                            Total = GetDecimalProperty(invoiceElement, "total"),
                            InvoiceDate = GetDateProperty(invoiceElement, "date") ?? DateTime.UtcNow,
                            CreatedAt = GetDateProperty(invoiceElement, "created_at") ?? DateTime.UtcNow,
                            EmployeeId = GetIntProperty(invoiceElement, "employee_id") > 0 ? GetIntProperty(invoiceElement, "employee_id") : null,
                            SalespersonName = "Employee " + GetIntProperty(invoiceElement, "employee_id"),
                            Status = "Active",
                            Description = GetStringProperty(invoiceElement, "public_note"),
                            SyncedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        
                        invoices.Add(invoice);
                    }
                }
                
                // Save to MongoDB
                await _mongoDbService.InsertInvoicesAsync(invoices);
                
                // Get summary stats
                var totalByCurrency = invoices.GroupBy(i => i.Currency)
                    .Select(g => new { Currency = g.Key, Count = g.Count(), Total = g.Sum(i => i.Total) })
                    .ToList();
                
                return Ok(new { 
                    success = true, 
                    count = invoices.Count,
                    totalValue = invoices.Sum(i => i.Total),
                    currencyBreakdown = totalByCurrency,
                    dateRange = new { 
                        from = invoices.Min(i => i.InvoiceDate).ToString("yyyy-MM-dd"),
                        to = invoices.Max(i => i.InvoiceDate).ToString("yyyy-MM-dd")
                    },
                    sampleInvoices = invoices.Take(5).Select(i => new { 
                        i.InvoiceNumber, 
                        i.CustomerName, 
                        i.Total, 
                        i.Currency,
                        Date = i.InvoiceDate.ToString("yyyy-MM-dd")
                    }),
                    message = $"Successfully populated MongoDB database with {invoices.Count} invoices!" 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MongoDB population failed");
                return StatusCode(500, new { success = false, error = ex.Message, stackTrace = ex.StackTrace });
            }
        }
        
        private string? GetStringProperty(JsonElement element, string propertyName)
        {
            return element.TryGetProperty(propertyName, out var prop) && prop.ValueKind == JsonValueKind.String
                ? prop.GetString()
                : null;
        }
        
        private int GetIntProperty(JsonElement element, string propertyName)
        {
            return element.TryGetProperty(propertyName, out var prop) && prop.ValueKind == JsonValueKind.Number
                ? prop.GetInt32()
                : 0;
        }
        
        private decimal GetDecimalProperty(JsonElement element, string propertyName)
        {
            if (element.TryGetProperty(propertyName, out var prop))
            {
                if (prop.ValueKind == JsonValueKind.Number)
                    return prop.GetDecimal();
                if (prop.ValueKind == JsonValueKind.String && decimal.TryParse(prop.GetString(), out var result))
                    return result;
            }
            return 0;
        }
        
        private DateTime? GetDateProperty(JsonElement element, string propertyName)
        {
            if (element.TryGetProperty(propertyName, out var prop) && prop.ValueKind == JsonValueKind.String)
            {
                var dateString = prop.GetString();
                if (DateTime.TryParse(dateString, out var date))
                    return date;
            }
            return null;
        }
        
        private string GetCustomerName(JsonElement element)
        {
            if (element.TryGetProperty("customer", out var customer) && customer.ValueKind == JsonValueKind.Object)
            {
                if (customer.TryGetProperty("name", out var name) && name.ValueKind == JsonValueKind.String)
                    return name.GetString() ?? "Unknown Customer";
            }
            return "Unknown Customer";
        }
    }
}