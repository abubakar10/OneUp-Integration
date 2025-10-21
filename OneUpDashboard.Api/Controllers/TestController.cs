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
        [AllowAnonymous]
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
        [AllowAnonymous]
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
        /// Test MongoDB connection and data structure
        /// </summary>
        [HttpGet("mongodb-test")]
        [AllowAnonymous]
        public async Task<IActionResult> TestMongoDb()
        {
            try
            {
                var result = await _mongoDbService.TestMongoDbConnectionAsync();
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        /// <summary>
        /// Test sync process and database insertion
        /// </summary>
        [HttpPost("test-sync")]
        [AllowAnonymous]
        public async Task<IActionResult> TestSync()
        {
            try
            {
                _logger.LogInformation("🧪 Testing sync process...");
                
                // Get current invoice count
                var beforeCount = await _mongoDbService.GetInvoiceCountAsync();
                
                // Test OneUp API connection
                var apiResponse = await _oneUpClient.GetInvoicesPageAsync(1, 5);
                var jsonData = JsonSerializer.Deserialize<JsonElement>(apiResponse);
                
                if (jsonData.ValueKind != JsonValueKind.Array)
                {
                    return BadRequest(new { success = false, error = "Invalid API response format" });
                }
                
                var invoices = new List<InvoiceDocument>();
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
                
                // Test database insertion
                await _mongoDbService.UpsertInvoicesAsync(invoices);
                
                // Get new invoice count
                var afterCount = await _mongoDbService.GetInvoiceCountAsync();
                
                // Get sample invoices to verify
                var sampleInvoices = await _mongoDbService.GetInvoicesAsync(0, 3);
                
                return Ok(new { 
                    success = true, 
                    beforeCount = beforeCount,
                    afterCount = afterCount,
                    insertedCount = invoices.Count,
                    sampleInvoices = sampleInvoices.Select(i => new { 
                        i.Id, 
                        i.InvoiceNumber, 
                        i.CustomerName, 
                        i.Total, 
                        i.Currency,
                        Date = i.InvoiceDate.ToString("yyyy-MM-dd")
                    }),
                    message = $"Sync test completed. Before: {beforeCount}, After: {afterCount}, Inserted: {invoices.Count}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Sync test failed");
                return StatusCode(500, new { success = false, error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        /// <summary>
        /// Get sync status and recent sync logs
        /// </summary>
        [HttpGet("sync-status")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSyncStatus()
        {
            try
            {
                var syncStatus = await _syncService.GetSyncStatusAsync();
                var recentSyncLogs = await _mongoDbService.GetSyncLogsAsync(5);
                var totalInvoices = await _mongoDbService.GetInvoiceCountAsync();
                
                return Ok(new { 
                    success = true, 
                    syncStatus = syncStatus,
                    totalInvoices = totalInvoices,
                    recentSyncLogs = recentSyncLogs.Select(log => new {
                        log.Id,
                        log.SyncType,
                        log.Status,
                        log.StartTime,
                        log.EndTime,
                        log.TotalRecords,
                        log.ProcessedRecords,
                        log.ApiCallsCount,
                        log.DurationSeconds,
                        log.ErrorMessage,
                        log.Notes
                    })
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        /// <summary>
        /// Diagnose database insertion issues
        /// </summary>
        [HttpGet("diagnose-db")]
        [AllowAnonymous]
        public async Task<IActionResult> DiagnoseDatabase()
        {
            try
            {
                // Get current count
                var currentCount = await _mongoDbService.GetInvoiceCountAsync();
                
                // Get sample invoices
                var sampleInvoices = await _mongoDbService.GetInvoicesAsync(0, 5);
                
                // Get latest invoices
                var latestInvoices = await _mongoDbService.GetInvoicesAsync(0, 10);
                
                // Check for duplicates
                var allInvoices = await _mongoDbService.GetInvoicesAsync(0, int.MaxValue);
                var duplicateIds = allInvoices.GroupBy(x => x.Id)
                    .Where(g => g.Count() > 1)
                    .Select(g => new { Id = g.Key, Count = g.Count() })
                    .ToList();
                
                // Get invoice ID range
                var minId = allInvoices.Any() ? allInvoices.Min(x => x.Id) : 0;
                var maxId = allInvoices.Any() ? allInvoices.Max(x => x.Id) : 0;
                
                return Ok(new { 
                    success = true, 
                    currentCount = currentCount,
                    minInvoiceId = minId,
                    maxInvoiceId = maxId,
                    sampleInvoices = sampleInvoices.Select(i => new { 
                        i.Id, 
                        i.InvoiceNumber, 
                        i.CustomerName, 
                        i.Total, 
                        i.Currency,
                        Date = i.InvoiceDate.ToString("yyyy-MM-dd"),
                        SyncedAt = i.SyncedAt.ToString("yyyy-MM-dd HH:mm:ss")
                    }),
                    latestInvoices = latestInvoices.Select(i => new { 
                        i.Id, 
                        i.InvoiceNumber, 
                        i.SyncedAt
                    }),
                    duplicateIds = duplicateIds,
                    totalUniqueIds = allInvoices.Select(x => x.Id).Distinct().Count()
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
        [AllowAnonymous]
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