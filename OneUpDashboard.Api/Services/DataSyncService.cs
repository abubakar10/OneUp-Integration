using OneUpDashboard.Api.Models.MongoDb;
using System.Text.Json;

namespace OneUpDashboard.Api.Services
{
    public class DataSyncService
    {
        private readonly MongoDbService _mongoDbService;
        private readonly OneUpClient _oneUpClient;
        private readonly ILogger<DataSyncService> _logger;

        public DataSyncService(
            MongoDbService mongoDbService,
            OneUpClient oneUpClient,
            ILogger<DataSyncService> logger)
        {
            _mongoDbService = mongoDbService;
            _oneUpClient = oneUpClient;
            _logger = logger;
        }

        /// <summary>
        /// Performs a complete sync of all invoices from OneUp API
        /// This is the main method that implements the smart pagination loop
        /// </summary>
        public async Task<SyncResult> SyncAllInvoicesAsync()
        {
            var syncLog = new SyncLogDocument
            {
                SyncType = "invoices",
                StartTime = DateTime.UtcNow,
                Status = "running"
            };

            await _mongoDbService.InsertSyncLogAsync(syncLog);

            try
            {
                _logger.LogInformation("🔄 Starting full sync of OneUp invoices...");

                // Step 1: Sync employees first (for salesperson names) - Temporarily disabled
                // await SyncEmployeesAsync();

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

                await _mongoDbService.UpdateSyncLogAsync(syncLog);

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

                await _mongoDbService.UpdateSyncLogAsync(syncLog);

                throw;
            }
        }

        /// <summary>
        /// Smart pagination loop - fetches ALL invoices respecting OneUp API's 100-record limit
        /// Also deletes invoices that no longer exist in ERP
        /// </summary>
        private async Task<SyncResult> SyncInvoicesWithPaginationAsync(SyncLogDocument syncLog)
        {
            var result = new SyncResult();
            var batchInvoices = new List<InvoiceDocument>();
            const int batchSize = 500; // Save to DB every 500 invoices (5 API calls)

            int page = 1;
            bool hasMoreData = true;

            // Get existing invoices for comparison and updates
            var existingInvoices = await _mongoDbService.GetInvoicesAsync(0, int.MaxValue);
            var existingInvoiceIds = new HashSet<int>();
            foreach (var invoice in existingInvoices)
            {
                existingInvoiceIds.Add(invoice.Id);
            }

            // Track which invoices are found in ERP during this sync
            var foundInvoiceIds = new HashSet<int>();

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
                        var invoice = await ProcessInvoiceElementAsync(invoiceElement, existingInvoices);
                        if (invoice != null)
                        {
                            batchInvoices.Add(invoice);
                            result.ProcessedInvoices++;
                            
                            // Track this invoice as found in ERP
                            foundInvoiceIds.Add(invoice.Id);
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
                    await _mongoDbService.UpdateSyncLogAsync(syncLog);

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

            // Delete invoices that no longer exist in ERP
            await DeleteMissingInvoicesAsync(existingInvoiceIds, foundInvoiceIds, syncLog);

            return result;
        }

        /// <summary>
        /// Process a single invoice element from the API response
        /// </summary>
        private async Task<InvoiceDocument?> ProcessInvoiceElementAsync(JsonElement invoiceElement, List<InvoiceDocument> existingInvoices)
        {
            try
            {
                if (!invoiceElement.TryGetProperty("id", out var idElement) ||
                    !idElement.TryGetInt32(out var invoiceId))
                {
                    return null;
                }

                // Check if invoice already exists and get it for comparison
                var existingInvoice = existingInvoices.FirstOrDefault(x => x.Id == invoiceId);
                var isUpdate = existingInvoice != null;

                var invoice = new InvoiceDocument
                {
                    Id = invoiceId,
                    InvoiceNumber = GetStringProperty(invoiceElement, "user_code") ?? GetStringProperty(invoiceElement, "invoice_number") ?? $"INV-{invoiceId}",
                    CustomerName = GetCustomerName(invoiceElement),
                    Currency = GetStringProperty(invoiceElement, "currency_iso_code") ?? GetStringProperty(invoiceElement, "currency") ?? "USD",
                    Description = GetStringProperty(invoiceElement, "public_note") ?? GetStringProperty(invoiceElement, "description"),
                    Status = GetInvoiceStatusString(invoiceElement),
                    InvoiceStatus = GetIntProperty(invoiceElement, "invoice_status"),
                    DeliveryStatus = GetIntProperty(invoiceElement, "delivery_status"),
                    Locked = GetBoolProperty(invoiceElement, "locked"),
                    Sent = GetBoolProperty(invoiceElement, "sent"),
                    SentAt = ParseDateProperty(invoiceElement, "sent_at"),
                    SyncedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // If this is an update, preserve the original CreatedAt date
                if (isUpdate && existingInvoice != null)
                {
                    invoice.CreatedAt = existingInvoice.CreatedAt;
                }

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

                // Parse paid amount
                if (invoiceElement.TryGetProperty("paid", out var paidElement))
                {
                    if (paidElement.ValueKind == JsonValueKind.String &&
                        decimal.TryParse(paidElement.GetString(), out var paidDecimal))
                    {
                        invoice.Paid = paidDecimal;
                    }
                    else if (paidElement.ValueKind == JsonValueKind.Number)
                    {
                        invoice.Paid = paidElement.GetDecimal();
                    }
                }

                // Parse unpaid amount
                if (invoiceElement.TryGetProperty("unpaid", out var unpaidElement))
                {
                    if (unpaidElement.ValueKind == JsonValueKind.String &&
                        decimal.TryParse(unpaidElement.GetString(), out var unpaidDecimal))
                    {
                        invoice.Unpaid = unpaidDecimal;
                    }
                    else if (unpaidElement.ValueKind == JsonValueKind.Number)
                    {
                        invoice.Unpaid = unpaidElement.GetDecimal();
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
                    var employee = await _mongoDbService.GetEmployeeByIdAsync(employeeId);
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
        /// Save a batch of invoices to the database efficiently (upsert - insert or update)
        /// </summary>
        private async Task SaveInvoiceBatchAsync(List<InvoiceDocument> invoices)
        {
            if (invoices.Count == 0) return;

            try
            {
                await _mongoDbService.UpsertInvoicesAsync(invoices);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to save invoice batch of {Count} records", invoices.Count);
                throw;
            }
        }

        /// <summary>
        /// Delete invoices that exist in database but were not found in ERP (deleted from ERP)
        /// </summary>
        private async Task DeleteMissingInvoicesAsync(HashSet<int> existingInvoiceIds, HashSet<int> foundInvoiceIds, SyncLogDocument syncLog)
        {
            try
            {
                // Find invoices that exist in DB but were not found in ERP
                var invoicesToDelete = existingInvoiceIds.Except(foundInvoiceIds).ToList();
                
                if (invoicesToDelete.Count > 0)
                {
                    _logger.LogInformation("🗑️ Found {Count} invoices to delete (not found in ERP)", invoicesToDelete.Count);
                    
                    // Delete invoices in batches to avoid overwhelming the database
                    const int deleteBatchSize = 100;
                    var deletedCount = 0;
                    
                    for (int i = 0; i < invoicesToDelete.Count; i += deleteBatchSize)
                    {
                        var batch = invoicesToDelete.Skip(i).Take(deleteBatchSize).ToList();
                        await _mongoDbService.DeleteInvoicesByIdsAsync(batch);
                        deletedCount += batch.Count;
                        
                        _logger.LogInformation("🗑️ Deleted batch of {Count} invoices. Total deleted: {Total}", batch.Count, deletedCount);
                        
                        // Update sync log with deletion progress
                        syncLog.Notes = $"Synced {foundInvoiceIds.Count} invoices, deleted {deletedCount} missing invoices";
                        await _mongoDbService.UpdateSyncLogAsync(syncLog);
                    }
                    
                    _logger.LogInformation("✅ Successfully deleted {Count} invoices that no longer exist in ERP", deletedCount);
                }
                else
                {
                    _logger.LogInformation("✅ No invoices to delete - all existing invoices found in ERP");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to delete missing invoices: {Message}", ex.Message);
                // Don't throw - we don't want deletion failures to break the entire sync
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

                // Get all employees from OneUp API
                var allEmployees = new List<EmployeeDocument>();
                int page = 1;
                bool hasMoreData = true;

                while (hasMoreData)
                {
                    try
                    {
                        _logger.LogInformation("📥 Fetching employees page {Page}...", page);

                        // Fetch employees from OneUp API (assuming they have an employees endpoint)
                        var apiResponse = await _oneUpClient.GetEmployeesPageAsync(page, 100);
                        var jsonData = JsonSerializer.Deserialize<JsonElement>(apiResponse);

                        if (jsonData.ValueKind != JsonValueKind.Array)
                        {
                            _logger.LogWarning("⚠️ Unexpected employee API response format on page {Page}", page);
                            break;
                        }

                        var pageEmployees = jsonData.EnumerateArray().ToList();
                        
                        // Check if this is the last page
                        if (pageEmployees.Count < 100)
                        {
                            hasMoreData = false;
                            _logger.LogInformation("📄 Last employee page reached. Found {Count} employees on page {Page}", pageEmployees.Count, page);
                        }

                        if (pageEmployees.Count == 0)
                        {
                            _logger.LogInformation("📄 No more employees found. Stopping at page {Page}", page);
                            break;
                        }

                        // Process each employee in this page
                        foreach (var employeeElement in pageEmployees)
                        {
                            var employee = ProcessEmployeeElement(employeeElement);
                            if (employee != null)
                            {
                                allEmployees.Add(employee);
                            }
                        }

                        // Be nice to the API - small delay between requests
                        await Task.Delay(500);
                        page++;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "❌ Error processing employee page {Page}: {Message}", page, ex.Message);
                        page++;
                        if (page > 10) // Safety limit
                        {
                            _logger.LogError("❌ Too many failed employee pages. Stopping.");
                            break;
                        }
                    }
                }

                // Save all employees to MongoDB
                if (allEmployees.Count > 0)
                {
                    await _mongoDbService.InsertEmployeesAsync(allEmployees);
                    _logger.LogInformation("✅ Employee sync completed. Saved {Count} employees", allEmployees.Count);
                }
                else
                {
                    _logger.LogWarning("⚠️ No employees found to sync");
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ Employee sync failed, but continuing with invoice sync");
            }
        }

        /// <summary>
        /// Process a single employee element from the API response
        /// </summary>
        private static EmployeeDocument? ProcessEmployeeElement(JsonElement employeeElement)
        {
            try
            {
                if (!employeeElement.TryGetProperty("id", out var idElement) ||
                    !idElement.TryGetInt32(out var employeeId))
                {
                    return null;
                }

                var employee = new EmployeeDocument
                {
                    Id = employeeId,
                    FirstName = GetStringProperty(employeeElement, "first_name") ?? GetStringProperty(employeeElement, "firstName") ?? "Unknown",
                    LastName = GetStringProperty(employeeElement, "last_name") ?? GetStringProperty(employeeElement, "lastName") ?? "Employee",
                    Email = GetStringProperty(employeeElement, "email"),
                    Phone = GetStringProperty(employeeElement, "phone"),
                    Department = GetStringProperty(employeeElement, "department"),
                    Position = GetStringProperty(employeeElement, "position"),
                    IsActive = GetStringProperty(employeeElement, "status")?.ToLower() != "inactive",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                return employee;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Failed to process employee element: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Get the latest sync status
        /// </summary>
        public async Task<SyncStatus> GetSyncStatusAsync()
        {
            var latestSync = await _mongoDbService.GetLatestSyncLogAsync();
            var totalInvoices = await _mongoDbService.GetInvoiceCountAsync();
            var totalEmployees = await _mongoDbService.GetEmployeeCountAsync();

            return new SyncStatus
            {
                IsRunning = latestSync?.Status == "running",
                LastSync = latestSync?.StartTime,
                LastSyncStatus = latestSync?.Status ?? "never",
                TotalInvoices = (int)totalInvoices,
                TotalEmployees = (int)totalEmployees,
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

        private static int? GetIntProperty(JsonElement element, string propertyName)
        {
            if (element.TryGetProperty(propertyName, out var prop))
            {
                if (prop.ValueKind == JsonValueKind.Number)
                {
                    return prop.GetInt32();
                }
                else if (prop.ValueKind == JsonValueKind.String && int.TryParse(prop.GetString(), out var intValue))
                {
                    return intValue;
                }
            }
            return null;
        }

        private static bool GetBoolProperty(JsonElement element, string propertyName)
        {
            if (element.TryGetProperty(propertyName, out var prop))
            {
                if (prop.ValueKind == JsonValueKind.True)
                {
                    return true;
                }
                else if (prop.ValueKind == JsonValueKind.False)
                {
                    return false;
                }
                else if (prop.ValueKind == JsonValueKind.String && bool.TryParse(prop.GetString(), out var boolValue))
                {
                    return boolValue;
                }
            }
            return false;
        }

        private static string GetInvoiceStatusString(JsonElement element)
        {
            // Get invoice_status first
            var invoiceStatus = GetIntProperty(element, "invoice_status");
            
            if (invoiceStatus.HasValue)
            {
                return invoiceStatus.Value switch
                {
                    2 => "Invoiced",
                    3 => "Cancelled",
                    _ => "Unknown"
                };
            }

            // Fallback to old status field if available
            var status = GetStringProperty(element, "status");
            if (!string.IsNullOrWhiteSpace(status))
            {
                return status;
            }

            // Default fallback
            return "Active";
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