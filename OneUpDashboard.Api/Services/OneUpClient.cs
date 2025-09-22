
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace OneUpDashboard.Api.Services
{
    public class OneUpClient
    {
        private readonly HttpClient _httpClient;
        private readonly Dictionary<int, string> _employeeCache = new();
        private DateTime _cacheLastUpdated = DateTime.MinValue;
        private readonly TimeSpan _cacheExpiration = TimeSpan.FromMinutes(30);
        private readonly SemaphoreSlim _requestSemaphore = new(2); // Limit to 2 concurrent requests

        public OneUpClient()
        {
            var apiEmail = "api_7299_8176@api.oneup.com";
            var apiKey = "c8c8bc697bed6f5debbae9d6ab705e9cf111598e";

            _httpClient = new HttpClient();
            _httpClient.Timeout = TimeSpan.FromSeconds(60); // Increase timeout for slow OneUp API
            var byteArray = Encoding.ASCII.GetBytes($"{apiEmail}:{apiKey}");
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Basic", Convert.ToBase64String(byteArray));
            _httpClient.BaseAddress = new Uri("https://api.oneup.com/v1/");
        }

        /// <summary>
        /// Fetch a specific page of invoices using offset + limit with retry logic
        /// </summary>
        public async Task<string> GetInvoicesPageAsync(int page = 1, int limit = 100)
        {
            await _requestSemaphore.WaitAsync(); // Throttle concurrent requests
            try
            {
                int offset = (page - 1) * limit;
                var url = $"invoices?offset={offset}&limit={limit}";
                
                const int maxRetries = 1; // Reduce retries to prevent overwhelming API
                var baseDelay = TimeSpan.FromSeconds(2);
                
                for (int attempt = 0; attempt <= maxRetries; attempt++)
            {
                try
                {
                    Console.WriteLine($"OneUp API Call (attempt {attempt + 1}): {url}");
                    
                    var response = await _httpClient.GetAsync(url);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        var content = await response.Content.ReadAsStringAsync();
                        Console.WriteLine($"OneUp API Response: Got {content.Length} characters");
                        return content;
                    }
                    else if (response.StatusCode == System.Net.HttpStatusCode.BadGateway ||
                             response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable ||
                             response.StatusCode == System.Net.HttpStatusCode.GatewayTimeout)
                    {
                        // These are retryable errors
                        if (attempt < maxRetries)
                        {
                            var delay = TimeSpan.FromMilliseconds(baseDelay.TotalMilliseconds * Math.Pow(2, attempt));
                            Console.WriteLine($"API returned {response.StatusCode}, retrying in {delay.TotalSeconds}s...");
                            await Task.Delay(delay);
                            continue;
                        }
                    }
                    
                    response.EnsureSuccessStatusCode(); // This will throw for non-success status
                }
                catch (HttpRequestException ex) when (attempt < maxRetries)
                {
                    var delay = TimeSpan.FromMilliseconds(baseDelay.TotalMilliseconds * Math.Pow(2, attempt));
                    Console.WriteLine($"API request failed: {ex.Message}, retrying in {delay.TotalSeconds}s...");
                    await Task.Delay(delay);
                }
                catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException && attempt < maxRetries)
                {
                    var delay = TimeSpan.FromMilliseconds(baseDelay.TotalMilliseconds * Math.Pow(2, attempt));
                    Console.WriteLine($"API request timed out, retrying in {delay.TotalSeconds}s...");
                    await Task.Delay(delay);
                }
            }
            
                throw new HttpRequestException($"Failed to fetch invoices after {maxRetries + 1} attempts");
            }
            finally
            {
                _requestSemaphore.Release(); // Always release the semaphore
            }
        }

        /// <summary>
        /// Fetch single employee by ID with caching
        /// </summary>
        public async Task<string> GetEmployeeNameByIdAsync(int employeeId)
        {
            // Check cache first
            if (_employeeCache.ContainsKey(employeeId) && 
                DateTime.Now - _cacheLastUpdated < _cacheExpiration)
            {
                return _employeeCache[employeeId];
            }

            try
            {
                var response = await _httpClient.GetAsync($"employees/{employeeId}");
                response.EnsureSuccessStatusCode();
                var raw = await response.Content.ReadAsStringAsync();

                var parsed = JsonSerializer.Deserialize<JsonElement>(raw);
                if (parsed.ValueKind == JsonValueKind.Object)
                {
                    // OneUp API returns first_name and last_name separately
                    var firstName = "";
                    var lastName = "";
                    
                    if (parsed.TryGetProperty("first_name", out var firstNameProp))
                        firstName = firstNameProp.GetString() ?? "";
                    
                    if (parsed.TryGetProperty("last_name", out var lastNameProp))
                        lastName = lastNameProp.GetString() ?? "";
                    
                    // Combine first and last name
                    var fullName = $"{firstName} {lastName}".Trim();
                    var result = !string.IsNullOrEmpty(fullName) ? fullName : "Unknown";
                    
                    // Cache the result
                    _employeeCache[employeeId] = result;
                    _cacheLastUpdated = DateTime.Now;
                    
                    return result;
                }
            }
            catch
            {
                // fallback if API fails
            }

            var fallback = "Unknown";
            _employeeCache[employeeId] = fallback;
            return fallback;
        }

        /// <summary>
        /// Bulk fetch all employees and cache them
        /// </summary>
        public async Task PreloadEmployeeCacheAsync()
        {
            try
            {
                // Fetch all employees in one call
                var response = await _httpClient.GetAsync("employees?limit=1000");
                response.EnsureSuccessStatusCode();
                var raw = await response.Content.ReadAsStringAsync();

                var parsed = JsonSerializer.Deserialize<JsonElement>(raw);
                if (parsed.ValueKind == JsonValueKind.Array)
                {
                    foreach (var employee in parsed.EnumerateArray())
                    {
                        if (employee.TryGetProperty("id", out var idProp) && 
                            idProp.ValueKind == JsonValueKind.Number)
                        {
                            var employeeId = idProp.GetInt32();
                            var firstName = "";
                            var lastName = "";
                            
                            if (employee.TryGetProperty("first_name", out var firstNameProp))
                                firstName = firstNameProp.GetString() ?? "";
                            
                            if (employee.TryGetProperty("last_name", out var lastNameProp))
                                lastName = lastNameProp.GetString() ?? "";
                            
                            var fullName = $"{firstName} {lastName}".Trim();
                            _employeeCache[employeeId] = !string.IsNullOrEmpty(fullName) ? fullName : "Unknown";
                        }
                    }
                    
                    _cacheLastUpdated = DateTime.Now;
                }
            }
            catch
            {
                // If bulk fetch fails, individual calls will still work
            }
        }
    }
}
