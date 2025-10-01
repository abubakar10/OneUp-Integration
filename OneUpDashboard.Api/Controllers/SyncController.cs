using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OneUpDashboard.Api.Services;
using OneUpDashboard.Api.Models.MongoDb;
using Hangfire;

namespace OneUpDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SyncController : ControllerBase
    {
        private readonly DataSyncService _syncService;
        private readonly MongoDbService _mongoDbService;
        private readonly ILogger<SyncController> _logger;

        public SyncController(
            DataSyncService syncService,
            MongoDbService mongoDbService,
            ILogger<SyncController> logger)
        {
            _syncService = syncService;
            _mongoDbService = mongoDbService;
            _logger = logger;
        }

        /// <summary>
        /// Get current sync status
        /// </summary>
        [HttpGet("status")]
        public async Task<IActionResult> GetSyncStatus()
        {
            try
            {
                var latestSync = await _mongoDbService.GetLatestSyncLogAsync();

                // Check if any sync is currently running (Hangfire jobs)
                var isRunning = false;
                
                // Simple check - if latest sync has no end time and started within last hour, consider it running
                if (latestSync != null && !latestSync.EndTime.HasValue && 
                    latestSync.StartTime > DateTime.UtcNow.AddHours(-1))
                {
                    isRunning = true;
                }

                var status = new
                {
                    isRunning = isRunning,
                    lastSync = latestSync?.EndTime,
                    lastSyncStatus = latestSync?.Status ?? "never",
                    duration = latestSync?.DurationSeconds,
                    errorMessage = latestSync?.ErrorMessage,
                    totalRecords = latestSync?.TotalRecords ?? 0,
                    processedRecords = latestSync?.ProcessedRecords ?? 0,
                    apiCalls = latestSync?.ApiCallsCount ?? 0
                };

                return Ok(status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sync status");
                return StatusCode(500, new { error = "Failed to get sync status", details = ex.Message });
            }
        }

        /// <summary>
        /// Get database statistics
        /// </summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetDatabaseStats()
        {
            try
            {
                var totalInvoices = await _mongoDbService.GetInvoiceCountAsync();
                var totalEmployees = await _mongoDbService.GetEmployeeCountAsync();
                
                var latestInvoiceDate = await _mongoDbService.GetLatestInvoiceDateAsync();
                var oldestInvoiceDate = await _mongoDbService.GetOldestInvoiceDateAsync();
                var currencyBreakdown = await _mongoDbService.GetCurrencyBreakdownAsync();

                var stats = new
                {
                    totalInvoices = totalInvoices,
                    totalEmployees = totalEmployees,
                    latestInvoiceDate = latestInvoiceDate?.ToString("yyyy-MM-dd"),
                    oldestInvoiceDate = oldestInvoiceDate?.ToString("yyyy-MM-dd"),
                    databaseSize = "MongoDB Collection", // MongoDB doesn't have a single file size concept
                    currencyBreakdown = currencyBreakdown.Select(c => new { currency = c.Key, count = c.Value }).ToList()
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting database stats");
                return StatusCode(500, new { error = "Failed to get database stats", details = ex.Message });
            }
        }

        /// <summary>
        /// Trigger manual sync
        /// </summary>
        [HttpPost("trigger")]
        public async Task<IActionResult> TriggerSync()
        {
            try
            {
                _logger.LogInformation("🚀 Manual sync triggered via API");

                // Check if sync is already running
                var recentSync = await _mongoDbService.GetLatestSyncLogAsync();
                if (recentSync != null && recentSync.Status == "running" && 
                    recentSync.StartTime > DateTime.UtcNow.AddHours(-1))
                {
                    return BadRequest(new { error = "Sync is already running", syncId = recentSync.Id });
                }

                // Queue the sync job using Hangfire
                var jobId = BackgroundJob.Enqueue(() => _syncService.SyncAllInvoicesAsync());

                _logger.LogInformation("✅ Sync job queued with ID: {JobId}", jobId);

                return Ok(new
                {
                    message = "🚀 Sync job started successfully",
                    jobId = jobId,
                    status = "queued",
                    note = "Check /api/sync/status for progress"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error triggering sync");
                return StatusCode(500, new { error = "Failed to trigger sync", details = ex.Message });
            }
        }

        /// <summary>
        /// Stop/cancel current sync
        /// </summary>
        [HttpPost("stop")]
        public async Task<IActionResult> StopSync()
        {
            try
            {
                _logger.LogInformation("🛑 Stop sync requested via API");

                // Get the latest running sync
                var runningSync = await _mongoDbService.GetLatestSyncLogAsync();
                if (runningSync != null && runningSync.Status == "running")
                {
                    // Mark the sync as cancelled
                    runningSync.Status = "cancelled";
                    runningSync.EndTime = DateTime.UtcNow;
                    runningSync.DurationSeconds = (int)(runningSync.EndTime.Value - runningSync.StartTime).TotalSeconds;
                    runningSync.Notes = "Sync cancelled by user";
                    
                    await _mongoDbService.UpdateSyncLogAsync(runningSync);
                    
                    _logger.LogInformation("✅ Sync cancelled successfully");
                    
                    return Ok(new
                    {
                        message = "🛑 Sync cancelled successfully",
                        syncId = runningSync.Id,
                        status = "cancelled"
                    });
                }
                else
                {
                    return BadRequest(new { error = "No running sync found to cancel" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error stopping sync");
                return StatusCode(500, new { error = "Failed to stop sync", details = ex.Message });
            }
        }

        /// <summary>
        /// Get sync history/logs
        /// </summary>
        [HttpGet("history")]
        public async Task<IActionResult> GetSyncHistory([FromQuery] int limit = 10)
        {
            try
            {
                var history = await _mongoDbService.GetSyncLogsAsync(limit);

                var historyResponse = history.Select(s => new
                {
                    id = s.Id,
                    syncType = s.SyncType,
                    status = s.Status,
                    startTime = s.StartTime,
                    endTime = s.EndTime,
                    duration = s.DurationSeconds,
                    totalRecords = s.TotalRecords,
                    processedRecords = s.ProcessedRecords,
                    apiCalls = s.ApiCallsCount,
                    errorMessage = s.ErrorMessage,
                    notes = s.Notes
                }).ToList();

                return Ok(historyResponse);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sync history");
                return StatusCode(500, new { error = "Failed to get sync history", details = ex.Message });
            }
        }
    }
}