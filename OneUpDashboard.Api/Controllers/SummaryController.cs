using Microsoft.AspNetCore.Mvc;

namespace OneUpDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SummaryController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get()
        {
            // Temporary static response
            var summary = new
            {
                totalSales = 1000000,
                totalInvoices = 120,
                byCurrency = new[]
                {
                    new { currency = "USD", total = 500000 },
                    new { currency = "PKR", total = 300000 },
                    new { currency = "AED", total = 200000 }
                },
                topSalespersons = new[]
                {
                    new { name = "Alice", total = 300000, count = 30 },
                    new { name = "Bob", total = 250000, count = 25 },
                    new { name = "Charlie", total = 200000, count = 20 }
                }
            };

            return Ok(summary);
        }
    }
}
