# Dockerfile for OneUp Dashboard API
# Multi-stage build for production deployment

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files
COPY ["OneUpDashboard.Api/OneUpDashboard.Api.csproj", "OneUpDashboard.Api/"]
RUN dotnet restore "OneUpDashboard.Api/OneUpDashboard.Api.csproj"

# Copy all source files
COPY . .
WORKDIR "/src/OneUpDashboard.Api"

# Build the application
RUN dotnet build "OneUpDashboard.Api.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "OneUpDashboard.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy published application
COPY --from=publish /app/publish .

# Expose port
EXPOSE 8080

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
ENTRYPOINT ["dotnet", "OneUpDashboard.Api.dll"]
