using System.Text.Json;

namespace OneUpDashboard.Api.Services
{
    public class SalespersonService
    {
        private readonly OneUpClient _client;

        public SalespersonService(OneUpClient client)
        {
            _client = client;
        }

        public async Task<object> GetSalespersonsWithSalesAsync(string period = "all", int year = 0, int month = 0, int quarter = 0)
        {
            // Get all invoices (we'll need to paginate through all pages for accurate totals)
            var allInvoices = new List<Dictionary<string, object?>>();
            int page = 1;
            int pageSize = 200;
            bool hasMoreData = true;

            while (hasMoreData)
            {
                var raw = await _client.GetInvoicesPageAsync(page, pageSize);
                
                try
                {
                    var parsed = JsonSerializer.Deserialize<JsonElement>(raw);
                    if (parsed.ValueKind == JsonValueKind.Array)
                    {
                        var pageInvoices = new List<Dictionary<string, object?>>();
                        
                        foreach (var item in parsed.EnumerateArray())
                        {
                            // Extract employee_id and fetch salesperson name
                            int? employeeId = null;
                            if (item.TryGetProperty("employee_id", out var empProp) && empProp.ValueKind == JsonValueKind.Number)
                            {
                                employeeId = empProp.GetInt32();
                            }

                            string salespersonName = "Unknown";
                            if (employeeId.HasValue)
                            {
                                salespersonName = await _client.GetEmployeeNameByIdAsync(employeeId.Value);
                            }

                            // Extract invoice date and total
                            DateTime? invoiceDate = null;
                            if (item.TryGetProperty("invoice_date", out var dateProp) && 
                                DateTime.TryParse(dateProp.GetString(), out var date))
                            {
                                invoiceDate = date;
                            }
                            else if (item.TryGetProperty("created_at", out var createdProp) && 
                                DateTime.TryParse(createdProp.GetString(), out var createdDate))
                            {
                                invoiceDate = createdDate;
                            }

                            // Extract total amount
                            decimal total = 0;
                            if (item.TryGetProperty("total", out var totalProp))
                            {
                                if (totalProp.ValueKind == JsonValueKind.Number)
                                    total = totalProp.GetDecimal();
                                else if (totalProp.ValueKind == JsonValueKind.String && 
                                        decimal.TryParse(totalProp.GetString(), out var parsedTotal))
                                    total = parsedTotal;
                            }

                            // Extract currency
                            string currency = "USD";
                            if (item.TryGetProperty("currency_iso_code", out var currProp))
                                currency = currProp.GetString() ?? "USD";

                            // Only add invoice if it has meaningful data
                            if (total > 0 && salespersonName != "Unknown")
                            {
                                var enrichedInvoice = new Dictionary<string, object?>
                                {
                                    ["salespersonName"] = salespersonName,
                                    ["employeeId"] = employeeId,
                                    ["invoiceDate"] = invoiceDate,
                                    ["total"] = total,
                                    ["currency"] = currency
                                };

                                pageInvoices.Add(enrichedInvoice);
                            }
                        }

                        allInvoices.AddRange(pageInvoices);
                        
                        // Check if we have more data
                        hasMoreData = pageInvoices.Count == pageSize;
                        page++;
                    }
                    else
                    {
                        hasMoreData = false;
                    }
                }
                catch
                {
                    hasMoreData = false;
                }
            }

            // Filter by time period
            var filteredInvoices = FilterInvoicesByPeriod(allInvoices, period, year, month, quarter);

            // Group by salesperson and calculate totals
            var salespersonSales = filteredInvoices
                .Where(inv => inv["salespersonName"]?.ToString() != "Unknown")
                .GroupBy(inv => new { 
                    Name = inv["salespersonName"]?.ToString(),
                    EmployeeId = inv["employeeId"]
                })
                .Select(group => new
                {
                    salespersonName = group.Key.Name,
                    employeeId = group.Key.EmployeeId,
                    totalSales = group.Sum(inv => Convert.ToDecimal(inv["total"] ?? 0)),
                    invoiceCount = group.Count(),
                    currencies = group.GroupBy(inv => inv["currency"]?.ToString() ?? "USD")
                                     .Select(currGroup => new
                                     {
                                         currency = currGroup.Key,
                                         total = currGroup.Sum(inv => Convert.ToDecimal(inv["total"] ?? 0)),
                                         count = currGroup.Count()
                                     })
                                     .ToList()
                })
                .OrderByDescending(sp => sp.totalSales)
                .ToList();

            return new
            {
                period,
                year,
                month,
                quarter,
                totalSalespersons = salespersonSales.Count,
                data = salespersonSales
            };
        }

        private List<Dictionary<string, object?>> FilterInvoicesByPeriod(
            List<Dictionary<string, object?>> invoices, 
            string period, 
            int year, 
            int month, 
            int quarter)
        {
            if (period == "all")
                return invoices;

            var currentDate = DateTime.Now;
            var targetYear = year > 0 ? year : currentDate.Year;

            return invoices.Where(inv =>
            {
                var invoiceDate = inv["invoiceDate"] as DateTime?;
                if (!invoiceDate.HasValue) return false;

                return period switch
                {
                    "daily" => invoiceDate.Value.Date == currentDate.Date,
                    "monthly" => invoiceDate.Value.Year == targetYear && 
                                invoiceDate.Value.Month == (month > 0 ? month : currentDate.Month),
                    "quarterly" => invoiceDate.Value.Year == targetYear && 
                                  GetQuarter(invoiceDate.Value.Month) == (quarter > 0 ? quarter : GetQuarter(currentDate.Month)),
                    "yearly" => invoiceDate.Value.Year == targetYear,
                    _ => true
                };
            }).ToList();
        }

        private int GetQuarter(int month)
        {
            return (month - 1) / 3 + 1;
        }
    }
}
