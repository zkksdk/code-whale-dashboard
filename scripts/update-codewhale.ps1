# CodeWhale Update Script
# Downloads and installs the latest version from GitHub

param([switch]$Force)

$ErrorActionPreference = "Stop"
$repo = "Hmbown/CodeWhale"
$npmGlobal = npm root -g

Write-Host "=== CodeWhale Updater ===" -ForegroundColor Cyan

# Get current version
try {
    $current = (& codewhale-tui --version 2>&1 | Select-Object -First 1)
    Write-Host "Current: $current"
} catch {
    Write-Host "Current: not found"
}

# Get latest release
Write-Host "Fetching latest release..."
try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -TimeoutSec 15
    $latestVer = $release.tag_name
    $latestName = $release.name
    Write-Host "Latest: $latestVer - $latestName" -ForegroundColor Green
} catch {
    Write-Host "GitHub API error. Trying npm..." -ForegroundColor Yellow
    try {
        $info = npm view codewhale version 2>&1
        $latestVer = "v$info"
        Write-Host "Latest npm: $latestVer" -ForegroundColor Green
    } catch {
        Write-Host "Cannot determine latest version. Use -Force to install anyway."
        exit 1
    }
}

# Download and install
$tmpDir = "$env:TEMP\codewhale-update"
Write-Host "Cloning into $tmpDir..."
if (Test-Path $tmpDir) { Remove-Item -Recurse -Force $tmpDir }

git clone --depth 1 --branch $latestVer "https://github.com/$repo.git" $tmpDir
if (-not (Test-Path "$tmpDir\package.json")) {
    Write-Host "Clone failed!" -ForegroundColor Red
    exit 1
}

Set-Location $tmpDir
Write-Host "Installing dependencies..."
npm install --omit=dev

Write-Host "Linking globally..."
npm link --force

# Verify
$newVer = (& codewhale-tui --version 2>&1 | Select-Object -First 1)
Write-Host "Installed: $newVer" -ForegroundColor Green
Write-Host "Done! Restart your dashboard for changes to take effect." -ForegroundColor Cyan

# Cleanup
Set-Location $env:TEMP
Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue