# PowerShell script to open the OneUp Dashboard Project Report
Write-Host "Opening OneUp Dashboard Project Report..." -ForegroundColor Green
Write-Host ""

$reportPath = Join-Path $PSScriptRoot "OneUpDashboard_Project_Report.html"

if (Test-Path $reportPath) {
    Write-Host "Report found at: $reportPath" -ForegroundColor Cyan
    Write-Host "Opening in default browser..." -ForegroundColor Yellow
    
    # Open the HTML file in the default browser
    Start-Process $reportPath
    
    Write-Host ""
    Write-Host "To convert to PDF:" -ForegroundColor Magenta
    Write-Host "1. Press Ctrl+P in your browser" -ForegroundColor White
    Write-Host "2. Select Save as PDF" -ForegroundColor White
    Write-Host "3. Set margins to Minimum" -ForegroundColor White
    Write-Host "4. Enable Background graphics" -ForegroundColor White
    Write-Host "5. Click Save" -ForegroundColor White
    Write-Host ""
    Write-Host "Report opened successfully!" -ForegroundColor Green
}
else {
    Write-Host "Report file not found at: $reportPath" -ForegroundColor Red
    Write-Host "Please ensure the OneUpDashboard_Project_Report.html file exists." -ForegroundColor Yellow
}