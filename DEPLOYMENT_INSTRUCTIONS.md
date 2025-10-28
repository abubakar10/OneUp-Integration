# 🚀 OneUp Dashboard - Quick Deployment Guide

## ✅ Build Status
- ✅ .NET API built successfully (`OneUpDashboard.Api/publish/`)
- ✅ React Frontend built successfully (`oneup-dashboard-frontend/dist/`)
- ✅ Deployment packages created:
  - `api-deployment.zip` - Ready for Azure App Service
  - `frontend-deployment.zip` - Ready for Azure Static Web Apps

## 🎯 Deployment Options

### Option 1: Manual Deployment via Azure Portal (Quickest)

#### Deploy API to App Service:
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your App Service (likely named similar to `oneup-dashboard-api`)
3. Go to **Deployment Center** → **ZIP Deploy**
4. Upload `api-deployment.zip`
5. Wait for deployment to complete

#### Deploy Frontend to Static Web App:
1. In Azure Portal, go to your Static Web App: `black-sky-06e804f00`
2. Go to **Overview** → **Manage deployment token**
3. Copy the deployment token
4. Use GitHub Actions or manual upload via the portal

### Option 2: Install Azure CLI and Deploy

```powershell
# Install Azure CLI
winget install Microsoft.AzureCLI

# Login to Azure
az login

# Deploy API
az webapp deployment source config-zip --resource-group oneup-dashboard-rg --name your-api-app-name --src api-deployment.zip

# Deploy Frontend (if you have the deployment token)
# This requires the Static Web Apps CLI
npm install -g @azure/static-web-apps-cli
swa deploy ./oneup-dashboard-frontend/dist --deployment-token YOUR_DEPLOYMENT_TOKEN
```

### Option 3: Install Azure PowerShell Module

```powershell
# Install Azure PowerShell (run as Administrator)
Install-Module -Name Az -AllowClobber -Force

# Then run the deployment script
.\deploy-to-azure.ps1
```

## 🔧 Configuration Updates Needed

After deployment, update these settings in Azure Portal:

### App Service Configuration:
Go to **App Service** → **Configuration** → **Application settings**

```
ConnectionStrings__MongoDB = mongodb://abbkr-server:6xIrSWqYJ7T5GSbatZlsIkswjBRU7MRBWfam3F9zK56sXmDVTQD1v9bHeZek6IPA0rR1BaC53W9vACDbIL6JyQ%3D%3D@abbkr-server.mongo.cosmos.azure.com:10255/?authSource=OneUpDashboard&tls=true&tlsInsecure=true&retrywrites=false

MongoDB__DatabaseName = OneUpDashboard

AzureAd__TenantId = [Your Azure AD Tenant ID]
AzureAd__ClientId = [Your Azure AD Client ID]
AzureAd__ClientSecret = [Your Azure AD Client Secret]
AzureAd__RedirectUri = https://black-sky-06e804f00.3.azurestaticapps.net/login
AzureAd__Authority = https://login.microsoftonline.com/[Your-Tenant-ID]

Jwt__Key = OneUpDashboard_SuperSecretKey_2024_ForJWTTokenGeneration_MustBeAtLeast32Characters
Jwt__Issuer = OneUpDashboard.Api
Jwt__Audience = OneUpDashboard.Frontend

ASPNETCORE_ENVIRONMENT = Production
```

### CORS Configuration:
In **App Service** → **CORS**, add:
- `https://black-sky-06e804f00.3.azurestaticapps.net`

## 🧪 Testing After Deployment

1. **Test API Health:**
   ```
   https://your-api-app-name.azurewebsites.net/api/test/debug-status
   ```

2. **Test Frontend:**
   ```
   https://black-sky-06e804f00.3.azurestaticapps.net
   ```

## 📋 Next Steps

1. Deploy using one of the options above
2. Configure the application settings in Azure Portal
3. Test the endpoints
4. Set up custom domain (optional)
5. Configure monitoring and alerts

## 🆘 Need Help?

If you encounter issues:
1. Check Azure Portal logs: **App Service** → **Log stream**
2. Review Application Insights (if enabled)
3. Verify all configuration settings match the requirements

---

**Your applications are ready to deploy!** 🎉
