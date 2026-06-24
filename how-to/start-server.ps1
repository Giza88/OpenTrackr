# OpenTrackr — start local server and open browser
# Run: Right-click this file -> Run with PowerShell

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SiteFolder = Join-Path $ProjectRoot "website-development"
$Port = 8765
$Url = "http://127.0.0.1:$Port/index.html"

if (-not (Test-Path $SiteFolder)) {
    Write-Host "ERROR: website-development folder not found at:" -ForegroundColor Red
    Write-Host $SiteFolder
    Read-Host "Press Enter to close"
    exit 1
}

$PythonCmd = $null
foreach ($cmd in @("python", "py")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        $PythonCmd = $cmd
        break
    }
}

if (-not $PythonCmd) {
    Write-Host "ERROR: Python is not installed or not on your PATH." -ForegroundColor Red
    Write-Host "Install Python from https://www.python.org/downloads/ and tick 'Add Python to PATH'."
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host "OpenTrackr local server" -ForegroundColor Cyan
Write-Host "Site folder: $SiteFolder"
Write-Host "Starting server on $Url"
Write-Host ""
Write-Host "A new window will open for the server. Leave it open while you browse."
Write-Host "To stop: press Ctrl+C in that window, or close it."
Write-Host ""

$ServerCommand = "Set-Location -LiteralPath '$SiteFolder'; & '$PythonCmd' -m http.server $Port --bind 127.0.0.1"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $ServerCommand

Start-Sleep -Seconds 2
Start-Process $Url

Write-Host "Browser opened." -ForegroundColor Green
Write-Host "If the page does not load, wait a few seconds and refresh (Ctrl+F5)."
Write-Host ""
Read-Host "Press Enter to close this window (the server keeps running in the other window)"
