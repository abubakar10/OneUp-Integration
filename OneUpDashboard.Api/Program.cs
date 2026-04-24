using OneUpDashboard.Api.Services;
using Hangfire;
using Hangfire.MemoryStorage;
using Hangfire.Dashboard;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Collections.Generic;

var builder = WebApplication.CreateBuilder(args);

// Load local .env values into configuration for development runs.
var envFilePath = Path.Combine(builder.Environment.ContentRootPath, ".env");
if (File.Exists(envFilePath))
{
    var envValues = LoadDotEnvAsConfiguration(envFilePath);
    if (envValues.Count > 0)
    {
        builder.Configuration.AddInMemoryCollection(envValues);
    }
}

// Enable CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
                ?? new[] { "http://localhost:5173" };
            
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

builder.Services.AddControllers();

// ✅ Add HttpClient for Microsoft Graph API calls
builder.Services.AddHttpClient();

// ✅ Add JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtKey = builder.Configuration["Jwt:Key"];
        var jwtIssuer = builder.Configuration["Jwt:Issuer"];
        var jwtAudience = builder.Configuration["Jwt:Audience"];

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey ?? "")),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// ✅ Add MongoDB service
builder.Services.AddSingleton<MongoDbService>();

// ✅ Add Hangfire for background jobs
builder.Services.AddHangfire(config =>
    config.UseMemoryStorage());
builder.Services.AddHangfireServer();

// ✅ Register services
builder.Services.AddSingleton<OneUpClient>();
builder.Services.AddScoped<InvoiceService>();
builder.Services.AddScoped<SalespersonService>();
// builder.Services.AddScoped<DataAggregationService>(); // ⏸️ Temporarily disabled
// builder.Services.AddScoped<FastDashboardService>(); // ⏸️ Temporarily disabled
builder.Services.AddScoped<DataSyncService>(); // ✨ New sync service

var app = builder.Build();

// ✅ MongoDB is ready to use - no initialization needed
Console.WriteLine("✅ MongoDB service initialized");

// ✅ Add Hangfire Dashboard (for monitoring background jobs)
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new AllowAllAuthorizationFilter() } // Only for development!
});

// Remove HTTPS redirection for development to avoid port issues
// app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

// ✅ Add Authentication & Authorization middleware
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// ✅ Add a simple health check endpoint
app.MapGet("/", () => "OneUp Dashboard API is running!");
app.MapGet("/health", () => new { Status = "Healthy", Timestamp = DateTime.UtcNow });
// Browsing /api alone has no controller; explain so it is not mistaken for a broken deploy
app.MapGet("/api", () => Results.Json(new
{
    status = "ok",
    message = "API is running. There is no page at /api — use /api/<controller> (e.g. /api/invoices) or GET /health.",
}));
app.MapGet("/api/test", () => new { Message = "API Test endpoint working!", Timestamp = DateTime.UtcNow });

// ✅ Schedule background jobs after Hangfire is fully initialized
app.Lifetime.ApplicationStarted.Register(() =>
{
    using var scope = app.Services.CreateScope();
    var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    var backgroundJobClient = scope.ServiceProvider.GetRequiredService<IBackgroundJobClient>();
    var mongoDbService = scope.ServiceProvider.GetRequiredService<MongoDbService>();
    var configuredTimeZoneId = app.Configuration["Sync:TimeZone"] ?? "Pakistan Standard Time";
    var syncTimeZone = ResolveTimeZone(configuredTimeZoneId);

    var dailyHour = app.Configuration.GetValue("Sync:DailyHour", 5);
    var dailyMinute = app.Configuration.GetValue("Sync:DailyMinute", 0);
    var dailyCronOverride = app.Configuration["Sync:DailyCron"];

    // NCrontab: minute hour day-of-month month day-of-week (Hangfire default)
    var cronExpression = !string.IsNullOrWhiteSpace(dailyCronOverride)
        ? dailyCronOverride.Trim()
        : $"{dailyMinute} {dailyHour} * * *";

    recurringJobManager.AddOrUpdate<DataSyncService>(
        "daily-invoice-sync",
        service => service.SyncAllInvoicesAsync(),
        cronExpression,
        new RecurringJobOptions
        {
            TimeZone = syncTimeZone
        });

    // Catch-up: if app was down at the scheduled time, queue one run after that time passes.
    try
    {
        var latestSync = mongoDbService.GetLatestSyncLogAsync().GetAwaiter().GetResult();
        var nowInSyncTimeZone = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, syncTimeZone);
        var todayScheduled = nowInSyncTimeZone.Date.AddHours(dailyHour).AddMinutes(dailyMinute);

        var hasCompletedSyncAfterScheduleToday = latestSync != null &&
                                                 latestSync.Status == "completed" &&
                                                 latestSync.EndTime.HasValue &&
                                                 TimeZoneInfo.ConvertTimeFromUtc(
                                                     DateTime.SpecifyKind(latestSync.EndTime.Value, DateTimeKind.Utc),
                                                     syncTimeZone) >= todayScheduled;

        if (nowInSyncTimeZone >= todayScheduled && !hasCompletedSyncAfterScheduleToday)
        {
            var catchupJobId = backgroundJobClient.Enqueue<DataSyncService>(service => service.SyncAllInvoicesAsync());
            Console.WriteLine(
                $"⏰ Catch-up sync queued (job: {catchupJobId}) because no completed sync was found after today's scheduled time ({dailyHour:00}:{dailyMinute:00}).");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️ Failed to evaluate catch-up sync state: {ex.Message}");
    }

    Console.WriteLine(
        $"✅ Background jobs scheduled: cron \"{cronExpression}\" in timezone {syncTimeZone.Id} (daily at {dailyHour:00}:{dailyMinute:00}). Hangfire dashboard: /hangfire");
});

app.Run();

static Dictionary<string, string?> LoadDotEnvAsConfiguration(string filePath)
{
    var configValues = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

    foreach (var rawLine in File.ReadAllLines(filePath))
    {
        var line = rawLine.Trim();
        if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#"))
        {
            continue;
        }

        var separatorIndex = line.IndexOf('=');
        if (separatorIndex <= 0)
        {
            continue;
        }

        var key = line[..separatorIndex].Trim();
        var value = line[(separatorIndex + 1)..].Trim();

        if (value.Length >= 2 &&
            ((value.StartsWith('"') && value.EndsWith('"')) ||
             (value.StartsWith('\'') && value.EndsWith('\''))))
        {
            value = value[1..^1];
        }

        var normalizedKey = key.Replace("__", ":");
        configValues[normalizedKey] = value;

        // Backward-compatible mapping for existing .env key style in this project.
        if (string.Equals(key, "MongoDB", StringComparison.OrdinalIgnoreCase))
        {
            configValues["ConnectionStrings:MongoDB"] = value;
        }
        else if (string.Equals(key, "AzureAdClientId", StringComparison.OrdinalIgnoreCase))
        {
            configValues["AzureAd:ClientId"] = value;
        }
        else if (string.Equals(key, "AzureAdTenantId", StringComparison.OrdinalIgnoreCase))
        {
            configValues["AzureAd:TenantId"] = value;
        }
    }

    return configValues;
}

static TimeZoneInfo ResolveTimeZone(string configuredTimeZoneId)
{
    try
    {
        return TimeZoneInfo.FindSystemTimeZoneById(configuredTimeZoneId);
    }
    catch
    {
        try
        {
            // Common Linux/IANA equivalent for Pakistan Standard Time.
            return TimeZoneInfo.FindSystemTimeZoneById("Asia/Karachi");
        }
        catch
        {
            return TimeZoneInfo.Local;
        }
    }
}

// Simple authorization filter for Hangfire Dashboard (development only)
public class AllowAllAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context) => true;
}
