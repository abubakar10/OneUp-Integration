using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OneUpDashboard.Api.Services;
using OneUpDashboard.Api.Models.MongoDb;

namespace OneUpDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SalespersonsController : ControllerBase
    {
        private readonly MongoDbService _mongoDbService;
        private readonly ILogger<SalespersonsController> _logger;

        public SalespersonsController(MongoDbService mongoDbService, ILogger<SalespersonsController> logger)
        {
            _mongoDbService = mongoDbService;
            _logger = logger;
        }

        // GET /api/salespersons
        [HttpGet]
        public async Task<IActionResult> GetSalespersons()
        {
            try
            {
                var employees = await _mongoDbService.GetEmployeesAsync();
                
                // Get sales data for each employee
                var salespersonsWithSales = new List<object>();
                
                foreach (var employee in employees)
                {
                    var employeeInvoices = await _mongoDbService.GetInvoicesByEmployeeAsync(employee.Id);
                    var totalSales = employeeInvoices.Sum(i => i.Total);
                    var invoiceCount = employeeInvoices.Count;

                    salespersonsWithSales.Add(new
                    {
                        id = employee.Id,
                        firstName = employee.FirstName,
                        lastName = employee.LastName,
                        fullName = employee.FullName,
                        email = employee.Email,
                        phone = employee.Phone,
                        department = employee.Department,
                        position = employee.Position,
                        isActive = employee.IsActive,
                        totalSales = totalSales,
                        invoiceCount = invoiceCount,
                        averageInvoiceValue = invoiceCount > 0 ? totalSales / invoiceCount : 0
                    });
                }

                return Ok(salespersonsWithSales);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting salespersons");
                return StatusCode(500, new { error = "Failed to get salespersons", details = ex.Message });
            }
        }

        // GET /api/salespersons/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetSalesperson(int id)
        {
            try
            {
                var employee = await _mongoDbService.GetEmployeeByIdAsync(id);
                if (employee == null)
                {
                    return NotFound(new { error = "Salesperson not found" });
                }

                var employeeInvoices = await _mongoDbService.GetInvoicesByEmployeeAsync(id);
                var totalSales = employeeInvoices.Sum(i => i.Total);
                var invoiceCount = employeeInvoices.Count;

                var result = new
                {
                    id = employee.Id,
                    firstName = employee.FirstName,
                    lastName = employee.LastName,
                    fullName = employee.FullName,
                    email = employee.Email,
                    phone = employee.Phone,
                    department = employee.Department,
                    position = employee.Position,
                    isActive = employee.IsActive,
                    totalSales = totalSales,
                    invoiceCount = invoiceCount,
                    averageInvoiceValue = invoiceCount > 0 ? totalSales / invoiceCount : 0,
                    invoices = employeeInvoices.Take(10) // Show last 10 invoices
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting salesperson {Id}", id);
                return StatusCode(500, new { error = "Failed to get salesperson", details = ex.Message });
            }
        }

        // GET /api/salespersons/{id}/invoices
        [HttpGet("{id}/invoices")]
        public async Task<IActionResult> GetSalespersonInvoices(int id, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            try
            {
                var employee = await _mongoDbService.GetEmployeeByIdAsync(id);
                if (employee == null)
                {
                    return NotFound(new { error = "Salesperson not found" });
                }

                var allInvoices = await _mongoDbService.GetInvoicesByEmployeeAsync(id);
                var totalCount = allInvoices.Count;
                var skip = (page - 1) * pageSize;
                var invoices = allInvoices.Skip(skip).Take(pageSize).ToList();

                var result = new
                {
                    salesperson = new
                    {
                        id = employee.Id,
                        fullName = employee.FullName
                    },
                    invoices = invoices,
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
                _logger.LogError(ex, "Error getting salesperson invoices for {Id}", id);
                return StatusCode(500, new { error = "Failed to get salesperson invoices", details = ex.Message });
            }
        }
    }
}