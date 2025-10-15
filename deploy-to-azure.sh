# Azure CLI Deployment Script for OneUp Dashboard
# Run this script to deploy your application to Azure

#!/bin/bash

# Configuration
RESOURCE_GROUP="oneup-dashboard-rg"
LOCATION="East US"
BACKEND_APP_NAME="oneup-dashboard-api"
FRONTEND_APP_NAME="oneup-dashboard-frontend"
APP_SERVICE_PLAN="oneup-dashboard-plan"
STATIC_WEB_APP_NAME="oneup-dashboard-swa"

echo "🚀 Starting Azure deployment for OneUp Dashboard..."

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Login to Azure (if not already logged in)
echo "🔐 Checking Azure login status..."
if ! az account show &> /dev/null; then
    echo "Please log in to Azure..."
    az login
fi

# Create resource group
echo "📦 Creating resource group..."
az group create \
    --name $RESOURCE_GROUP \
    --location "$LOCATION"

# Create App Service Plan
echo "🏗️ Creating App Service Plan..."
az appservice plan create \
    --name $APP_SERVICE_PLAN \
    --resource-group $RESOURCE_GROUP \
    --location "$LOCATION" \
    --sku B1 \
    --is-linux

# Create Web App for API
echo "🌐 Creating Web App for API..."
az webapp create \
    --name $BACKEND_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --plan $APP_SERVICE_PLAN \
    --runtime "DOTNETCORE|8.0"

# Configure CORS for the API
echo "🔧 Configuring CORS..."
az webapp cors add \
    --name $BACKEND_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --allowed-origins "https://$FRONTEND_APP_NAME.azurestaticapps.net"

# Create Static Web App
echo "📱 Creating Static Web App..."
az staticwebapp create \
    --name $STATIC_WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --location "$LOCATION" \
    --source "https://github.com/yourusername/OneUpDashboard" \
    --branch "main" \
    --app-location "oneup-dashboard-frontend" \
    --output-location "dist"

echo "✅ Azure resources created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Configure environment variables in Azure App Service"
echo "2. Set up MongoDB Atlas connection string"
echo "3. Configure Azure AD settings"
echo "4. Deploy your code using Azure DevOps or GitHub Actions"
echo ""
echo "🔗 Resource URLs:"
echo "API: https://$BACKEND_APP_NAME.azurewebsites.net"
echo "Frontend: https://$STATIC_WEB_APP_NAME.azurestaticapps.net"
