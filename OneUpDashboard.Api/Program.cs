using Microsoft.EntityFrameworkCore;
using OneUpDashboard.Api.Data;
using OneUpDashboard.Api.Services;
using Hangfire;
using Hangfire.MemoryStorage;
using Hangfire.Dashboard;

var builder = WebApplication.CreateBuilder(args);

// Enable CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173") // React dev server
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

builder.Services.AddControllers();

// ✅ Add Entity Framework with In-Memory Database (No SQLite issues)
builder.Services.AddDbContext<DashboardDbContext>(options =>
    options.UseInMemoryDatabase("OneUpDashboard"));

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

// ✅ Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<DashboardDbContext>();
    context.Database.EnsureCreated();
    Console.WriteLine("✅ Database initialized");
}

// ✅ Add Hangfire Dashboard (for monitoring background jobs)
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new AllowAllAuthorizationFilter() } // Only for development!
});

// Remove HTTPS redirection for development to avoid port issues
// app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.MapControllers();

// ✅ Schedule background jobs after Hangfire is fully initialized
app.Lifetime.ApplicationStarted.Register(() =>
{
    using var scope = app.Services.CreateScope();
    var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    
    // Schedule daily sync job at 2:00 AM
    recurringJobManager.AddOrUpdate<DataSyncService>(
        "daily-invoice-sync",
        service => service.SyncAllInvoicesAsync(),
        Cron.Daily(2)); // 2:00 AM daily
        
    Console.WriteLine("✅ Background jobs scheduled");
});

app.Run();

// Simple authorization filter for Hangfire Dashboard (development only)
public class AllowAllAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context) => true;
}
