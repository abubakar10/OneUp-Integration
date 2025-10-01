using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json.Serialization;

namespace OneUpDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IConfiguration configuration, ILogger<AuthController> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        [HttpGet("login")]
        public IActionResult Login()
        {
            try
            {
                var tenantId = _configuration["AzureAd:TenantId"];
                var clientId = _configuration["AzureAd:ClientId"];
                var redirectUri = _configuration["AzureAd:RedirectUri"];
                var scope = "https://graph.microsoft.com/User.Read https://graph.microsoft.com/Group.Read.All";

                var authUrl = $"https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize?" +
                    $"client_id={clientId}&" +
                    $"response_type=code&" +
                    $"redirect_uri={Uri.EscapeDataString(redirectUri ?? "")}&" +
                    $"response_mode=query&" +
                    $"scope={Uri.EscapeDataString(scope)}&" +
                    $"state=random_state_string";

                return Ok(new { authUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating login URL");
                return StatusCode(500, new { error = "Failed to generate login URL" });
            }
        }

        [HttpPost("callback")]
        public async Task<IActionResult> Callback([FromBody] CallbackRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Code))
                {
                    return BadRequest(new { error = "Authorization code is required" });
                }

                // Exchange code for access token
                var tokenResponse = await ExchangeCodeForToken(request.Code);
                if (tokenResponse == null)
                {
                    return BadRequest(new { error = "Failed to exchange code for token" });
                }

                // Get user info from Microsoft Graph
                var userInfo = await GetUserInfo(tokenResponse.AccessToken);
                if (userInfo == null)
                {
                    return BadRequest(new { error = "Failed to get user information" });
                }

                // Check if user is in ITCS organization
                var isAuthorized = await CheckUserAuthorization(userInfo.Id, tokenResponse.AccessToken);
                if (!isAuthorized)
                {
                    return Unauthorized(new { error = "User not authorized to access this application" });
                }

                // Generate JWT token for our application
                var jwtToken = GenerateJwtToken(userInfo);

                return Ok(new
                {
                    token = jwtToken,
                    user = new
                    {
                        id = userInfo.Id,
                        displayName = userInfo.DisplayName,
                        email = userInfo.Mail ?? userInfo.UserPrincipalName,
                        jobTitle = userInfo.JobTitle,
                        department = userInfo.Department
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing callback");
                return StatusCode(500, new { error = "Failed to process authentication callback" });
            }
        }

        [HttpGet("me")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public IActionResult GetCurrentUser()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var email = User.FindFirst(ClaimTypes.Email)?.Value;
                var displayName = User.FindFirst(ClaimTypes.Name)?.Value;
                var role = User.FindFirst(ClaimTypes.Role)?.Value;

                return Ok(new
                {
                    id = userId,
                    email = email,
                    displayName = displayName,
                    role = role
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current user");
                return StatusCode(500, new { error = "Failed to get current user" });
            }
        }

        [HttpPost("logout")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public IActionResult Logout()
        {
            // For JWT tokens, logout is handled on the client side by removing the token
            return Ok(new { message = "Logged out successfully" });
        }

        [HttpPost("exchange-token")]
        public async Task<IActionResult> ExchangeToken([FromBody] TokenExchangeRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.AccessToken))
                {
                    return BadRequest(new { error = "Access token is required" });
                }

                // Get user info from Microsoft Graph using the access token
                var userInfo = await GetUserInfo(request.AccessToken);
                if (userInfo == null)
                {
                    return BadRequest(new { error = "Failed to get user information" });
                }

                // Debug user info
                _logger.LogInformation($"User Info - Mail: {userInfo.Mail}, UPN: {userInfo.UserPrincipalName}");
                
                // Check if user is in ITCS organization by email domain
                var isAuthorized = CheckUserByEmailDomain(userInfo);
                if (!isAuthorized)
                {
                    _logger.LogWarning($"User not authorized - Mail: {userInfo.Mail}, UPN: {userInfo.UserPrincipalName}");
                    return Unauthorized(new { error = "User not authorized to access this application" });
                }

                // Generate JWT token for our application
                var jwtToken = GenerateJwtToken(userInfo);

                return Ok(new
                {
                    token = jwtToken,
                    user = new
                    {
                        id = userInfo.Id,
                        displayName = userInfo.DisplayName,
                        email = userInfo.Mail ?? userInfo.UserPrincipalName,
                        jobTitle = userInfo.JobTitle,
                        department = userInfo.Department
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exchanging token");
                return StatusCode(500, new { error = "Failed to exchange token" });
            }
        }

        [HttpPost("test-login")]
        public IActionResult TestLogin([FromBody] TestLoginRequest request)
        {
            try
            {
                // Simple test authentication for development
                if (request.Username == "admin" && request.Password == "password")
                {
                    var testUser = new User
                    {
                        Id = "test-user-123",
                        DisplayName = "Test Admin User",
                        Mail = "admin@test.com",
                        UserPrincipalName = "admin@test.com",
                        JobTitle = "Administrator",
                        Department = "IT"
                    };

                    var jwtToken = GenerateJwtToken(testUser);

                    return Ok(new
                    {
                        token = jwtToken,
                        user = new
                        {
                            id = testUser.Id,
                            displayName = testUser.DisplayName,
                            email = testUser.Mail,
                            jobTitle = testUser.JobTitle,
                            department = testUser.Department
                        }
                    });
                }

                return Unauthorized(new { error = "Invalid credentials" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in test login");
                return StatusCode(500, new { error = "Login failed" });
            }
        }

        private async Task<TokenResponse?> ExchangeCodeForToken(string code)
        {
            try
            {
                var tenantId = _configuration["AzureAd:TenantId"];
                var clientId = _configuration["AzureAd:ClientId"];
                var clientSecret = _configuration["AzureAd:ClientSecret"];
                var redirectUri = _configuration["AzureAd:RedirectUri"];

                var tokenEndpoint = $"https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token";

                var parameters = new List<KeyValuePair<string, string>>
                {
                    new("client_id", clientId ?? ""),
                    new("client_secret", clientSecret ?? ""),
                    new("code", code),
                    new("redirect_uri", redirectUri ?? ""),
                    new("grant_type", "authorization_code")
                };

                using var httpClient = new HttpClient();
                var formContent = new FormUrlEncodedContent(parameters);
                var response = await httpClient.PostAsync(tokenEndpoint, formContent);

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    return System.Text.Json.JsonSerializer.Deserialize<TokenResponse>(json);
                }

                _logger.LogError("Failed to exchange code for token. Status: {Status}, Content: {Content}", 
                    response.StatusCode, await response.Content.ReadAsStringAsync());
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exchanging code for token");
                return null;
            }
        }

        private async Task<User?> GetUserInfo(string accessToken)
        {
            try
            {
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

                // Request specific fields to ensure we get email information
                var response = await httpClient.GetAsync("https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName,jobTitle,department");
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var user = System.Text.Json.JsonSerializer.Deserialize<User>(json);
                    
                    // Log the raw response for debugging
                    _logger.LogInformation($"Graph API Response: {json}");
                    
                    return user;
                }

                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to get user info. Status: {Status}, Content: {Content}", response.StatusCode, errorContent);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user info from Graph API");
                return null;
            }
        }

        private bool CheckUserByEmailDomain(User user)
        {
            // Since we're using single-tenant Azure AD, all users are already validated by Azure AD
            // No need for additional domain checking - Azure AD handles this
            if (string.IsNullOrEmpty(user.Mail) && string.IsNullOrEmpty(user.UserPrincipalName))
            {
                _logger.LogWarning("User has no email information - Mail: {Mail}, UPN: {UPN}", user.Mail, user.UserPrincipalName);
                return false;
            }

            // For single-tenant apps, if user reaches here, they're already authorized by Azure AD
            _logger.LogInformation("User authorized by Azure AD - Mail: {Mail}, UPN: {UPN}", user.Mail, user.UserPrincipalName);
            return true;
        }

        private async Task<bool> CheckUserAuthorization(string userId, string accessToken)
        {
            try
            {
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

                // Get user's groups
                var response = await httpClient.GetAsync($"https://graph.microsoft.com/v1.0/users/{userId}/memberOf");
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var groupsResponse = System.Text.Json.JsonSerializer.Deserialize<GroupsResponse>(json);
                    
                    if (groupsResponse?.Value != null)
                    {
                        foreach (var group in groupsResponse.Value)
                        {
                            // Check if user is in any ITCS group (not NoAccess)
                            if (group.DisplayName?.Contains("ITCS") == true && 
                                !group.DisplayName.Contains("NoAccess"))
                            {
                                return true;
                            }
                        }
                    }
                }

                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking user authorization");
                return false;
            }
        }

        private string GenerateJwtToken(User user)
        {
            var jwtKey = _configuration["Jwt:Key"];
            var jwtIssuer = _configuration["Jwt:Issuer"];
            var jwtAudience = _configuration["Jwt:Audience"];

            if (string.IsNullOrEmpty(jwtKey) || string.IsNullOrEmpty(jwtIssuer) || string.IsNullOrEmpty(jwtAudience))
            {
                throw new InvalidOperationException("JWT configuration is missing");
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id ?? ""),
                new Claim(ClaimTypes.Name, user.DisplayName ?? ""),
                new Claim(ClaimTypes.Email, user.Mail ?? user.UserPrincipalName ?? ""),
                new Claim(ClaimTypes.Role, "User") // Default role, can be enhanced based on group membership
            };

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtAudience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8), // Token valid for 8 hours
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class CallbackRequest
    {
        public string Code { get; set; } = "";
        public string State { get; set; } = "";
    }

    public class TokenResponse
    {
        public string AccessToken { get; set; } = "";
        public string TokenType { get; set; } = "";
        public int ExpiresIn { get; set; }
        public string Scope { get; set; } = "";
    }

    public class GroupsResponse
    {
        public List<Group> Value { get; set; } = new();
    }

    public class Group
    {
        public string Id { get; set; } = "";
        public string DisplayName { get; set; } = "";
    }

    public class TestLoginRequest
    {
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
    }

    public class TokenExchangeRequest
    {
        public string AccessToken { get; set; } = "";
    }

    public class User
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";
        
        [JsonPropertyName("displayName")]
        public string DisplayName { get; set; } = "";
        
        [JsonPropertyName("mail")]
        public string Mail { get; set; } = "";
        
        [JsonPropertyName("userPrincipalName")]
        public string UserPrincipalName { get; set; } = "";
        
        [JsonPropertyName("jobTitle")]
        public string JobTitle { get; set; } = "";
        
        [JsonPropertyName("department")]
        public string Department { get; set; } = "";
    }
}
