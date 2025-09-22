using Microsoft.EntityFrameworkCore;
using OneUpDashboard.Api.Data;
using OneUpDashboard.Api.Models;
using System.Text.Json;

namespace OneUpDashboard.Api.Services
{
    public class DataSyncService
    {
        private readonly DashboardDbContext _context;
        private readonly OneUpClient _oneUpClient;
        private readonly ILogger<DataSyncService> _logger;

        public DataSyncService(
            DashboardDbContext context,
            OneUpClient oneUpClient,
            ILogger<DataSyncService> logger)
        {
            _context = context;
            _oneUpClient = oneUpClient;
            _logger = logger;
        }

        /// <summary>
        /// Performs a complete sync of all invoices from OneUp API
        /// This is the main method that implements the smart pagination loop
        /// </summary>
        public async Task<SyncResult> SyncAllInvoicesAsync()
        {
            var syncLog = new SyncLog
            {
                SyncType = "invoices",
                StartTime = DateTime.UtcNow,
                Status = "running"
            };

            _context.SyncLogs.Add(syncLog);
            await _context.SaveChangesAsync();

            try
            {
                _logger.LogInformation("🔄 Starting full sync of OneUp invoices...");

                // Step 1: Sync employees first (for salesperson names)
                await SyncEmployeesAsync();

                // Step 2: Sync invoices with smart pagination loop
                var result = await SyncInvoicesWithPaginationAsync(syncLog);

                // Step 3: Update sync log
                syncLog.EndTime = DateTime.UtcNow;
                syncLog.Status = "completed";
                syncLog.TotalRecords = result.TotalInvoices;
                syncLog.ProcessedRecords = result.ProcessedInvoices;
                syncLog.ApiCallsCount = result.ApiCalls;
                syncLog.DurationSeconds = (int)(syncLog.EndTime.Value - syncLog.StartTime).TotalSeconds;
                syncLog.Notes = $"Successfully synced {result.TotalInvoices} invoices in {result.ApiCalls} API calls";

                await _context.SaveChangesAsync();

                _logger.LogInformation("✅ Sync complete! Total invoices: {TotalInvoices}", result.TotalInvoices);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Sync failed: {Message}", ex.Message);

                syncLog.EndTime = DateTime.UtcNow;
                syncLog.Status = "failed";
                syncLog.ErrorMessage = ex.Message;
                syncLog.DurationSeconds = (int)(syncLog.EndTime.Value - syncLog.StartTime).TotalSeconds;

                await _context.SaveChangesAsync();

                throw;
            }
        }

        /// <summary>
        /// Smart pagination loop - fetches ALL invoices respecting OneUp API's 100-record limit
        /// </summary>
        private async Task<SyncResult> SyncInvoicesWithPaginationAsync(SyncLog syncLog)
        {
            var result = new SyncResult();
            var batchInvoices = new List<Invoice>();
            const int batchSize = 500; // Save to DB every 500 invoices (5 API calls)

            int page = 1;
            bool hasMoreData = true;

            // Get existing invoice IDs to avoid duplicates
            var existingInvoiceIds = (await _context.Invoices
                .Select(i => i.Id)
                .ToListAsync()).ToHashSet();

            while (hasMoreData)
            {
                try
                {
                    _logger.LogInformation("📥 Fetching page {Page}...", page);

                    // Fetch one page from OneUp API (max 100 invoices)
                    var apiResponse = await _oneUpClient.GetInvoicesPageAsync(page, 100);
                    var jsonData = JsonSerializer.Deserialize<JsonElement>(apiResponse);

                    result.ApiCalls++;

                    if (jsonData.ValueKind != JsonValueKind.Array)
                    {
                        _logger.LogWarning("⚠️ Unexpected API response format on page {Page}", page);
                        break;
                    }

                    var pageInvoices = jsonData.EnumerateArray().ToList();
                    
                    // Check if this is the last page
                    if (pageInvoices.Count < 100)
                    {
                        hasMoreData = false;
                        _logger.LogInformation("📄 Last page reached. Found {Count} invoices on page {Page}", pageInvoices.Count, page);
                    }

                    if (pageInvoices.Count == 0)
                    {
                        _logger.LogInformation("📄 No more invoices found. Stopping at page {Page}", page);
                        break;
                    }

                    // Process each invoice in this page
                    foreach (var invoiceElement in pageInvoices)
                    {
                        var invoice = await ProcessInvoiceElementAsync(invoiceElement, existingInvoiceIds);
                        if (invoice != null)
                        {
                            batchInvoices.Add(invoice);
                            result.ProcessedInvoices++;
                        }
                    }

                    result.TotalInvoices += pageInvoices.Count;

                    // Save batch to database every 500 invoices
                    if (batchInvoices.Count >= batchSize)
                    {
                        await SaveInvoiceBatchAsync(batchInvoices);
                        batchInvoices.Clear();
                        _logger.LogInformation("💾 Saved batch. Total processed: {Total}", result.ProcessedInvoices);
                    }

                    // Update sync log progress
                    syncLog.ProcessedRecords = result.ProcessedInvoices;
                    syncLog.LastPageProcessed = page;
                    await _context.SaveChangesAsync();

                    // Be nice to the API - small delay between requests
                    await Task.Delay(500);

                    page++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ Error processing page {Page}: {Message}", page, ex.Message);
                    result.FailedPages++;
                    
                    // Continue with next page instead of stopping
                    page++;
                    if (result.FailedPages > 5)
                    {
                        _logger.LogError("❌ Too many failed pages ({Failed}). Stopping sync.", result.FailedPages);
                        break;
                    }
                }
            }

            // Save remaining invoices
            if (batchInvoices.Count > 0)
            {
                await SaveInvoiceBatchAsync(batchInvoices);
                _logger.LogInformation("💾 Saved final batch of {Count} invoices", batchInvoices.Count);
            }

            return result;
        }

        /// <summary>
        /// Process a single invoice element from the API response
        /// </summary>
        private async Task<Invoice?> ProcessInvoiceElementAsync(JsonElement invoiceElement, HashSet<int> existingIds)
        {
            try
            {
                if (!invoiceElement.TryGetProperty("id", out var idElement) ||
                    !idElement.TryGetInt32(out var invoiceId))
                {
                    return null;
                }

                // Skip if already exists
                if (existingIds.Contains(invoiceId))
                {
                    return null;
                }

                var invoice = new Invoice
                {
                    Id = invoiceId,
                    InvoiceNumber = GetStringProperty(invoiceElement, "user_code") ?? GetStringProperty(invoiceElement, "invoice_number") ?? $"INV-{invoiceId}",
                    CustomerName = GetCustomerName(invoiceElement),
                    Currency = GetStringProperty(invoiceElement, "currency_iso_code") ?? GetStringProperty(invoiceElement, "currency") ?? "USD",
                    Description = GetStringProperty(invoiceElement, "public_note") ?? GetStringProperty(invoiceElement, "description"),
                    Status = GetStringProperty(invoiceElement, "status") ?? "Active",
                    SyncedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Parse total amount
                if (invoiceElement.TryGetProperty("total", out var totalElement))
                {
                    if (totalElement.ValueKind == JsonValueKind.String &&
                        decimal.TryParse(totalElement.GetString(), out var totalDecimal))
                    {
                        invoice.Total = totalDecimal;
                    }
                    else if (totalElement.ValueKind == JsonValueKind.Number)
                    {
                        invoice.Total = totalElement.GetDecimal();
                    }
                }

                // Parse invoice date - try multiple field possibilities based on API response patterns
                var invoiceDate = ParseDateProperty(invoiceElement, "date") ?? 
                                ParseDateProperty(invoiceElement, "invoice_date") ?? 
                                ParseDateProperty(invoiceElement, "created_at");
                
                // If we found a valid date, use it; otherwise use a reasonable default (not today's date)
                invoice.InvoiceDate = invoiceDate ?? new DateTime(2024, 1, 1); // Use Jan 1, 2024 as fallback instead of today
                invoice.CreatedAt = ParseDateProperty(invoiceElement, "created_at") ?? invoice.InvoiceDate;

                // Get employee ID and fetch salesperson name
                if (invoiceElement.TryGetProperty("employee_id", out var empElement) &&
                    empElement.TryGetInt32(out var employeeId) && employeeId > 0)
                {
                    invoice.EmployeeId = employeeId;
                    
                    // Try to get salesperson name from our employee cache/database
                    var employee = await _context.Employees.FindAsync(employeeId);
                    if (employee != null)
                    {
                        invoice.SalespersonName = employee.FullName;
                    }
                    else
                    {
                        // Fallback: fetch from OneUp API
                        try
                        {
                            invoice.SalespersonName = await _oneUpClient.GetEmployeeNameByIdAsync(employeeId);
                        }
                        catch
                        {
                            invoice.SalespersonName = "Unknown Salesperson";
                        }
                    }
                }
                else
                {
                    invoice.SalespersonName = "No Salesperson";
                }

                return invoice;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ Failed to process invoice element");
                return null;
            }
        }

        /// <summary>
        /// Save a batch of invoices to the database efficiently
        /// </summary>
        private async Task SaveInvoiceBatchAsync(List<Invoice> invoices)
        {
            if (invoices.Count == 0) return;

            try
            {
                _context.Invoices.AddRange(invoices);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to save invoice batch of {Count} records", invoices.Count);
                throw;
            }
        }

        /// <summary>
        /// Sync employees from OneUp API
        /// </summary>
        private async Task SyncEmployeesAsync()
        {
            try
            {
                _logger.LogInformation("👥 Syncing employees...");

                // For now, we'll rely on the employee cache in OneUpClient
                // In a full implementation, you might want to fetch all employees here
                await _oneUpClient.PreloadEmployeeCacheAsync();

                _logger.LogInformation("✅ Employee sync completed");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ Employee sync failed, but continuing with invoice sync");
            }
        }

        /// <summary>
        /// Get the latest sync status
        /// </summary>
        public async Task<SyncStatus> GetSyncStatusAsync()
        {
            var latestSync = await _context.SyncLogs
                .Where(s => s.SyncType == "invoices")
                .OrderByDescending(s => s.StartTime)
                .FirstOrDefaultAsync();

            var totalInvoices = await _context.Invoices.CountAsync();
            var totalEmployees = await _context.Employees.CountAsync();

            return new SyncStatus
            {
                IsRunning = latestSync?.Status == "running",
                LastSync = latestSync?.StartTime,
                LastSyncStatus = latestSync?.Status ?? "never",
                TotalInvoices = totalInvoices,
                TotalEmployees = totalEmployees,
                Duration = latestSync?.DurationSeconds,
                ErrorMessage = latestSync?.ErrorMessage
            };
        }

        // Helper methods
        private static string? GetStringProperty(JsonElement element, string propertyName)
        {
            return element.TryGetProperty(propertyName, out var prop) && prop.ValueKind == JsonValueKind.String
                ? prop.GetString()
                : null;
        }

        private static DateTime? ParseDateProperty(JsonElement element, string propertyName)
        {
            if (element.TryGetProperty(propertyName, out var prop) && prop.ValueKind == JsonValueKind.String)
            {
                var dateString = prop.GetString();
                if (DateTime.TryParse(dateString, out var date))
                {
                    return date;
                }
            }
            return null;
        }

        private static string GetCustomerName(JsonElement element)
        {
            // Try OneUp API structure first: customer.name
            if (element.TryGetProperty("customer", out var customer) && customer.ValueKind == JsonValueKind.Object)
            {
                if (customer.TryGetProperty("name", out var name) && name.ValueKind == JsonValueKind.String)
                {
                    var customerName = name.GetString();
                    if (!string.IsNullOrWhiteSpace(customerName))
                        return customerName;
                }
                
                // Try other possible customer fields within the customer object
                if (customer.TryGetProperty("company_name", out var companyName) && companyName.ValueKind == JsonValueKind.String)
                {
                    var company = companyName.GetString();
                    if (!string.IsNullOrWhiteSpace(company))
                        return company;
                }
            }
            
            // Try flat structure variations
            var flatFields = new[] { "customer_name", "client_name", "company_name", "name" };
            foreach (var field in flatFields)
            {
                if (element.TryGetProperty(field, out var prop) && prop.ValueKind == JsonValueKind.String)
                {
                    var value = prop.GetString();
                    if (!string.IsNullOrWhiteSpace(value))
                        return value;
                }
            }
            
            return "Unknown Customer";
        }
    }

    // Result classes
    public class SyncResult
    {
        public int TotalInvoices { get; set; }
        public int ProcessedInvoices { get; set; }
        public int ApiCalls { get; set; }
        public int FailedPages { get; set; }
    }

    public class SyncStatus
    {
        public bool IsRunning { get; set; }
        public DateTime? LastSync { get; set; }
        public string LastSyncStatus { get; set; } = "never";
        public int TotalInvoices { get; set; }
        public int TotalEmployees { get; set; }
        public int? Duration { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
