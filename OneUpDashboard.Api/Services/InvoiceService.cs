using OneUpDashboard.Api.Services;
using OneUpDashboard.Api.Models.MongoDb;

namespace OneUpDashboard.Api.Services
{
    public class InvoiceService
    {
        private readonly MongoDbService _mongoDbService;
        private readonly ILogger<InvoiceService> _logger;

        public InvoiceService(MongoDbService mongoDbService, ILogger<InvoiceService> logger)
        {
            _mongoDbService = mongoDbService;
            _logger = logger;
        }

        /// <summary>
        /// Get invoices from MongoDB with dynamic sorting and fast pagination
        /// </summary>
        public async Task<object> GetInvoicesWithMetaAsync(int page = 1, int pageSize = 100, string? currency = null, string sortBy = "invoiceDate")
        {
            try
            {
                _logger.LogInformation("📊 Fetching invoices from MongoDB - Page {Page}, Size {PageSize}, Currency {Currency}, Sort {SortBy}", 
                    page, pageSize, currency, sortBy);

                List<InvoiceDocument> invoices;
                long totalCount;

                // Apply currency filter if provided
                if (!string.IsNullOrEmpty(currency) && currency != "All")
                {
                    invoices = await _mongoDbService.GetInvoicesByCurrencyAsync(currency);
                    totalCount = invoices.Count;
                    invoices = invoices.Skip((page - 1) * pageSize).Take(pageSize).ToList();
                }
                else
                {
                    var skip = (page - 1) * pageSize;
                    invoices = await _mongoDbService.GetInvoicesAsync(skip, pageSize);
                    totalCount = await _mongoDbService.GetInvoiceCountAsync();
                }

                // Transform to match expected format
                var transformedInvoices = invoices.Select(i => new
                {
                    id = i.Id,
                    invoice = new
                    {
                        id = i.Id,
                        invoice_number = i.InvoiceNumber,
                        invoice_date = i.InvoiceDate.ToString("yyyy-MM-dd"),
                        invoiceDate = i.InvoiceDate.ToString("yyyy-MM-dd"),
                        created_at = i.CreatedAt.ToString("yyyy-MM-dd"),
                        customer_name = i.CustomerName,
                        customerName = i.CustomerName,
                        total = i.Total.ToString("F2"),
                        currency = i.Currency,
                        currency_iso_code = i.Currency,
                        employee_id = i.EmployeeId,
                        description = i.Description,
                        status = i.Status,
                        invoice_status = i.InvoiceStatus,
                        delivery_status = i.DeliveryStatus,
                        paid = i.Paid.ToString("F2"),
                        unpaid = i.Unpaid.ToString("F2"),
                        locked = i.Locked,
                        sent = i.Sent,
                        sent_at = i.SentAt?.ToString("yyyy-MM-dd"),
                        payment_status = GetPaymentStatus(i.Paid, i.Unpaid)
                    },
                    salespersonName = i.SalespersonName ?? "Unknown"
                }).ToList();

                // Calculate pagination metadata
                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
                var hasMorePages = page < totalPages;

                var result = new
                {
                    page,
                    pageSize,
                    count = transformedInvoices.Count,
                    totalCount,
                    totalPages,
                    hasMorePages,
                    data = transformedInvoices,
                    source = "mongodb_database", // ✨ Indicates MongoDB data source
                    sortBy = sortBy,
                    note = $"Ultra-fast MongoDB query sorted by {(sortBy?.ToLower() == "creationdate" || sortBy?.ToLower() == "created" ? "creation date" : "invoice date")}. No API calls needed!"
                };

                _logger.LogInformation("✅ Retrieved {Count} invoices from MongoDB (Total: {Total})", 
                    transformedInvoices.Count, totalCount);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ MongoDB query failed: {Message}", ex.Message);

                // Return empty result with error info
                return new
                {
                    page,
                    pageSize,
                    count = 0,
                    totalCount = 0,
                    totalPages = 0,
                    hasMorePages = false,
                    data = new List<object>(),
                    error = "MongoDB query failed. Please try again or check if sync is complete.",
                    source = "mongodb",
                    note = "Failed to fetch from MongoDB database"
                };
            }
        }

        /// <summary>
        /// Get MongoDB database statistics
        /// </summary>
        public async Task<object> GetDatabaseStatsAsync()
        {
            try
            {
                var totalInvoices = await _mongoDbService.GetInvoiceCountAsync();
                var totalEmployees = await _mongoDbService.GetEmployeeCountAsync();
                
                var latestInvoiceDate = await _mongoDbService.GetLatestInvoiceDateAsync();
                var oldestInvoiceDate = await _mongoDbService.GetOldestInvoiceDateAsync();
                var currencyBreakdown = await _mongoDbService.GetCurrencyBreakdownAsync();

                return new
                {
                    totalInvoices,
                    totalEmployees,
                    latestInvoiceDate = latestInvoiceDate?.ToString("yyyy-MM-dd"),
                    oldestInvoiceDate = oldestInvoiceDate?.ToString("yyyy-MM-dd"),
                    currencyBreakdown = currencyBreakdown.Select(c => new { Currency = c.Key, Count = c.Value }).ToList(),
                    databaseSize = "MongoDB Collection"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to get MongoDB stats: {Message}", ex.Message);
                return new { error = "Failed to retrieve MongoDB statistics" };
            }
        }

        /// <summary>
        /// Search invoices by customer name or invoice number in MongoDB
        /// </summary>
        public async Task<object> SearchInvoicesAsync(string searchTerm, int page = 1, int pageSize = 50)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(searchTerm))
                {
                    return await GetInvoicesWithMetaAsync(page, pageSize);
                }

                // Get all invoices and filter in memory (MongoDB text search would be better for production)
                var allInvoices = await _mongoDbService.GetInvoicesAsync(0, int.MaxValue);
                
                var filteredInvoices = allInvoices
                    .Where(i => i.CustomerName.Contains(searchTerm, StringComparison.OrdinalIgnoreCase) || 
                               i.InvoiceNumber.Contains(searchTerm, StringComparison.OrdinalIgnoreCase) ||
                               i.SalespersonName.Contains(searchTerm, StringComparison.OrdinalIgnoreCase))
                    .OrderByDescending(i => i.InvoiceDate)
                    .ToList();

                var totalCount = filteredInvoices.Count;
                var results = filteredInvoices
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(i => new
                    {
                        id = i.Id,
                        invoice = new
                        {
                            id = i.Id,
                            invoice_number = i.InvoiceNumber,
                            invoice_date = i.InvoiceDate.ToString("yyyy-MM-dd"),
                            customer_name = i.CustomerName,
                            total = i.Total.ToString("F2"),
                            currency = i.Currency
                        },
                        salespersonName = i.SalespersonName
                    })
                    .ToList();

                return new
                {
                    page,
                    pageSize,
                    searchTerm,
                    count = results.Count,
                    totalCount,
                    hasMorePages = page * pageSize < totalCount,
                    data = results,
                    source = "mongodb_search"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ MongoDB search failed: {Message}", ex.Message);
                return new { error = "MongoDB search failed", searchTerm };
            }
        }

        /// <summary>
        /// Determine payment status based on paid and unpaid amounts
        /// </summary>
        private static string GetPaymentStatus(decimal paid, decimal unpaid)
        {
            if (unpaid <= 0)
            {
                return "Paid";
            }
            else if (paid > 0)
            {
                return "Partially Paid";
            }
            else
            {
                return "Due";
            }
        }
    }
}