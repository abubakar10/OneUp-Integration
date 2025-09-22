using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OneUpDashboard.Api.Data;
using OneUpDashboard.Api.Services;
using OneUpDashboard.Api.Models;
using Hangfire;

namespace OneUpDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SyncController : ControllerBase
    {
        private readonly DataSyncService _syncService;
        private readonly DashboardDbContext _context;
        private readonly ILogger<SyncController> _logger;

        public SyncController(
            DataSyncService syncService,
            DashboardDbContext context,
            ILogger<SyncController> logger)
        {
            _syncService = syncService;
            _context = context;
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
                var latestSync = await _context.SyncLogs
                    .OrderByDescending(s => s.StartTime)
                    .FirstOrDefaultAsync();

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
                var totalInvoices = await _context.Invoices.CountAsync();
                var totalEmployees = await _context.Employees.CountAsync();
                
                var latestInvoice = await _context.Invoices
                    .OrderByDescending(i => i.InvoiceDate)
                    .FirstOrDefaultAsync();

                var oldestInvoice = await _context.Invoices
                    .OrderBy(i => i.InvoiceDate)
                    .FirstOrDefaultAsync();

                var currencyBreakdown = await _context.Invoices
                    .GroupBy(i => i.Currency)
                    .Select(g => new { currency = g.Key, count = g.Count() })
                    .ToListAsync();

                // Get database file size (SQLite specific)
                string? databaseSize = null;
                try
                {
                    var dbPath = Path.Combine(Directory.GetCurrentDirectory(), "dashboard.db");
                    if (System.IO.File.Exists(dbPath))
                    {
                        var fileInfo = new FileInfo(dbPath);
                        databaseSize = $"{fileInfo.Length / 1024 / 1024:F1} MB";
                    }
                }
                catch
                {
                    // Ignore file size errors
                }

                var stats = new
                {
                    totalInvoices = totalInvoices,
                    totalEmployees = totalEmployees,
                    latestInvoiceDate = latestInvoice?.InvoiceDate.ToString("yyyy-MM-dd"),
                    oldestInvoiceDate = oldestInvoice?.InvoiceDate.ToString("yyyy-MM-dd"),
                    databaseSize = databaseSize,
                    currencyBreakdown = currencyBreakdown
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
                var recentSync = await _context.SyncLogs
                    .Where(s => s.Status == "running" && s.StartTime > DateTime.UtcNow.AddHours(-1))
                    .FirstOrDefaultAsync();

                if (recentSync != null)
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
        /// Get sync history/logs
        /// </summary>
        [HttpGet("history")]
        public async Task<IActionResult> GetSyncHistory([FromQuery] int limit = 10)
        {
            try
            {
                var history = await _context.SyncLogs
                    .OrderByDescending(s => s.StartTime)
                    .Take(limit)
                    .Select(s => new
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
                    })
                    .ToListAsync();

                return Ok(history);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sync history");
                return StatusCode(500, new { error = "Failed to get sync history", details = ex.Message });
            }
        }
    }
}
