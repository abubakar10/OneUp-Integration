using MongoDB.Driver;
using MongoDB.Bson;
using OneUpDashboard.Api.Models.MongoDb;

namespace OneUpDashboard.Api.Services
{
    public class MongoDbService
    {
        private readonly IMongoDatabase? _database;
        private readonly IMongoCollection<InvoiceDocument>? _invoices;
        private readonly IMongoCollection<EmployeeDocument>? _employees;
        private readonly IMongoCollection<SyncLogDocument>? _syncLogs;

        public MongoDbService(IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("MongoDB")
                ?? configuration["ConnectionStrings:MongoDB"]
                ?? configuration["MongoDB"]
                ?? "mongodb://localhost:27017";
            var databaseName = configuration["MongoDB:DatabaseName"] ?? "OneUpDashboard";
            
            try
            {
                var client = new MongoClient(connectionString);
                _database = client.GetDatabase(databaseName);
                
                _invoices = _database.GetCollection<InvoiceDocument>("invoices");
                _employees = _database.GetCollection<EmployeeDocument>("employees");
                _syncLogs = _database.GetCollection<SyncLogDocument>("syncLogs");
                
                // Create indexes for better performance
                CreateIndexes();
                
                Console.WriteLine($"✅ MongoDB connected successfully to {databaseName}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ MongoDB connection failed: {ex.Message}");
                Console.WriteLine("📝 The API will start but MongoDB features will be unavailable.");
                Console.WriteLine("💡 To fix this, install MongoDB locally or use MongoDB Atlas.");
                
                // Set to null to indicate MongoDB is not available
                _database = null;
                _invoices = null;
                _employees = null;
                _syncLogs = null;
            }
        }

        private void CreateIndexes()
        {
            if (_invoices == null) return;
            
            // Note: `_id` (mapped from `Id`) already has an implicit unique index in MongoDB.
            // Do not create an explicit unique index on `_id` to avoid driver/server errors.
            
            // Invoice indexes for better performance
            _invoices!.Indexes.CreateOne(
                new CreateIndexModel<InvoiceDocument>(
                    Builders<InvoiceDocument>.IndexKeys.Ascending(x => x.InvoiceDate)
                )
            );

            // Compound indexes for common queries
            _invoices!.Indexes.CreateOne(
                new CreateIndexModel<InvoiceDocument>(
                    Builders<InvoiceDocument>.IndexKeys.Combine(
                        Builders<InvoiceDocument>.IndexKeys.Ascending(x => x.Currency),
                        Builders<InvoiceDocument>.IndexKeys.Descending(x => x.InvoiceDate)
                    )
                )
            );

            _invoices!.Indexes.CreateOne(
                new CreateIndexModel<InvoiceDocument>(
                    Builders<InvoiceDocument>.IndexKeys.Combine(
                        Builders<InvoiceDocument>.IndexKeys.Ascending(x => x.Currency),
                        Builders<InvoiceDocument>.IndexKeys.Descending(x => x.CreatedAt)
                    )
                )
            );

            // Index for total field (used in aggregations)
            _invoices!.Indexes.CreateOne(
                new CreateIndexModel<InvoiceDocument>(
                    Builders<InvoiceDocument>.IndexKeys.Ascending(x => x.Total)
                )
            );
            
            _invoices!.Indexes.CreateOne(
                new CreateIndexModel<InvoiceDocument>(
                    Builders<InvoiceDocument>.IndexKeys.Ascending(x => x.CreatedAt)
                )
            );
            
            _invoices!.Indexes.CreateOne(
                new CreateIndexModel<InvoiceDocument>(
                    Builders<InvoiceDocument>.IndexKeys.Ascending(x => x.Currency)
                )
            );
            
            _invoices!.Indexes.CreateOne(
                new CreateIndexModel<InvoiceDocument>(
                    Builders<InvoiceDocument>.IndexKeys.Ascending(x => x.EmployeeId)
                )
            );

            // Employee indexes
            _employees!.Indexes.CreateOne(
                new CreateIndexModel<EmployeeDocument>(
                    Builders<EmployeeDocument>.IndexKeys.Ascending(x => x.IsActive)
                )
            );

            // SyncLog indexes
            _syncLogs!.Indexes.CreateOne(
                new CreateIndexModel<SyncLogDocument>(
                    Builders<SyncLogDocument>.IndexKeys.Descending(x => x.StartTime)
                )
            );
        }

        // ✅ Optimized invoice operations for faster loading
        public async Task<List<InvoiceDocument>> GetInvoicesAsync(int skip = 0, int limit = -1, string sortBy = "invoiceDate")
        {
            if (_invoices == null) return new List<InvoiceDocument>();
            
            var sortDefinition = sortBy.ToLower() switch
            {
                "creationdate" or "created" or "createdat" => Builders<InvoiceDocument>.Sort.Descending(x => x.CreatedAt),
                _ => Builders<InvoiceDocument>.Sort.Descending(x => x.InvoiceDate)
            };

            var query = _invoices
                .Find(_ => true)
                .Sort(sortDefinition)
                .Skip(skip);

            // If limit is -1, return all invoices (no limit) - optimized for large datasets
            if (limit > 0)
            {
                query = query.Limit(limit);
            }

            return await query.ToListAsync();
        }

        public async Task<InvoiceDocument?> GetInvoiceByIdAsync(int id)
        {
            if (_invoices == null) return null;
            return await _invoices.Find(x => x.Id == id).FirstOrDefaultAsync();
        }

        public async Task<List<InvoiceDocument>> GetInvoicesByDateRangeAsync(DateTime startDate, DateTime endDate, string sortBy = "invoiceDate")
        {
            if (_invoices == null) return new List<InvoiceDocument>();
            
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
            if (_invoices == null) return new List<InvoiceDocument>();
            
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
            if (_invoices == null) return new List<InvoiceDocument>();
            
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
            if (_invoices == null) return 0;
            return await _invoices.CountDocumentsAsync(_ => true);
        }

        public async Task InsertInvoiceAsync(InvoiceDocument invoice)
        {
            if (_invoices == null) return;
            await _invoices.InsertOneAsync(invoice);
        }

        public async Task InsertInvoicesAsync(List<InvoiceDocument> invoices)
        {
            if (_invoices == null || !invoices.Any()) return;
            await _invoices.InsertManyAsync(invoices);
        }

        public async Task UpsertInvoicesAsync(List<InvoiceDocument> invoices)
        {
            if (_invoices == null || !invoices.Any()) 
            {
                Console.WriteLine("⚠️ UpsertInvoicesAsync: No invoices to process or MongoDB not available");
                return;
            }

            try
            {
                Console.WriteLine($"🔄 UpsertInvoicesAsync: Processing {invoices.Count} invoices...");
                
                var bulkOps = new List<WriteModel<InvoiceDocument>>();
                
                foreach (var invoice in invoices)
                {
                    var filter = Builders<InvoiceDocument>.Filter.Eq(x => x.Id, invoice.Id);
                    var update = Builders<InvoiceDocument>.Update
                        .Set(x => x.InvoiceNumber, invoice.InvoiceNumber)
                        .Set(x => x.InvoiceDate, invoice.InvoiceDate)
                        .Set(x => x.CreatedAt, invoice.CreatedAt)
                        .Set(x => x.CustomerName, invoice.CustomerName)
                        .Set(x => x.Total, invoice.Total)
                        .Set(x => x.Currency, invoice.Currency)
                        .Set(x => x.EmployeeId, invoice.EmployeeId)
                        .Set(x => x.SalespersonName, invoice.SalespersonName)
                        .Set(x => x.Description, invoice.Description)
                        .Set(x => x.Status, invoice.Status)
                        .Set(x => x.InvoiceStatus, invoice.InvoiceStatus)
                        .Set(x => x.DeliveryStatus, invoice.DeliveryStatus)
                        .Set(x => x.Paid, invoice.Paid)
                        .Set(x => x.Unpaid, invoice.Unpaid)
                        .Set(x => x.Locked, invoice.Locked)
                        .Set(x => x.Sent, invoice.Sent)
                        .Set(x => x.SentAt, invoice.SentAt)
                        .Set(x => x.SyncedAt, invoice.SyncedAt)
                        .Set(x => x.UpdatedAt, invoice.UpdatedAt);

                    var upsert = new UpdateOneModel<InvoiceDocument>(filter, update) { IsUpsert = true };
                    bulkOps.Add(upsert);
                }

                if (bulkOps.Any())
                {
                    Console.WriteLine($"💾 UpsertInvoicesAsync: Executing bulk write for {bulkOps.Count} operations (unordered)...");
                    var result = await _invoices.BulkWriteAsync(
                        bulkOps,
                        new BulkWriteOptions { IsOrdered = false }
                    );
                    Console.WriteLine($"✅ UpsertInvoicesAsync: Bulk write completed. Inserted: {result.InsertedCount}, Modified: {result.ModifiedCount}, Upserted: {result.Upserts.Count}");

                    // Verification pass: ensure all Ids exist, re-upsert individually if needed
                    var targetIds = invoices.Select(i => i.Id).ToList();
                    var existingIds = await _invoices
                        .Find(Builders<InvoiceDocument>.Filter.In(x => x.Id, targetIds))
                        .Project(i => i.Id)
                        .ToListAsync();

                    var missingIds = targetIds.Except(existingIds).ToList();
                    if (missingIds.Count > 0)
                    {
                        Console.WriteLine($"⚠️ UpsertInvoicesAsync: {missingIds.Count} invoices missing after bulk write. Retrying individually...");
                        foreach (var missingId in missingIds)
                        {
                            var inv = invoices.FirstOrDefault(i => i.Id == missingId);
                            if (inv == null) continue;

                            var filter = Builders<InvoiceDocument>.Filter.Eq(x => x.Id, inv.Id);
                            var replacement = inv;
                            await _invoices.ReplaceOneAsync(filter, replacement, new ReplaceOptions { IsUpsert = true });
                        }

                        // Re-verify
                        existingIds = await _invoices
                            .Find(Builders<InvoiceDocument>.Filter.In(x => x.Id, missingIds))
                            .Project(i => i.Id)
                            .ToListAsync();
                        var stillMissing = missingIds.Except(existingIds).ToList();
                        if (stillMissing.Count > 0)
                        {
                            Console.WriteLine($"❌ UpsertInvoicesAsync: {stillMissing.Count} invoices still missing after retries. Example ID: {stillMissing.First()}.");
                        }
                        else
                        {
                            Console.WriteLine("✅ UpsertInvoicesAsync: All previously missing invoices stored successfully after retries.");
                        }
                    }
                }
                else
                {
                    Console.WriteLine("⚠️ UpsertInvoicesAsync: No bulk operations to execute");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ UpsertInvoicesAsync failed: {ex.Message}");
                Console.WriteLine($"❌ Stack trace: {ex.StackTrace}");
                throw;
            }
        }

        public async Task<bool> InvoiceExistsAsync(int id)
        {
            if (_invoices == null) return false;
            return await _invoices.CountDocumentsAsync(x => x.Id == id) > 0;
        }

        /// <summary>
        /// Delete invoices by their IDs (for invoices that no longer exist in ERP)
        /// </summary>
        public async Task DeleteInvoicesByIdsAsync(List<int> invoiceIds)
        {
            if (_invoices == null || !invoiceIds.Any()) return;

            var filter = Builders<InvoiceDocument>.Filter.In(x => x.Id, invoiceIds);
            var result = await _invoices.DeleteManyAsync(filter);
            
            // Log the deletion result
            Console.WriteLine($"🗑️ Deleted {result.DeletedCount} invoices from database");
        }

        // Employee operations
        public async Task<List<EmployeeDocument>> GetEmployeesAsync()
        {
            if (_employees == null) return new List<EmployeeDocument>();
            return await _employees.Find(_ => true).ToListAsync();
        }

        public async Task<EmployeeDocument?> GetEmployeeByIdAsync(int id)
        {
            if (_employees == null) return null;
            return await _employees.Find(x => x.Id == id).FirstOrDefaultAsync();
        }

        public async Task<long> GetEmployeeCountAsync()
        {
            if (_employees == null) return 0;
            return await _employees.CountDocumentsAsync(_ => true);
        }

        public async Task InsertEmployeeAsync(EmployeeDocument employee)
        {
            if (_employees == null) return;
            await _employees.InsertOneAsync(employee);
        }

        public async Task InsertEmployeesAsync(List<EmployeeDocument> employees)
        {
            if (_employees == null || !employees.Any()) return;
            await _employees.InsertManyAsync(employees);
        }

        public async Task<bool> EmployeeExistsAsync(int id)
        {
            if (_employees == null) return false;
            return await _employees.CountDocumentsAsync(x => x.Id == id) > 0;
        }

        // SyncLog operations
        public async Task<List<SyncLogDocument>> GetSyncLogsAsync(int limit = 10)
        {
            if (_syncLogs == null) return new List<SyncLogDocument>();
            return await _syncLogs
                .Find(_ => true)
                .SortByDescending(x => x.StartTime)
                .Limit(limit)
                .ToListAsync();
        }

        public async Task<SyncLogDocument?> GetLatestSyncLogAsync()
        {
            if (_syncLogs == null) return null;
            return await _syncLogs
                .Find(_ => true)
                .SortByDescending(x => x.StartTime)
                .FirstOrDefaultAsync();
        }

        public async Task<SyncLogDocument?> GetSyncLogByIdAsync(string id)
        {
            if (_syncLogs == null) return null;
            return await _syncLogs.Find(x => x.Id == id).FirstOrDefaultAsync();
        }

        public async Task InsertSyncLogAsync(SyncLogDocument syncLog)
        {
            if (_syncLogs == null) return;
            await _syncLogs.InsertOneAsync(syncLog);
        }

        public async Task UpdateSyncLogAsync(SyncLogDocument syncLog)
        {
            if (_syncLogs == null) return;
            await _syncLogs.ReplaceOneAsync(x => x.Id == syncLog.Id, syncLog);
        }

        // Statistics operations
        public async Task<Dictionary<string, int>> GetCurrencyBreakdownAsync()
        {
            if (_invoices == null) return new Dictionary<string, int>();
            
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
            if (_invoices == null) return null;
            
            var latest = await _invoices
                .Find(_ => true)
                .SortByDescending(x => x.InvoiceDate)
                .FirstOrDefaultAsync();
            
            return latest?.InvoiceDate;
        }

        public async Task<DateTime?> GetOldestInvoiceDateAsync()
        {
            if (_invoices == null) return null;
            
            var oldest = await _invoices
                .Find(_ => true)
                .SortBy(x => x.InvoiceDate)
                .FirstOrDefaultAsync();
            
            return oldest?.InvoiceDate;
        }

        public async Task<Dictionary<string, decimal>> GetTotalSalesByCurrencyAsync()
        {
            if (_invoices == null) return new Dictionary<string, decimal>();
            
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
                x => x["_id"].AsString ?? "Unknown",
                x => x["totalSales"].IsBsonNull ? 0m : (decimal)x["totalSales"].ToDecimal()
            );
        }

        public async Task<decimal> GetTotalSalesAsync()
        {
            if (_invoices == null) return 0m;
            
            var pipeline = new[]
            {
                new BsonDocument("$match", new BsonDocument
                {
                    { "total", new BsonDocument("$ne", BsonNull.Value) }
                }),
                new BsonDocument("$group", new BsonDocument
                {
                    { "_id", BsonNull.Value },
                    { "totalSales", new BsonDocument("$sum", "$total") }
                })
            };

            var result = await _invoices.Aggregate<BsonDocument>(pipeline).FirstOrDefaultAsync();
            
            return result != null && !result["totalSales"].IsBsonNull ? (decimal)result["totalSales"].ToDecimal() : 0m;
        }

        // Time-based sales aggregation methods
        public async Task<Dictionary<string, decimal>> GetSalesByCurrencyAndTimePeriodAsync(
            string timePeriod = "all", 
            DateTime? startDate = null, 
            DateTime? endDate = null)
        {
            if (_invoices == null) return new Dictionary<string, decimal>();
            
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
                x => x["_id"].AsString ?? "Unknown",
                x => x["totalSales"].IsBsonNull ? 0m : (decimal)x["totalSales"].ToDecimal()
            );
        }

        public async Task<Dictionary<string, object>> GetDetailedSalesByCurrencyAndTimePeriodAsync(
            string timePeriod = "all", 
            DateTime? startDate = null, 
            DateTime? endDate = null)
        {
            if (_invoices == null) return new Dictionary<string, object>();
            
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
                x => x["_id"].AsString ?? "Unknown",
                x => new
                {
                    totalSales = x["totalSales"].IsBsonNull ? 0m : (decimal)x["totalSales"].AsDouble,
                    invoiceCount = x["invoiceCount"].AsInt32,
                    averageSale = x["averageSale"].IsBsonNull ? 0m : (decimal)x["averageSale"].AsDouble,
                    minSale = x["minSale"].IsBsonNull ? 0m : (decimal)x["minSale"].AsDouble,
                    maxSale = x["maxSale"].IsBsonNull ? 0m : (decimal)x["maxSale"].AsDouble
                } as object
            );
        }

        public async Task<decimal> GetTotalSalesByTimePeriodAsync(
            string timePeriod = "all", 
            DateTime? startDate = null, 
            DateTime? endDate = null)
        {
            if (_invoices == null) return 0m;
            
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
                    { "_id", BsonNull.Value },
                    { "totalSales", new BsonDocument("$sum", "$total") }
                })
            };

            var result = await _invoices.Aggregate<BsonDocument>(pipeline).FirstOrDefaultAsync();
            
            return result != null && !result["totalSales"].IsBsonNull ? (decimal)result["totalSales"].ToDecimal() : 0m;
        }

        // ✅ Optimized method using MongoDB aggregation instead of loading all invoices
        public async Task<Dictionary<string, decimal>> GetAllInvoicesAndCalculateTotalsAsync()
        {
            try
            {
                if (_invoices == null) return new Dictionary<string, decimal>();
                
                // Use MongoDB aggregation pipeline for better performance
                var pipeline = new[]
                {
                    new BsonDocument("$group", new BsonDocument
                    {
                        { "_id", "$currency" },
                        { "totalSales", new BsonDocument("$sum", "$total") }
                    }),
                    new BsonDocument("$sort", new BsonDocument("totalSales", -1))
                };

                var result = await _invoices.Aggregate<BsonDocument>(pipeline).ToListAsync();
                
                return result.ToDictionary(
                    x => x["_id"].AsString ?? "Unknown",
                    x => x["totalSales"].IsBsonNull ? 0m : (decimal)x["totalSales"].ToDecimal()
                );
            }
            catch (Exception ex)
            {
                // Log the exception and return empty dictionary
                Console.WriteLine($"Error in GetAllInvoicesAndCalculateTotalsAsync: {ex.Message}");
                return new Dictionary<string, decimal>();
            }
        }

        // ✅ Optimized detailed invoice statistics using MongoDB aggregation
        public async Task<object> GetDetailedInvoiceStatsAsync()
        {
            try
            {
                if (_invoices == null) return new
                {
                    totalInvoices = 0,
                    totalSales = 0m,
                    currencyBreakdown = new Dictionary<string, object>(),
                    error = "MongoDB not available"
                };
                
                // Use aggregation pipeline for better performance
                var pipeline = new[]
                {
                    new BsonDocument("$group", new BsonDocument
                    {
                        { "_id", "$currency" },
                        { "count", new BsonDocument("$sum", 1) },
                        { "totalSales", new BsonDocument("$sum", "$total") },
                        { "averageSale", new BsonDocument("$avg", "$total") },
                        { "minSale", new BsonDocument("$min", "$total") },
                        { "maxSale", new BsonDocument("$max", "$total") }
                    }),
                    new BsonDocument("$sort", new BsonDocument("totalSales", -1))
                };

                var currencyResults = await _invoices.Aggregate<BsonDocument>(pipeline).ToListAsync();
                
                // Get total count and date range separately for efficiency
                var totalCount = await _invoices.CountDocumentsAsync(_ => true);
                var latestDate = await GetLatestInvoiceDateAsync();
                var oldestDate = await GetOldestInvoiceDateAsync();
                
                var stats = new
                {
                    totalInvoices = (int)totalCount,
                    totalSales = currencyResults.Sum(x => x["totalSales"].IsBsonNull ? 0m : (decimal)x["totalSales"].ToDecimal()),
                    currencyBreakdown = currencyResults.ToDictionary(
                        x => x["_id"].AsString ?? "Unknown",
                        x => new
                        {
                            count = x["count"].AsInt32,
                            totalSales = x["totalSales"].IsBsonNull ? 0m : (decimal)x["totalSales"].ToDecimal(),
                            averageSale = x["averageSale"].IsBsonNull ? 0m : (decimal)x["averageSale"].ToDecimal(),
                            minSale = x["minSale"].IsBsonNull ? 0m : (decimal)x["minSale"].ToDecimal(),
                            maxSale = x["maxSale"].IsBsonNull ? 0m : (decimal)x["maxSale"].ToDecimal()
                        }
                    ),
                    dateRange = latestDate.HasValue && oldestDate.HasValue ? new
                    {
                        earliest = oldestDate.Value,
                        latest = latestDate.Value
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
        
        // ✅ Test method to check MongoDB connection and data
        public async Task<object> TestMongoDbConnectionAsync()
        {
            try
            {
                if (_invoices == null) return new { status = "MongoDB not available", error = "MongoDB service not initialized" };
                
                // Test basic connection
                var totalCount = await _invoices.CountDocumentsAsync(_ => true);
                
                // Get a sample document to check data structure
                var sampleDoc = await _invoices.Find(_ => true).FirstOrDefaultAsync();
                
                // Test aggregation with null handling
                var pipeline = new[]
                {
                    new BsonDocument("$limit", 1),
                    new BsonDocument("$project", new BsonDocument
                    {
                        { "id", 1 },
                        { "total", 1 },
                        { "currency", 1 },
                        { "invoiceDate", 1 },
                        { "hasTotal", new BsonDocument("$ne", new BsonArray { "$total", BsonNull.Value }) },
                        { "hasCurrency", new BsonDocument("$ne", new BsonArray { "$currency", BsonNull.Value }) }
                    })
                };
                
                var testResult = await _invoices.Aggregate<BsonDocument>(pipeline).FirstOrDefaultAsync();
                
                return new
                {
                    status = "Connected",
                    totalInvoices = totalCount,
                    sampleDocument = sampleDoc != null ? new
                    {
                        id = sampleDoc.Id,
                        total = sampleDoc.Total,
                        currency = sampleDoc.Currency,
                        invoiceDate = sampleDoc.InvoiceDate
                    } : null,
                    testAggregation = testResult != null ? new
                    {
                        id = testResult.Contains("id") ? testResult["id"] : null,
                        total = testResult.Contains("total") ? testResult["total"] : null,
                        currency = testResult.Contains("currency") ? testResult["currency"] : null,
                        hasTotal = testResult.Contains("hasTotal") ? testResult["hasTotal"].AsBoolean : false,
                        hasCurrency = testResult.Contains("hasCurrency") ? testResult["hasCurrency"].AsBoolean : false
                    } : null
                };
            }
            catch (Exception ex)
            {
                return new { status = "Error", error = ex.Message };
            }
        }
    }
}
