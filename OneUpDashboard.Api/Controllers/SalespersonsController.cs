using Microsoft.AspNetCore.Mvc;
using OneUpDashboard.Api.Services;

namespace OneUpDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SalespersonsController : ControllerBase
    {
        private readonly SalespersonService _service;

        public SalespersonsController(SalespersonService service)
        {
            _service = service;
        }

        // GET /api/salespersons?period=monthly&year=2024&month=12
        [HttpGet]
        public async Task<IActionResult> GetSalespersons(
            [FromQuery] string period = "all",
            [FromQuery] int year = 0,
            [FromQuery] int month = 0,
            [FromQuery] int quarter = 0)
        {
            var result = await _service.GetSalespersonsWithSalesAsync(period, year, month, quarter);
            return Ok(result);
        }
    }
}