using Microsoft.AspNetCore.Mvc;
using OneUpDashboard.Api.Services;

namespace OneUpDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InvoicesController : ControllerBase
    {
        private readonly InvoiceService _service;

        public InvoicesController(InvoiceService service)
        {
            _service = service;
        }

        // GET /api/invoices?page=1&pageSize=100&sortBy=invoiceDate
        [HttpGet]
        public async Task<IActionResult> GetInvoices(
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 100,
    [FromQuery] string? currency = null,
    [FromQuery] string sortBy = "invoiceDate") // 👈 sorting parameter
        {
            var result = await _service.GetInvoicesWithMetaAsync(page, pageSize, currency, sortBy);
            return Ok(result);
        }


    }
}
