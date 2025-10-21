# MongoDB Connection Test Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MongoDB Connection Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB service is running
Write-Host "1. Checking MongoDB Service..." -ForegroundColor Yellow
$mongodbService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue

if ($mongodbService) {
    Write-Host "✅ MongoDB service found" -ForegroundColor Green
    if ($mongodbService.Status -eq "Running") {
        Write-Host "✅ MongoDB service is RUNNING" -ForegroundColor Green
    } else {
        Write-Host "❌ MongoDB service is NOT running (Status: $($mongodbService.Status))" -ForegroundColor Red
        Write-Host "Starting MongoDB service..." -ForegroundColor Yellow
        Start-Service -Name "MongoDB"
        Start-Sleep -Seconds 3
        $mongodbService = Get-Service -Name "MongoDB"
        if ($mongodbService.Status -eq "Running") {
            Write-Host "✅ MongoDB service started successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to start MongoDB service" -ForegroundColor Red
        }
    }
} else {
    Write-Host "❌ MongoDB service not found" -ForegroundColor Red
    Write-Host "Please install MongoDB Community Server" -ForegroundColor Yellow
}

Write-Host ""

# Check MongoDB processes
Write-Host "2. Checking MongoDB Processes..." -ForegroundColor Yellow
$mongodbProcesses = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
if ($mongodbProcesses) {
    Write-Host "✅ MongoDB processes found:" -ForegroundColor Green
    $mongodbProcesses | ForEach-Object {
        Write-Host "   - PID: $($_.Id), CPU: $($_.CPU), Memory: $([math]::Round($_.WorkingSet64/1MB, 2)) MB" -ForegroundColor Green
    }
} else {
    Write-Host "❌ No MongoDB processes found" -ForegroundColor Red
}

Write-Host ""

# Test connection
Write-Host "3. Testing MongoDB Connection..." -ForegroundColor Yellow
try {
    # Try to connect using .NET MongoDB driver
    Add-Type -Path "C:\Program Files\dotnet\shared\Microsoft.NETCore.App\*\MongoDB.Driver.dll" -ErrorAction SilentlyContinue
    
    $connectionString = "mongodb://localhost:27017"
    Write-Host "Testing connection to: $connectionString" -ForegroundColor Gray
    
    # Simple connection test
    $client = New-Object MongoDB.Driver.MongoClient($connectionString)
    $database = $client.GetDatabase("admin")
    $result = $database.RunCommand([MongoDB.Bson.BsonDocument]::Parse('{"ping": 1}'))
    
    Write-Host "✅ MongoDB connection successful!" -ForegroundColor Green
    Write-Host "✅ API should be able to connect to MongoDB" -ForegroundColor Green
    
} catch {
    Write-Host "❌ MongoDB connection failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "4. Alternative Connection Tests..." -ForegroundColor Yellow
    
    # Test different ports
    $ports = @(27017, 27018, 27019)
    foreach ($port in $ports) {
        try {
            $testConnectionString = "mongodb://localhost:$port"
            Write-Host "Testing port $port..." -ForegroundColor Gray
            $testClient = New-Object MongoDB.Driver.MongoClient($testConnectionString)
            $testDatabase = $testClient.GetDatabase("admin")
            $testResult = $testDatabase.RunCommand([MongoDB.Bson.BsonDocument]::Parse('{"ping": 1}'))
            Write-Host "✅ MongoDB found on port $port" -ForegroundColor Green
            Write-Host "   Update connection string to: $testConnectionString" -ForegroundColor Yellow
            break
        } catch {
            Write-Host "❌ Port $port failed" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Troubleshooting Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. If MongoDB is running, restart your API" -ForegroundColor White
Write-Host "2. If connection failed, check MongoDB logs" -ForegroundColor White
Write-Host "3. Verify Windows Firewall settings" -ForegroundColor White
Write-Host "4. Try connecting with MongoDB Compass first" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to continue"
