# Azure PowerShell Deployment Script for OneUp Dashboard
# Run this script in PowerShell to deploy your application to Azure

# Configuration
$ResourceGroup = "oneup-dashboard-rg"
$Location = "East US"
$BackendAppName = "oneup-dashboard-api"
$FrontendAppName = "oneup-dashboard-frontend"
$AppServicePlan = "oneup-dashboard-plan"
$StaticWebAppName = "oneup-dashboard-swa"

Write-Host "🚀 Starting Azure deployment for OneUp Dashboard..." -ForegroundColor Green

# Check if Azure PowerShell module is installed
if (-not (Get-Module -ListAvailable -Name Az)) {
    Write-Host "❌ Azure PowerShell module is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "Install-Module -Name Az -AllowClobber" -ForegroundColor Yellow
    exit 1
}

# Login to Azure (if not already logged in)
Write-Host "🔐 Checking Azure login status..." -ForegroundColor Blue
try {
    $context = Get-AzContext
    if (-not $context) {
        Write-Host "Please log in to Azure..." -ForegroundColor Yellow
        Connect-AzAccount
    }
}
catch {
    Write-Host "Please log in to Azure..." -ForegroundColor Yellow
    Connect-AzAccount
}

# Create resource group
Write-Host "📦 Creating resource group..." -ForegroundColor Blue
New-AzResourceGroup -Name $ResourceGroup -Location $Location -Force

# Create App Service Plan
Write-Host "🏗️ Creating App Service Plan..." -ForegroundColor Blue
New-AzAppServicePlan -Name $AppServicePlan -ResourceGroupName $ResourceGroup -Location $Location -Tier "Basic" -NumberofWorkers 1 -WorkerSize "Small" -Linux

# Create Web App for API
Write-Host "🌐 Creating Web App for API..." -ForegroundColor Blue
New-AzWebApp -Name $BackendAppName -ResourceGroupName $ResourceGroup -AppServicePlan $AppServicePlan -RuntimeStack "DOTNETCORE|8.0"

# Configure CORS for the API
Write-Host "🔧 Configuring CORS..." -ForegroundColor Blue
$corsRule = @{
    AllowedOrigins     = @("https://$FrontendAppName.azurestaticapps.net")
    SupportCredentials = $false
}
Set-AzWebApp -Name $BackendAppName -ResourceGroupName $ResourceGroup -CorsRules $corsRule

# Create Static Web App
Write-Host "📱 Creating Static Web App..." -ForegroundColor Blue
New-AzStaticWebApp -Name $StaticWebAppName -ResourceGroupName $ResourceGroup -Location $Location -RepositoryUrl "https://github.com/yourusername/OneUpDashboard" -Branch "main" -AppLocation "oneup-dashboard-frontend" -OutputLocation "dist"

Write-Host "✅ Azure resources created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure environment variables in Azure App Service" -ForegroundColor White
Write-Host "2. Set up MongoDB Atlas connection string" -ForegroundColor White
Write-Host "3. Configure Azure AD settings" -ForegroundColor White
Write-Host "4. Deploy your code using Azure DevOps or GitHub Actions" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Resource URLs:" -ForegroundColor Yellow
Write-Host "API: https://$BackendAppName.azurewebsites.net" -ForegroundColor White
Write-Host "Frontend: https://$StaticWebAppName.azurestaticapps.net" -ForegroundColor White
