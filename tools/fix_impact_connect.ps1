$ErrorActionPreference = 'Stop'
try {
    $pluginRoot = Split-Path -Parent $PSScriptRoot
    $customNodes = Split-Path -Parent $pluginRoot
    $comfyRoot = Split-Path -Parent $customNodes
    if (-not (Test-Path -LiteralPath (Join-Path $comfyRoot 'main.py'))) {
        $comfyRoot = (Read-Host 'ComfyUI folder containing main.py').Trim('"')
    }
    if (-not (Test-Path -LiteralPath (Join-Path $comfyRoot 'main.py'))) { throw 'main.py not found' }
    $distribution = Split-Path -Parent $comfyRoot
    $pythonPath = @(
        (Join-Path $comfyRoot '.venv/Scripts/python.exe'),
        (Join-Path $distribution 'python_embeded/python.exe'),
        (Join-Path $distribution 'python_embedded/python.exe'),
        (Join-Path $distribution 'runtime/Scripts/python.exe')
    ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $pythonPath) { $pythonPath = (Read-Host 'Python executable used by ComfyUI').Trim('"') }
    & $pythonPath (Join-Path $PSScriptRoot 'fix_impact_connect.py') $comfyRoot
    if ($LASTEXITCODE -ne 0) { throw 'Impact Pack was not changed; see the message above.' }
} catch { Write-Host $_ -ForegroundColor Red }
Read-Host 'Press Enter to close'
