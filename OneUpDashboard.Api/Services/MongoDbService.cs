using MongoDB.Driver;
using MongoDB.Bson;
using OneUpDashboard.Api.Models.MongoDb;

namespace OneUpDashboard.Api.Services
{
    public class MongoDbService
    {
        private readonly IMongoDatabase _database;
        private readonly IMongoCollection<InvoiceDocument> _invoices;
        private readonly IMongoCollection<EmployeeDocument> _employees;
        private readonly IMongoCollection<SyncLogDocument> _syncLogs;

        public MongoDbService(IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("MongoDB") ?? "mongodb://localhost:27017";
            var databaseName = configuration["MongoDB:DatabaseName"] ?? "OneUpDashboard";
            
            var client = new MongoClient(connectionString);
            _database = client.GetDatabase(databaseName);
            
            _invoices = _database.GetCollection<InvoiceDocument>("invoices");
            _employees = _database.GetCollection<EmployeeDocument>("employees");
            _syncLogs = _database.GetCollection<SyncLogDocument>("syncLogs");
            
            // Create indexes for better performance
            CreateIndexes();
        }

        private void CreateIndexes()
        {
            // Invoice indexes
            _invoices.Indexes.CreateOne(
                new CreateIndexModel<InvoiceDocument>(
                    Builders<InvoiceDocument>.IndexKeys.Ascending(x => x.InvoiceDate)
                )
            );
            
            _invoices.Indexes.CreateOne(
                new CreateIndexModel<InvoiceDocument>(
                    Builders<InvoiceDocument>.IndexKeys.Ascending(x => x.CreatedAt)
                )
            );
            
            _invoices.Indexes.CreateOne(
                new CreateIndexModel<InvoiceDocument>(
                    Builders<InvoiceDocument>.IndexKeys.Ascending(x => x.Currency)
                )
            );
            
            _invoices.Indexes.CreateOne(
                new CreateIndexModel<InvoiceDocument>(
                    Builders<InvoiceDocument>.IndexKeys.Ascending(x => x.EmployeeId)
                )
            );

            // Employee indexes
            _employees.Indexes.CreateOne(
                new CreateIndexModel<EmployeeDocument>(
                    Builders<EmployeeDocument>.IndexKeys.Ascending(x => x.IsActive)
                )
            );

            // SyncLog indexes
            _syncLogs.Indexes.CreateOne(
                new CreateIndexModel<SyncLogDocument>(
                    Builders<SyncLogDocument>.IndexKeys.Descending(x => x.StartTime)
                )
            );
        }

        // Invoice operations
        public async Task<List<InvoiceDocument>> GetInvoicesAsync(int skip = 0, int limit = -1, string sortBy = "invoiceDate")
        {
            var sortDefinition = sortBy.ToLower() switch
            {
                "creationdate" or "created" or "createdat" => Builders<InvoiceDocument>.Sort.Descending(x => x.CreatedAt),
                _ => Builders<InvoiceDocument>.Sort.Descending(x => x.InvoiceDate)
            };

            var query = _invoices
                .Find(_ => true)
                .Sort(sortDefinition)
                .Skip(skip);

            // If limit is -1 or 0, return all invoices (no limit)
            if (limit > 0)
            {
                query = query.Limit(limit);
            }

            return await query.ToListAsync();
        }

        public async Task<InvoiceDocument?> GetInvoiceByIdAsync(int id)
        {
            return await _invoices.Find(x => x.Id == id).FirstOrDefaultAsync();
        }

        public async Task<List<InvoiceDocument>> GetInvoicesByDateRangeAsync(DateTime startDate, DateTime endDate, string sortBy = "invoiceDate")
        {
            var sortDefinition = sortBy.ToLower() switch
            {
                "creationdate" or "created" or "createdat" => Builders<InvoiceDocument>.Sort.Descending(x => x.CreatedAt),
                _ => Builders<InvoiceDocument>.Sort.Descending(x => x.InvoiceDate)
            };

            return await _invoices
                .Find(x => x.InvoiceDate >= startDate && x.InvoiceDate <= endDate)
                .Sort(sortDefinition)
                .ToListAsync();
        }

        public async Task<List<InvoiceDocument>> GetInvoicesByCurrencyAsync(string currency, string sortBy = "invoiceDate")
        {
            var sortDefinition = sortBy.ToLower() switch
            {
                "creationdate" or "created" or "createdat" => Builders<InvoiceDocument>.Sort.Descending(x => x.CreatedAt),
                _ => Builders<InvoiceDocument>.Sort.Descending(x => x.InvoiceDate)
            };

            return await _invoices
                .Find(x => x.Currency == currency)
                .Sort(sortDefinition)
                .ToListAsync();
        }

        public async Task<List<InvoiceDocument>> GetInvoicesByEmployeeAsync(int employeeId, string sortBy = "invoiceDate")
        {
            var sortDefinition = sortBy.ToLower() switch
            {
                "creationdate" or "created" or "createdat" => Builders<InvoiceDocument>.Sort.Descending(x => x.CreatedAt),
                _ => Builders<InvoiceDocument>.Sort.Descending(x => x.InvoiceDate)
            };

            return await _invoices
                .Find(x => x.EmployeeId == employeeId)
                .Sort(sortDefinition)
                .ToListAsync();
        }

        public async Task<long> GetInvoiceCountAsync()
        {
            return await _invoices.CountDocumentsAsync(_ => true);
        }

        public async Task InsertInvoiceAsync(InvoiceDocument invoice)
        {
            await _invoices.InsertOneAsync(invoice);
        }

        public async Task InsertInvoicesAsync(List<InvoiceDocument> invoices)
        {
            if (invoices.Any())
            {
                await _invoices.InsertManyAsync(invoices);
            }
        }

        public async Task<bool> InvoiceExistsAsync(int id)
        {
            return await _invoices.CountDocumentsAsync(x => x.Id == id) > 0;
        }

        // Employee operations
        public async Task<List<EmployeeDocument>> GetEmployeesAsync()
        {
            return await _employees.Find(_ => true).ToListAsync();
        }

        public async Task<EmployeeDocument?> GetEmployeeByIdAsync(int id)
        {
            return await _employees.Find(x => x.Id == id).FirstOrDefaultAsync();
        }

        public async Task<long> GetEmployeeCountAsync()
        {
            return await _employees.CountDocumentsAsync(_ => true);
        }

        public async Task InsertEmployeeAsync(EmployeeDocument employee)
        {
            await _employees.InsertOneAsync(employee);
        }

        public async Task InsertEmployeesAsync(List<EmployeeDocument> employees)
        {
            if (employees.Any())
            {
                await _employees.InsertManyAsync(employees);
            }
        }

        public async Task<bool> EmployeeExistsAsync(int id)
        {
            return await _employees.CountDocumentsAsync(x => x.Id == id) > 0;
        }

        // SyncLog operations
        public async Task<List<SyncLogDocument>> GetSyncLogsAsync(int limit = 10)
        {
            return await _syncLogs
                .Find(_ => true)
                .SortByDescending(x => x.StartTime)
                .Limit(limit)
                .ToListAsync();
        }

        public async Task<SyncLogDocument?> GetLatestSyncLogAsync()
        {
            return await _syncLogs
                .Find(_ => true)
                .SortByDescending(x => x.StartTime)
                .FirstOrDefaultAsync();
        }

        public async Task<SyncLogDocument?> GetSyncLogByIdAsync(string id)
        {
            return await _syncLogs.Find(x => x.Id == id).FirstOrDefaultAsync();
        }

        public async Task InsertSyncLogAsync(SyncLogDocument syncLog)
        {
            await _syncLogs.InsertOneAsync(syncLog);
        }

        public async Task UpdateSyncLogAsync(SyncLogDocument syncLog)
        {
            await _syncLogs.ReplaceOneAsync(x => x.Id == syncLog.Id, syncLog);
        }

        // Statistics operations
        public async Task<Dictionary<string, int>> GetCurrencyBreakdownAsync()
        {
            var pipeline = new[]
            {
                new BsonDocument("$group", new BsonDocument
                {
                    { "_id", "$currency" },
                    { "count", new BsonDocument("$sum", 1) }
                }),
                new BsonDocument("$sort", new BsonDocument("count", -1))
            };

            var result = await _invoices.Aggregate<BsonDocument>(pipeline).ToListAsync();
            
            return result.ToDictionary(
                x => x["_id"].AsString,
                x => x["count"].AsInt32
            );
        }

        public async Task<DateTime?> GetLatestInvoiceDateAsync()
        {
            var latest = await _invoices
                .Find(_ => true)
                .SortByDescending(x => x.InvoiceDate)
                .FirstOrDefaultAsync();
            
            return latest?.InvoiceDate;
        }

        public async Task<DateTime?> GetOldestInvoiceDateAsync()
        {
            var oldest = await _invoices
                .Find(_ => true)
                .SortBy(x => x.InvoiceDate)
                .FirstOrDefaultAsync();
            
            return oldest?.InvoiceDate;
        }

        public async Task<Dictionary<string, decimal>> GetTotalSalesByCurrencyAsync()
        {
            var pipeline = new[]
            {
                new BsonDocument("$match", new BsonDocument
                {
                    { "total", new BsonDocument("$ne", BsonNull.Value) },
                    { "currency", new BsonDocument("$ne", BsonNull.Value) }
                }),
                new BsonDocument("$group", new BsonDocument
                {
                    { "_id", "$currency" },
                    { "totalSales", new BsonDocument("$sum", "$total") }
                }),
                new BsonDocument("$sort", new BsonDocument("totalSales", -1))
            };

            var result = await _invoices.Aggregate<BsonDocument>(pipeline).ToListAsync();
            
            return result.ToDictionary(
                x => x["_id"].AsString,
                x => (decimal)x["totalSales"].ToDecimal()
            );
        }

        public async Task<decimal> GetTotalSalesAsync()
        {
            var pipeline = new[]
            {
                new BsonDocument("$match", new BsonDocument
                {
                    { "total", new BsonDocument("$ne", BsonNull.Value) }
                }),
                new BsonDocument("$group", new BsonDocument
                {
                    { "_id", (string)null },
                    { "totalSales", new BsonDocument("$sum", "$total") }
                })
            };

            var result = await _invoices.Aggregate<BsonDocument>(pipeline).FirstOrDefaultAsync();
            
            return result != null ? (decimal)result["totalSales"].ToDecimal() : 0m;
        }

        // Time-based sales aggregation methods
        public async Task<Dictionary<string, decimal>> GetSalesByCurrencyAndTimePeriodAsync(
            string timePeriod = "all", 
            DateTime? startDate = null, 
            DateTime? endDate = null)
        {
            var matchStage = new BsonDocument("$match", new BsonDocument());

            // Apply date filtering based on time period
            if (timePeriod != "all" && startDate.HasValue && endDate.HasValue)
            {
                matchStage = new BsonDocument("$match", new BsonDocument
                {
                    { "invoiceDate", new BsonDocument
                        {
                            { "$gte", startDate.Value },
                            { "$lte", endDate.Value }
                        }
                    }
                });
            }

            var pipeline = new[]
            {
                matchStage,
                new BsonDocument("$group", new BsonDocument
                {
                    { "_id", "$currency" },
                    { "totalSales", new BsonDocument("$sum", "$total") },
                    { "invoiceCount", new BsonDocument("$sum", 1) }
                }),
                new BsonDocument("$sort", new BsonDocument("totalSales", -1))
            };

            var result = await _invoices.Aggregate<BsonDocument>(pipeline).ToListAsync();
            
            return result.ToDictionary(
                x => x["_id"].AsString,
                x => (decimal)x["totalSales"].ToDecimal()
            );
        }

        public async Task<Dictionary<string, object>> GetDetailedSalesByCurrencyAndTimePeriodAsync(
            string timePeriod = "all", 
            DateTime? startDate = null, 
            DateTime? endDate = null)
        {
            var matchStage = new BsonDocument("$match", new BsonDocument());

            // Apply date filtering based on time period
            if (timePeriod != "all" && startDate.HasValue && endDate.HasValue)
            {
                matchStage = new BsonDocument("$match", new BsonDocument
                {
                    { "invoiceDate", new BsonDocument
                        {
                            { "$gte", startDate.Value },
                            { "$lte", endDate.Value }
                        }
                    }
                });
            }

            var pipeline = new[]
            {
                matchStage,
                new BsonDocument("$group", new BsonDocument
                {
                    { "_id", "$currency" },
                    { "totalSales", new BsonDocument("$sum", "$total") },
                    { "invoiceCount", new BsonDocument("$sum", 1) },
                    { "averageSale", new BsonDocument("$avg", "$total") },
                    { "minSale", new BsonDocument("$min", "$total") },
                    { "maxSale", new BsonDocument("$max", "$total") }
                }),
                new BsonDocument("$sort", new BsonDocument("totalSales", -1))
            };

            var result = await _invoices.Aggregate<BsonDocument>(pipeline).ToListAsync();
            
            return result.ToDictionary(
                x => x["_id"].AsString,
                x => new
                {
                    totalSales = (decimal)x["totalSales"].AsDouble,
                    invoiceCount = x["invoiceCount"].AsInt32,
                    averageSale = (decimal)x["averageSale"].AsDouble,
                    minSale = (decimal)x["minSale"].AsDouble,
                    maxSale = (decimal)x["maxSale"].AsDouble
                } as object
            );
        }

        public async Task<decimal> GetTotalSalesByTimePeriodAsync(
            string timePeriod = "all", 
            DateTime? startDate = null, 
            DateTime? endDate = null)
        {
            var matchStage = new BsonDocument("$match", new BsonDocument());

            // Apply date filtering based on time period
            if (timePeriod != "all" && startDate.HasValue && endDate.HasValue)
            {
                matchStage = new BsonDocument("$match", new BsonDocument
                {
                    { "invoiceDate", new BsonDocument
                        {
                            { "$gte", startDate.Value },
                            { "$lte", endDate.Value }
                        }
                    }
                });
            }

            var pipeline = new[]
            {
                matchStage,
                new BsonDocument("$group", new BsonDocument
                {
                    { "_id", (string)null },
                    { "totalSales", new BsonDocument("$sum", "$total") }
                })
            };

            var result = await _invoices.Aggregate<BsonDocument>(pipeline).FirstOrDefaultAsync();
            
            return result != null ? (decimal)result["totalSales"].ToDecimal() : 0m;
        }

        // Simple method to get all invoices and calculate totals manually
        public async Task<Dictionary<string, decimal>> GetAllInvoicesAndCalculateTotalsAsync()
        {
            try
            {
                // Get all invoices (this might be slow for large datasets, but good for debugging)
                var allInvoices = await _invoices.Find(_ => true).ToListAsync();
                
                var currencyTotals = new Dictionary<string, decimal>();
                
                foreach (var invoice in allInvoices)
                {
                    var currency = invoice.Currency ?? "Unknown";
                    if (!currencyTotals.ContainsKey(currency))
                    {
                        currencyTotals[currency] = 0;
                    }
                    currencyTotals[currency] += invoice.Total;
                }
                
                return currencyTotals;
            }
            catch (Exception ex)
            {
                // Log the exception and return empty dictionary
                Console.WriteLine($"Error in GetAllInvoicesAndCalculateTotalsAsync: {ex.Message}");
                return new Dictionary<string, decimal>();
            }
        }

        // Get detailed invoice statistics
        public async Task<object> GetDetailedInvoiceStatsAsync()
        {
            try
            {
                var allInvoices = await _invoices.Find(_ => true).ToListAsync();
                
                var stats = new
                {
                    totalInvoices = allInvoices.Count,
                    totalSales = allInvoices.Sum(x => x.Total),
                    currencyBreakdown = allInvoices.GroupBy(x => x.Currency ?? "Unknown")
                        .ToDictionary(
                            g => g.Key,
                            g => new
                            {
                                count = g.Count(),
                                totalSales = g.Sum(x => x.Total),
                                averageSale = g.Average(x => x.Total),
                                minSale = g.Min(x => x.Total),
                                maxSale = g.Max(x => x.Total)
                            }
                        ),
                    dateRange = allInvoices.Any() ? new
                    {
                        earliest = allInvoices.Min(x => x.InvoiceDate),
                        latest = allInvoices.Max(x => x.InvoiceDate)
                    } : null
                };
                
                return stats;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetDetailedInvoiceStatsAsync: {ex.Message}");
                return new
                {
                    totalInvoices = 0,
                    totalSales = 0m,
                    currencyBreakdown = new Dictionary<string, object>(),
                    error = ex.Message
                };
            }
        }
    }
}
