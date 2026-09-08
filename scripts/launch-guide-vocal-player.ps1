$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$appUrl = 'http://127.0.0.1:41731/apps/guide-vocal-player/'
$npmPath = 'C:\Program Files\nodejs\npm.cmd'
$stateDirectory = Join-Path $env:LOCALAPPDATA 'GuideVocalPlayer'
$launcherLog = Join-Path $stateDirectory 'launcher.log'

New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null

function Write-LauncherLog([string]$message) {
    Add-Content -LiteralPath $launcherLog -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $message" -Encoding UTF8
}

function Test-AppServer {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connection = $client.BeginConnect('127.0.0.1', 41731, $null, $null)
        if (-not $connection.AsyncWaitHandle.WaitOne(200)) {
            return $false
        }
        $client.EndConnect($connection)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

try {
    Write-LauncherLog 'Launcher started.'

    if (-not (Test-AppServer)) {
        if (-not (Test-Path -LiteralPath $npmPath)) {
            throw "npm was not found: $npmPath"
        }

        Write-LauncherLog 'Starting the local Vite server.'
        Start-Process `
            -FilePath $npmPath `
            -ArgumentList @('run', 'dev', '--', '--host', '127.0.0.1', '--port', '41731', '--strictPort') `
            -WorkingDirectory $projectRoot `
            -WindowStyle Hidden

        $started = $false
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            Start-Sleep -Milliseconds 250
            if (Test-AppServer) {
                $started = $true
                break
            }
        }

        if (-not $started) {
            throw 'The local server did not start.'
        }
    }

    Write-LauncherLog 'Opening the app in the default browser.'
    Start-Process -FilePath (Join-Path $env:WINDIR 'explorer.exe') -ArgumentList $appUrl
    Write-LauncherLog 'Launch completed.'
}
catch {
    Write-LauncherLog "ERROR: $($_.Exception.Message)"
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show(
        "Guide Vocal Player could not be started.`r`n`r`n$($_.Exception.Message)",
        'Guide Vocal Player',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
    exit 1
}
