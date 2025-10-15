# OneUp Dashboard - Azure Deployment Guide

This comprehensive guide will help you deploy your OneUp Dashboard application to Azure, including the .NET API backend, React frontend, and MongoDB Atlas database.

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] Azure account with active subscription
- [ ] Azure CLI installed ([Download here](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
- [ ] Git repository with your code
- [ ] MongoDB Atlas account
- [ ] Visual Studio Code or similar IDE

## 🗄️ Part 1: MongoDB Atlas Setup

### Step 1: Create MongoDB Atlas Cluster

1. **Go to [MongoDB Atlas](https://www.mongodb.com/atlas)**
2. **Sign up/Login** to your account
3. **Create a new cluster:**
   - Choose **M0 Sandbox** (Free tier) for development
   - Select **AWS** as provider
   - Choose **US East (N. Virginia)** region
   - Click **Create Cluster**

### Step 2: Configure Database Access

1. **Create Database User:**

   - Go to **Database Access** → **Add New Database User**
   - Choose **Password** authentication
   - Username: `oneup_dashboard_user`
   - Password: Generate a strong password
   - Database User Privileges: **Read and write to any database**
   - Click **Add User**

2. **Configure Network Access:**
   - Go to **Network Access** → **Add IP Address**
   - Click **Allow Access from Anywhere** (0.0.0.0/0)
   - Click **Confirm**

### Step 3: Get Connection String

1. **Go to Clusters** → Click **Connect**
2. **Choose "Connect your application"**
3. **Copy the connection string** (it looks like):
   ```
   mongodb+srv://username:password@cluster.mongodb.net/
   ```
4. **Replace `<password>`** with your actual password
5. **Save this connection string** - you'll need it later

## ☁️ Part 2: Azure Resources Setup

### Step 1: Create Resource Group

```bash
# Login to Azure
az login

# Create resource group
az group create --name oneup-dashboard-rg --location "East US"
```

### Step 2: Deploy Backend API

#### Option A: Using Azure CLI (Recommended)

```bash
# Create App Service Plan
az appservice plan create \
    --name oneup-dashboard-plan \
    --resource-group oneup-dashboard-rg \
    --location "East US" \
    --sku B1 \
    --is-linux

# Create Web App
az webapp create \
    --name oneup-dashboard-api \
    --resource-group oneup-dashboard-rg \
    --plan oneup-dashboard-plan \
    --runtime "DOTNETCORE|8.0"
```

#### Option B: Using PowerShell Script

Run the provided `deploy-to-azure.ps1` script:

```powershell
.\deploy-to-azure.ps1
```

### Step 3: Configure Environment Variables

1. **Go to Azure Portal** → **App Services** → **oneup-dashboard-api**
2. **Go to Configuration** → **Application settings**
3. **Add the following settings:**

```
ConnectionStrings__MongoDB = mongodb+srv://your-username:your-password@your-cluster.mongodb.net/
MongoDB__DatabaseName = OneUpDashboard
AzureAd__TenantId = 758534da-3ea2-42b7-a22c-2824e941888d
AzureAd__ClientId = dd96bb73-e274-4fe8-8e88-c160d73521c9
AzureAd__ObjectId = 5a075c5e-47ca-4df2-970a-2af03f7fe9a9
AzureAd__ClientSecret = 3f860372-4bba-418d-973d-0923fea5616d
AzureAd__RedirectUri = https://oneup-dashboard-frontend.azurestaticapps.net/login
AzureAd__Authority = https://login.microsoftonline.com/758534da-3ea2-42b7-a22c-2824e941888d
AzureAd__GraphEndpoint = https://graph.microsoft.com/v1.0
Jwt__Key = YourSuperSecretKeyThatIsAtLeast32CharactersLong!
Jwt__Issuer = OneUpDashboard.Api
Jwt__Audience = OneUpDashboard.Frontend
Cors__AllowedOrigins__0 = https://oneup-dashboard-frontend.azurestaticapps.net
ASPNETCORE_ENVIRONMENT = Production
WEBSITES_ENABLE_APP_SERVICE_STORAGE = false
```

4. **Click Save**

### Step 4: Deploy Frontend

#### Option A: Azure Static Web Apps (Recommended)

1. **Go to Azure Portal** → **Create a resource**
2. **Search for "Static Web Apps"** → **Create**
3. **Fill in the details:**

   - Subscription: Your subscription
   - Resource Group: `oneup-dashboard-rg`
   - Name: `oneup-dashboard-frontend`
   - Plan type: **Free**
   - Region: **East US 2**
   - Source: **GitHub** (if using GitHub) or **Other**
   - App location: `oneup-dashboard-frontend`
   - Output location: `dist`

4. **Configure GitHub integration** (if using GitHub):
   - Authorize Azure
   - Select your repository
   - Branch: `main` or `master`

#### Option B: Manual Deployment

```bash
# Build the frontend
cd oneup-dashboard-frontend
npm install
npm run build

# Deploy using Azure CLI
az webapp deployment source config-zip \
    --resource-group oneup-dashboard-rg \
    --name oneup-dashboard-frontend \
    --src ./dist.zip
```

## 🚀 Part 3: Automated Deployment with GitHub Actions

### Step 1: Set up GitHub Secrets

1. **Go to your GitHub repository** → **Settings** → **Secrets and variables** → **Actions**
2. **Add the following secrets:**

```
AZURE_WEBAPP_PUBLISH_PROFILE = [Get from Azure Portal → App Service → Get publish profile]
AZURE_STATIC_WEB_APPS_API_TOKEN = [Get from Azure Portal → Static Web App → Manage deployment token]
```

### Step 2: Enable GitHub Actions

1. **Push your code** to GitHub
2. **The workflow will automatically trigger** from `.github/workflows/azure-deploy.yml`
3. **Monitor the deployment** in the Actions tab

## 🔧 Part 4: Configuration Updates

### Update Azure AD Redirect URIs

1. **Go to Azure Portal** → **Azure Active Directory** → **App registrations**
2. **Find your app** (`dd96bb73-e274-4fe8-8e88-c160d73521c9`)
3. **Go to Authentication** → **Add URI:**
   - `https://oneup-dashboard-frontend.azurestaticapps.net/login`
4. **Save**

### Update CORS Settings

The CORS settings are already configured in the environment variables, but you can verify them in the Azure Portal under App Service Configuration.

## 📊 Part 5: Monitoring and Maintenance

### Enable Application Insights

1. **Go to Azure Portal** → **App Service** → **oneup-dashboard-api**
2. **Go to Application Insights** → **Turn on Application Insights**
3. **Create new resource** or use existing
4. **Enable monitoring**

### Set up Logging

1. **Go to App Service** → **Monitoring** → **Log stream**
2. **Enable Application Logging** in Configuration → Logging

### Database Monitoring

1. **Go to MongoDB Atlas** → **Monitoring**
2. **Set up alerts** for performance and usage

## 🔍 Part 6: Testing Your Deployment

### Test Backend API

```bash
# Test health endpoint
curl https://oneup-dashboard-api.azurewebsites.net/api/test

# Test authentication
curl https://oneup-dashboard-api.azurewebsites.net/api/auth/login
```

### Test Frontend

1. **Visit your Static Web App URL:**
   ```
   https://oneup-dashboard-frontend.azurestaticapps.net
   ```
2. **Test login functionality**
3. **Verify data loading**

## 🛠️ Troubleshooting

### Common Issues

1. **CORS Errors:**

   - Check CORS configuration in App Service
   - Verify frontend URL in allowed origins

2. **Database Connection Issues:**

   - Verify MongoDB connection string
   - Check network access in MongoDB Atlas
   - Ensure database user has correct permissions

3. **Authentication Issues:**

   - Verify Azure AD configuration
   - Check redirect URIs
   - Ensure client secret is correct

4. **Build Failures:**
   - Check GitHub Actions logs
   - Verify Node.js and .NET versions
   - Ensure all dependencies are installed

### Useful Commands

```bash
# Check App Service logs
az webapp log tail --name oneup-dashboard-api --resource-group oneup-dashboard-rg

# Restart App Service
az webapp restart --name oneup-dashboard-api --resource-group oneup-dashboard-rg

# Check deployment status
az webapp deployment list --name oneup-dashboard-api --resource-group oneup-dashboard-rg
```

## 📈 Part 7: Scaling and Optimization

### Performance Optimization

1. **Enable CDN** for Static Web Apps
2. **Configure caching** in App Service
3. **Optimize database queries**
4. **Use Application Insights** for performance monitoring

### Cost Optimization

1. **Use Free tiers** for development
2. **Monitor usage** in Azure Cost Management
3. **Set up billing alerts**
4. **Consider reserved instances** for production

## 🔐 Security Best Practices

1. **Use Key Vault** for sensitive configuration
2. **Enable HTTPS only**
3. **Regular security updates**
4. **Monitor access logs**
5. **Use managed identities** where possible

## 📞 Support

If you encounter issues:

1. **Check Azure Service Health**
2. **Review Application Insights**
3. **Check MongoDB Atlas status**
4. **Contact Azure Support** if needed

---

## 🎉 Congratulations!

Your OneUp Dashboard is now deployed to Azure!

**Your URLs:**

- Frontend: `https://oneup-dashboard-frontend.azurestaticapps.net`
- Backend API: `https://oneup-dashboard-api.azurewebsites.net`
- MongoDB: Your Atlas cluster

**Next Steps:**

1. Set up custom domain (optional)
2. Configure SSL certificates
3. Set up monitoring and alerts
4. Plan for backup and disaster recovery
