# Microsoft 365 Login Integration

## Overview

This document outlines the Microsoft 365 login integration implemented for the OneUp Dashboard application using MSAL (Microsoft Authentication Library) and the provided Azure AD app registration.

## Configuration

### Backend Configuration (appsettings.json)

The Azure AD configuration has been updated with your provided credentials:

```json
"AzureAd": {
  "TenantId": "758534da-3ea2-42b7-a22c-2824e941888d",
  "ClientId": "dd96bb73-e274-4fe8-8e88-c160d73521c9",
  "ObjectId": "5a075c5e-47ca-4df2-970a-2af03f7fe9a9",
  "ClientSecret": "3f860372-4bba-418d-973d-0923fea5616d",
  "RedirectUri": "http://localhost:5173/auth/callback",
  "Authority": "https://login.microsoftonline.com/758534da-3ea2-42b7-a22c-2824e941888d",
  "GraphEndpoint": "https://graph.microsoft.com/v1.0"
}
```

### Frontend Configuration (MSAL)

The frontend uses MSAL Browser and MSAL React for authentication:

- **Authority**: Microsoft login endpoint
- **Client ID**: Your registered application ID
- **Redirect URI**: Frontend callback URL
- **Scopes**: User.Read, GroupMember.Read.All

## Architecture

### Authentication Flow

1. User clicks "Sign in with Microsoft 365" button
2. MSAL popup opens Microsoft login page
3. User authenticates with Microsoft 365 credentials
4. MSAL returns access token to frontend
5. Frontend sends token to backend `/api/auth/exchange-token` endpoint
6. Backend validates token with Microsoft Graph API
7. Backend generates internal JWT token
8. Frontend stores JWT token for API calls

### Key Components

#### Backend

- **AuthController.cs**: Handles authentication endpoints including token exchange
- **Program.cs**: Configured with JWT authentication middleware
- **Token Exchange**: Validates Microsoft tokens and generates internal JWTs

#### Frontend

- **main.jsx**: Wraps app with MsalProvider
- **AuthContext.jsx**: Manages authentication state and MSAL integration
- **Login.jsx**: Provides Microsoft 365 login interface
- **msalConfig.js**: Configured with your Azure AD app details

## Running the Application

### Prerequisites

1. Both frontend and backend servers running
2. Azure AD app registration properly configured
3. Required permissions granted (User.Read, GroupMember.Read.All)

### Backend

```bash
cd OneUpDashboard.Api
dotnet run
```

- Runs on https://localhost:7000

### Frontend

```bash
cd oneup-dashboard-frontend
npm run dev
```

- Runs on http://localhost:5173

## Authentication Features

### Microsoft 365 Login

- Single Sign-On (SSO) with Microsoft 365
- Organization member validation
- User profile information extraction
- Secure token exchange

### Security

- JWT tokens for API authentication
- Microsoft Graph API integration
- Organization-based access control
- Secure token storage

### User Experience

- Popup-based authentication (no redirects)
- Seamless login/logout flow
- User profile display in sidebar
- Protected route implementation

## API Endpoints

### Authentication Endpoints

- `GET /api/auth/login` - Get Microsoft OAuth URL (legacy)
- `POST /api/auth/exchange-token` - Exchange Microsoft token for JWT
- `POST /api/auth/callback` - Handle OAuth callback (legacy)
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

## Troubleshooting

### Common Issues

1. **Invalid Client Configuration**: Verify Azure AD app settings
2. **Token Exchange Failed**: Check backend logs for detailed errors
3. **CORS Issues**: Ensure CORS is configured for localhost:5173
4. **Permission Denied**: Verify Azure AD app has required permissions

### Debug Steps

1. Check browser console for MSAL errors
2. Check backend logs for token validation issues
3. Verify Azure AD app registration settings
4. Test with browser developer tools

## Security Considerations

1. **Token Security**: JWTs contain user claims and expire after 8 hours
2. **Organization Access**: Only ITCS organization members can access
3. **HTTPS**: Use HTTPS in production environments
4. **Client Secret**: Keep Azure AD client secret secure
5. **Token Storage**: Tokens stored in localStorage (consider sessionStorage for enhanced security)

## Next Steps

1. Test the login flow with your Microsoft 365 account
2. Verify organization access control works correctly
3. Configure production URLs and HTTPS
4. Monitor authentication logs for any issues
5. Consider implementing refresh token logic for longer sessions
