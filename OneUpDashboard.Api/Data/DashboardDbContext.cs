using Microsoft.EntityFrameworkCore;
using OneUpDashboard.Api.Models;

namespace OneUpDashboard.Api.Data
{
    public class DashboardDbContext : DbContext
    {
        public DashboardDbContext(DbContextOptions<DashboardDbContext> options) : base(options)
        {
        }

        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<SyncLog> SyncLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure Invoice entity
            modelBuilder.Entity<Invoice>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.InvoiceNumber).IsRequired().HasMaxLength(100);
                entity.Property(e => e.CustomerName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Currency).HasMaxLength(10);
                entity.Property(e => e.SalespersonName).HasMaxLength(200);
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.Status).HasMaxLength(50);

                // Index for fast date sorting (most important!)
                entity.HasIndex(e => e.InvoiceDate);

                // Index for currency filtering
                entity.HasIndex(e => e.Currency);

                // Index for salesperson queries
                entity.HasIndex(e => e.EmployeeId);

                // Index for creation date sorting
                entity.HasIndex(e => e.CreatedAt);

                // Composite index for common queries
                entity.HasIndex(e => new { e.InvoiceDate, e.Currency });
            });

            // Configure Employee entity
            modelBuilder.Entity<Employee>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Email).HasMaxLength(200);
                entity.Property(e => e.Phone).HasMaxLength(50);
                entity.Property(e => e.Department).HasMaxLength(100);
                entity.Property(e => e.Position).HasMaxLength(100);

                // Index for name searches
                entity.HasIndex(e => new { e.FirstName, e.LastName });

                // Index for active employees
                entity.HasIndex(e => e.IsActive);
            });

            // Configure SyncLog entity
            modelBuilder.Entity<SyncLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.SyncType).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Status).HasMaxLength(50);
                entity.Property(e => e.ErrorMessage).HasMaxLength(1000);
                entity.Property(e => e.Notes).HasMaxLength(2000);

                // Index for status queries
                entity.HasIndex(e => e.Status);

                // Index for sync type queries
                entity.HasIndex(e => e.SyncType);

                // Index for date queries
                entity.HasIndex(e => e.StartTime);
            });
        }
    }
}