using Microsoft.EntityFrameworkCore;
using OneUpDashboard.Api.Data;
using OneUpDashboard.Api.Models;

namespace OneUpDashboard.Api.Services
{
    public class InvoiceService
    {
        private readonly DashboardDbContext _context;
        private readonly ILogger<InvoiceService> _logger;

        public InvoiceService(DashboardDbContext context, ILogger<InvoiceService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get invoices from database with dynamic sorting and fast pagination
        /// </summary>
        public async Task<object> GetInvoicesWithMetaAsync(int page = 1, int pageSize = 100, string? currency = null, string sortBy = "invoiceDate")
        {
            try
            {
                _logger.LogInformation("📊 Fetching invoices from database - Page {Page}, Size {PageSize}, Currency {Currency}, Sort {SortBy}", 
                    page, pageSize, currency, sortBy);

                var query = _context.Invoices.AsQueryable();

                // Apply currency filter if provided
                if (!string.IsNullOrEmpty(currency) && currency != "All")
                {
                    query = query.Where(i => i.Currency == currency);
                }

                // ✨ Dynamic date sorting based on user preference
                query = sortBy?.ToLower() switch
                {
                    "creationdate" or "created" => query.OrderByDescending(i => i.CreatedAt)
                                                       .ThenByDescending(i => i.Id),
                    "invoicedate" or "invoice" or _ => query.OrderByDescending(i => i.InvoiceDate)
                                                           .ThenByDescending(i => i.Id)
                };

                // Get total count for pagination info
                var totalCount = await query.CountAsync();

                // Apply pagination
                var invoices = await query
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
                            invoiceDate = i.InvoiceDate.ToString("yyyy-MM-dd"),
                            created_at = i.CreatedAt.ToString("yyyy-MM-dd"),
                            customer_name = i.CustomerName,
                            customerName = i.CustomerName,
                            total = i.Total.ToString("F2"),
                            currency = i.Currency,
                            currency_iso_code = i.Currency,
                            employee_id = i.EmployeeId,
                            description = i.Description,
                            status = i.Status
                        },
                        salespersonName = i.SalespersonName ?? "Unknown"
                    })
                    .ToListAsync();

                // Calculate pagination metadata
                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
                var hasMorePages = page < totalPages;

                var result = new
                {
                    page,
                    pageSize,
                    count = invoices.Count,
                    totalCount,
                    totalPages,
                    hasMorePages,
                    data = invoices,
                    source = "persistent_database", // ✨ Indicates data source
                    sortBy = sortBy,
                    note = $"Ultra-fast persistent database query sorted by {(sortBy?.ToLower() == "creationdate" || sortBy?.ToLower() == "created" ? "creation date" : "invoice date")}. No API calls needed!"
                };

                _logger.LogInformation("✅ Retrieved {Count} invoices from database (Total: {Total})", 
                    invoices.Count, totalCount);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Database query failed: {Message}", ex.Message);

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
                    error = "Database query failed. Please try again or check if sync is complete.",
                    source = "database",
                    note = "Failed to fetch from local database"
                };
            }
        }

        /// <summary>
        /// Get database statistics
        /// </summary>
        public async Task<object> GetDatabaseStatsAsync()
        {
            try
            {
                var totalInvoices = await _context.Invoices.CountAsync();
                var totalEmployees = await _context.Employees.CountAsync();
                
                var latestInvoice = await _context.Invoices
                    .OrderByDescending(i => i.InvoiceDate)
                    .FirstOrDefaultAsync();
                    
                var oldestInvoice = await _context.Invoices
                    .OrderBy(i => i.InvoiceDate)
                    .FirstOrDefaultAsync();

                var currencyStats = await _context.Invoices
                    .GroupBy(i => i.Currency)
                    .Select(g => new { Currency = g.Key, Count = g.Count() })
                    .ToListAsync();

                return new
                {
                    totalInvoices,
                    totalEmployees,
                    latestInvoiceDate = latestInvoice?.InvoiceDate.ToString("yyyy-MM-dd"),
                    oldestInvoiceDate = oldestInvoice?.InvoiceDate.ToString("yyyy-MM-dd"),
                    currencyBreakdown = currencyStats,
                    databaseSize = "~" + Math.Round(totalInvoices * 0.5, 1) + " MB estimated"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to get database stats: {Message}", ex.Message);
                return new { error = "Failed to retrieve database statistics" };
            }
        }

        /// <summary>
        /// Search invoices by customer name or invoice number
        /// </summary>
        public async Task<object> SearchInvoicesAsync(string searchTerm, int page = 1, int pageSize = 50)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(searchTerm))
                {
                    return await GetInvoicesWithMetaAsync(page, pageSize);
                }

                var query = _context.Invoices
                    .Where(i => i.CustomerName.Contains(searchTerm) || 
                               i.InvoiceNumber.Contains(searchTerm) ||
                               i.SalespersonName.Contains(searchTerm))
                    .OrderByDescending(i => i.InvoiceDate);

                var totalCount = await query.CountAsync();

                var results = await query
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
                    .ToListAsync();

                return new
                {
                    page,
                    pageSize,
                    searchTerm,
                    count = results.Count,
                    totalCount,
                    hasMorePages = page * pageSize < totalCount,
                    data = results,
                    source = "database_search"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Search failed: {Message}", ex.Message);
                return new { error = "Search failed", searchTerm };
            }
        }
    }
}