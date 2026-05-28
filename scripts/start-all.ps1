# CodeWhale Dashboard - Silent Background Launcher
param([switch]$Stop)
$root = Split-Path -Parent $PSScriptRoot
if (-not $root) { $root = "C:\Users\Administrator\Desktop\code-whale-dashboard" }

if ($Stop) {
  Get-Process node -ErrorAction SilentlyContinue | Where-Object { -not $_.MainWindowTitle } | Stop-Process -Force
  Get-Process codewhale-tui -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host "Stopped" -ForegroundColor Red; exit
}

Write-Host " CodeWhale Dashboard" -ForegroundColor Cyan
Start-Process -FilePath "codewhale-tui" -ArgumentList "serve","--http","--port","7878","--insecure" -WindowStyle Hidden
Start-Sleep 2
Start-Process -FilePath "node" -ArgumentList "src/index.js" -WorkingDirectory "$root\backend" -WindowStyle Hidden
Start-Sleep 3
$fe = Start-Process -FilePath "cmd" -ArgumentList "/c cd /d $root\frontend && npx vite --port 4321 --host" -WindowStyle Hidden -PassThru
Start-Sleep 4
if (netstat -ano | Select-String ":4321\b") {
  Write-Host " Ready: http://localhost:4321" -ForegroundColor Green
} else {
  Write-Host " Frontend may still be starting..." -ForegroundColor Yellow
}
