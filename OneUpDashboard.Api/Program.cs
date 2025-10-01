using OneUpDashboard.Api.Services;
using Hangfire;
using Hangfire.MemoryStorage;
using Hangfire.Dashboard;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

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
