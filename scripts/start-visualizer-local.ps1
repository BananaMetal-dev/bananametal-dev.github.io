param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$baseUrl = 'http://127.0.0.1:5191/apps/visualizer'

function Test-VisualizerReady {
    try {
        $response = Invoke-WebRequest -UseBasicParsing "$baseUrl/app.js" -TimeoutSec 2
        return $response.Content.Contains('scrolling_spectrogram')
    } catch {
        return $false
    }
}

try {
    if (-not (Test-VisualizerReady)) {
        $node = (Get-Command node.exe).Source
        $vite = Join-Path $projectRoot 'node_modules/vite/bin/vite.js'
        if (-not (Test-Path -LiteralPath $vite -PathType Leaf)) {
            throw "Vite is missing in $projectRoot. Run npm install in that folder."
        }
        $server = Start-Process -FilePath $node -ArgumentList ('"{0}" --host 127.0.0.1 --port 5191 --strictPort' -f $vite) -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
        $deadline = (Get-Date).AddSeconds(15)
        do {
            Start-Sleep -Milliseconds 300
            if (Test-VisualizerReady) { break }
            if ($server.HasExited -or (Get-Date) -ge $deadline) {
                throw 'Banana Visualizer could not start on port 5191.'
            }
        } while ($true)
    }

    if (-not $NoBrowser) { Start-Process "$baseUrl/index.html" }
} catch {
    if (-not $NoBrowser) {
        Add-Type -AssemblyName System.Windows.Forms
        [void][System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Banana Visualizer')
    }
    throw
}
