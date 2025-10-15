using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OneUpDashboard.Api.Services;
using OneUpDashboard.Api.Models.MongoDb;

namespace OneUpDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class InvoicesController : ControllerBase
    {
        private readonly MongoDbService _mongoDbService;
        private readonly ILogger<InvoicesController> _logger;

        public InvoicesController(MongoDbService mongoDbService, ILogger<InvoicesController> logger)
        {
            _mongoDbService = mongoDbService;
            _logger = logger;
        }

        // GET /api/invoices?page=1&pageSize=100&currency=USD&startDate=2024-01-01&endDate=2024-12-31&sortBy=invoiceDate
        [HttpGet]
        public async Task<IActionResult> GetInvoices(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100,
            [FromQuery] string? currency = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] int? employeeId = null,
            [FromQuery] string sortBy = "invoiceDate")
        {
            try
            {
                var skip = (page - 1) * pageSize;
                List<InvoiceDocument> invoices;
                long totalCount;

                if (startDate.HasValue && endDate.HasValue)
                {
                    invoices = await _mongoDbService.GetInvoicesByDateRangeAsync(startDate.Value, endDate.Value, sortBy);
                    totalCount = invoices.Count;
                    invoices = invoices.Skip(skip).Take(pageSize).ToList();
                }
                else if (!string.IsNullOrEmpty(currency))
                {
                    invoices = await _mongoDbService.GetInvoicesByCurrencyAsync(currency, sortBy);
                    totalCount = invoices.Count;
                    invoices = invoices.Skip(skip).Take(pageSize).ToList();
                }
                else if (employeeId.HasValue)
                {
                    invoices = await _mongoDbService.GetInvoicesByEmployeeAsync(employeeId.Value, sortBy);
                    totalCount = invoices.Count;
                    invoices = invoices.Skip(skip).Take(pageSize).ToList();
                }
                else
                {
                    invoices = await _mongoDbService.GetInvoicesAsync(skip, pageSize, sortBy);
                    totalCount = await _mongoDbService.GetInvoiceCountAsync();
                }

                var result = new
                {
                    data = invoices,
                    pagination = new
                    {
                        page = page,
                        pageSize = pageSize,
                        totalCount = totalCount,
                        totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                        hasNextPage = page * pageSize < totalCount,
                        hasPreviousPage = page > 1
                    }
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting invoices");
                return StatusCode(500, new { error = "Failed to get invoices", details = ex.Message });
            }
        }

        // GET /api/invoices/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetInvoice(int id)
        {
            try
            {
                var invoice = await _mongoDbService.GetInvoiceByIdAsync(id);
                if (invoice == null)
                {
                    return NotFound(new { error = "Invoice not found" });
                }

                return Ok(invoice);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting invoice {Id}", id);
                return StatusCode(500, new { error = "Failed to get invoice", details = ex.Message });
            }
        }

        // GET /api/invoices/stats
        [HttpGet("stats")]
        public async Task<IActionResult> GetInvoiceStats()
        {
            try
            {
                var totalCount = await _mongoDbService.GetInvoiceCountAsync();
                var latestDate = await _mongoDbService.GetLatestInvoiceDateAsync();
                var oldestDate = await _mongoDbService.GetOldestInvoiceDateAsync();
                var currencyBreakdown = await _mongoDbService.GetCurrencyBreakdownAsync();

                var stats = new
                {
                    totalInvoices = totalCount,
                    latestInvoiceDate = latestDate,
                    oldestInvoiceDate = oldestDate,
                    currencyBreakdown = currencyBreakdown
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting invoice stats");
                return StatusCode(500, new { error = "Failed to get invoice stats", details = ex.Message });
            }
        }

        // GET /api/invoices/sales-summary
        [HttpGet("sales-summary")]
        public async Task<IActionResult> GetSalesSummary()
        {
            try
            {
                var totalCount = await _mongoDbService.GetInvoiceCountAsync();
                var totalSalesByCurrency = await _mongoDbService.GetTotalSalesByCurrencyAsync();
                var totalSales = await _mongoDbService.GetTotalSalesAsync();
                
                // Calculate average sale
                var avgSale = totalCount > 0 ? totalSales / totalCount : 0;

                var summary = new
                {
                    totalInvoices = totalCount,
                    totalSales = totalSales,
                    averageSale = avgSale,
                    salesByCurrency = totalSalesByCurrency,
                    currencyBreakdown = totalSalesByCurrency.ToDictionary(
                        kvp => kvp.Key,
                        kvp => new
                        {
                            totalSales = kvp.Value,
                            percentage = totalSales > 0 ? (kvp.Value / totalSales) * 100 : 0
                        }
                    )
                };

                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sales summary");
                return StatusCode(500, new { error = "Failed to get sales summary", details = ex.Message });
            }
        }

        // GET /api/invoices/debug-data
        [HttpGet("debug-data")]
        public async Task<IActionResult> GetDebugData()
        {
            try
            {
                // Get sample invoices to check data structure
                var sampleInvoices = await _mongoDbService.GetInvoicesAsync(0, 5);
                var totalCount = await _mongoDbService.GetInvoiceCountAsync();
                
                // Get raw currency breakdown
                var currencyBreakdown = await _mongoDbService.GetCurrencyBreakdownAsync();
                var totalSalesByCurrency = await _mongoDbService.GetTotalSalesByCurrencyAsync();
                var totalSales = await _mongoDbService.GetTotalSalesAsync();

                var debugInfo = new
                {
                    totalInvoiceCount = totalCount,
                    sampleInvoices = sampleInvoices.Select(inv => new
                    {
                        id = inv.Id,
                        invoiceNumber = inv.InvoiceNumber,
                        total = inv.Total,
                        currency = inv.Currency,
                        invoiceDate = inv.InvoiceDate,
                        customerName = inv.CustomerName
                    }),
                    currencyBreakdown = currencyBreakdown,
                    totalSalesByCurrency = totalSalesByCurrency,
                    totalSales = totalSales,
                    hasData = totalCount > 0
                };

                return Ok(debugInfo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting debug data");
                return StatusCode(500, new { error = "Failed to get debug data", details = ex.Message });
            }
        }

        // GET /api/invoices/manual-currency-totals
        [HttpGet("manual-currency-totals")]
        public async Task<IActionResult> GetManualCurrencyTotals()
        {
            try
            {
                // Use manual calculation method
                var manualTotals = await _mongoDbService.GetAllInvoicesAndCalculateTotalsAsync();
                var detailedStats = await _mongoDbService.GetDetailedInvoiceStatsAsync();

                // Ensure all currencies (USD, PKR, AED) are represented
                var allCurrencies = new[] { "USD", "PKR", "AED" };
                var currencySales = allCurrencies.ToDictionary(
                    currency => currency,
                    currency => new
                    {
                        totalSales = manualTotals.GetValueOrDefault(currency, 0),
                        invoiceCount = 0, // Will be filled from detailed stats
                        averageSale = 0m, // Use decimal
                        percentage = manualTotals.Values.Sum() > 0 ? 
                            (manualTotals.GetValueOrDefault(currency, 0) / manualTotals.Values.Sum()) * 100 : 0
                    }
                );

                // Fill in detailed information from detailed stats
                try
                {
                    var stats = detailedStats as dynamic;
                    if (stats?.currencyBreakdown != null)
                    {
                        foreach (var currency in allCurrencies)
                        {
                            try
                            {
                                // Use safe dictionary access with ContainsKey check
                                if (stats.currencyBreakdown.ContainsKey(currency))
                                {
                                    var currencyData = stats.currencyBreakdown[currency];
                                    if (currencyData != null)
                                    {
                                        currencySales[currency] = new
                                        {
                                            totalSales = (decimal)currencyData.totalSales,
                                            invoiceCount = (int)currencyData.count,
                                            averageSale = (decimal)currencyData.averageSale,
                                            percentage = manualTotals.Values.Sum() > 0 ? 
                                                ((decimal)currencyData.totalSales / manualTotals.Values.Sum()) * 100 : 0
                                        };
                                    }
                                }
                                else
                                {
                                    // Currency doesn't exist in database, keep default values
                                    _logger.LogDebug($"Currency {currency} not found in database, using default values");
                                }
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning(ex, $"Error processing currency data for {currency}");
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error processing detailed stats");
                }

                var result = new
                {
                    timePeriod = "all",
                    totalSales = manualTotals.Values.Sum(),
                    currencySales = currencySales,
                    summary = new
                    {
                        usdTotal = manualTotals.GetValueOrDefault("USD", 0),
                        pkrTotal = manualTotals.GetValueOrDefault("PKR", 0),
                        aedTotal = manualTotals.GetValueOrDefault("AED", 0),
                        otherTotal = manualTotals.Where(kvp => !allCurrencies.Contains(kvp.Key))
                                               .Sum(kvp => kvp.Value)
                    },
                    detailedStats = detailedStats,
                    manualTotals = manualTotals
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting manual currency totals");
                return StatusCode(500, new { error = "Failed to get manual currency totals", details = ex.Message });
            }
        }

        // GET /api/invoices/currency-sales?timePeriod=month&startDate=2024-01-01&endDate=2024-01-31
        [HttpGet("currency-sales")]
        public async Task<IActionResult> GetCurrencySalesByTimePeriod(
            [FromQuery] string timePeriod = "all",
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                // Calculate date range based on time period if not provided
                if (timePeriod != "all" && !startDate.HasValue && !endDate.HasValue)
                {
                    var now = DateTime.UtcNow;
                    switch (timePeriod.ToLower())
                    {
                        case "today":
                            startDate = now.Date;
                            endDate = now.Date.AddDays(1).AddTicks(-1);
                            break;
                        case "week":
                            startDate = now.Date.AddDays(-(int)now.DayOfWeek);
                            endDate = startDate.Value.AddDays(7).AddTicks(-1);
                            break;
                        case "month":
                            startDate = new DateTime(now.Year, now.Month, 1);
                            endDate = startDate.Value.AddMonths(1).AddTicks(-1);
                            break;
                        case "quarter":
                            var quarter = (now.Month - 1) / 3 + 1;
                            startDate = new DateTime(now.Year, (quarter - 1) * 3 + 1, 1);
                            endDate = startDate.Value.AddMonths(3).AddTicks(-1);
                            break;
                        case "year":
                            startDate = new DateTime(now.Year, 1, 1);
                            endDate = startDate.Value.AddYears(1).AddTicks(-1);
                            break;
                    }
                }

                var salesByCurrency = await _mongoDbService.GetSalesByCurrencyAndTimePeriodAsync(timePeriod, startDate, endDate);
                var detailedSales = await _mongoDbService.GetDetailedSalesByCurrencyAndTimePeriodAsync(timePeriod, startDate, endDate);
                var totalSales = await _mongoDbService.GetTotalSalesByTimePeriodAsync(timePeriod, startDate, endDate);

                // Ensure all currencies (USD, PKR, AED) are represented
                var allCurrencies = new[] { "USD", "PKR", "AED" };
                var currencySales = allCurrencies.ToDictionary(
                    currency => currency,
                    currency => new
                    {
                        totalSales = salesByCurrency.GetValueOrDefault(currency, 0),
                        invoiceCount = detailedSales.ContainsKey(currency) ? 
                            ((dynamic)detailedSales[currency]).invoiceCount : 0,
                        averageSale = detailedSales.ContainsKey(currency) ? 
                            ((dynamic)detailedSales[currency]).averageSale : 0,
                        minSale = detailedSales.ContainsKey(currency) ? 
                            ((dynamic)detailedSales[currency]).minSale : 0,
                        maxSale = detailedSales.ContainsKey(currency) ? 
                            ((dynamic)detailedSales[currency]).maxSale : 0,
                        percentage = totalSales > 0 ? 
                            (salesByCurrency.GetValueOrDefault(currency, 0) / totalSales) * 100 : 0
                    }
                );

                var result = new
                {
                    timePeriod = timePeriod,
                    startDate = startDate,
                    endDate = endDate,
                    totalSales = totalSales,
                    currencySales = currencySales,
                    summary = new
                    {
                        usdTotal = salesByCurrency.GetValueOrDefault("USD", 0),
                        pkrTotal = salesByCurrency.GetValueOrDefault("PKR", 0),
                        aedTotal = salesByCurrency.GetValueOrDefault("AED", 0),
                        otherTotal = salesByCurrency.Where(kvp => !allCurrencies.Contains(kvp.Key))
                                                   .Sum(kvp => kvp.Value)
                    }
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting currency sales by time period");
                return StatusCode(500, new { error = "Failed to get currency sales", details = ex.Message });
            }
        }
    }
}