[CmdletBinding()]
param(
    [string]$BackupRoot = (Join-Path $PSScriptRoot '..\backups'),
    [string]$BackendPath = (Join-Path $PSScriptRoot '..\backend'),
    [string]$DbHost = '127.0.0.1',
    [int]$DbPort = 3306,
    [string]$DbName = 'optica',
    [string]$DbUser = 'root',
    [string]$DbPassword = '',
    [string]$MySqlDump = 'C:\xampp\mysql\bin\mysqldump.exe',
    [int]$RetentionDays = 30
)

$ErrorActionPreference = 'Stop'

function Write-Step($message) {
    Write-Host "==> $message" -ForegroundColor Cyan
}

if (-not (Test-Path -LiteralPath $MySqlDump)) {
    throw "No se encontró mysqldump.exe en: $MySqlDump. Indica la ruta con -MySqlDump."
}

$backend = (Resolve-Path -LiteralPath $BackendPath).Path
$storageSource = Join-Path $backend 'storage\app\private\prescriptions'
$envSource = Join-Path $backend '.env'

if (-not (Test-Path -LiteralPath $BackupRoot)) {
    New-Item -ItemType Directory -Path $BackupRoot | Out-Null
}

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$workDir = Join-Path $BackupRoot "optica_$stamp"
$zipPath = Join-Path $BackupRoot "optica_$stamp.zip"

New-Item -ItemType Directory -Path $workDir | Out-Null
New-Item -ItemType Directory -Path (Join-Path $workDir 'storage') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $workDir 'config') | Out-Null

try {
    Write-Step "Respaldando base de datos $DbName"
    $sqlFile = Join-Path $workDir 'database.sql'

    $env:MYSQL_PWD = $DbPassword
    try {
        & $MySqlDump `
            "--host=$DbHost" `
            "--port=$DbPort" `
            "--user=$DbUser" `
            '--single-transaction' `
            '--quick' `
            '--routines' `
            '--triggers' `
            '--events' `
            '--default-character-set=utf8mb4' `
            "--result-file=$sqlFile" `
            $DbName

        if ($LASTEXITCODE -ne 0) {
            throw "mysqldump terminó con código $LASTEXITCODE."
        }
    }
    finally {
        Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    }

    Write-Step 'Respaldando fotografías de recetas'
    $storageTarget = Join-Path $workDir 'storage\prescriptions'

    if (Test-Path -LiteralPath $storageSource) {
        Copy-Item -LiteralPath $storageSource -Destination $storageTarget -Recurse -Force
    }
    else {
        New-Item -ItemType Directory -Path $storageTarget | Out-Null
    }

    Write-Step 'Respaldando configuración'
    if (Test-Path -LiteralPath $envSource) {
        Copy-Item -LiteralPath $envSource -Destination (Join-Path $workDir 'config\env') -Force
    }

    $manifest = @(
        "Sistema: Optica",
        "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
        "Base de datos: $DbName",
        "Servidor MySQL: ${DbHost}:${DbPort}",
        "Fotografías: storage/prescriptions",
        "Configuración: config/env"
    )
    $manifest | Set-Content -Path (Join-Path $workDir 'manifest.txt') -Encoding UTF8

    Write-Step 'Comprimiendo respaldo'
    Compress-Archive -Path (Join-Path $workDir '*') -DestinationPath $zipPath -CompressionLevel Optimal -Force
    Remove-Item -LiteralPath $workDir -Recurse -Force

    Write-Host "Respaldo creado: $zipPath" -ForegroundColor Green
    Write-Host 'Guarda este archivo en un lugar seguro: contiene datos personales y la clave APP_KEY.' -ForegroundColor Yellow

    if ($RetentionDays -gt 0) {
        Write-Step "Eliminando respaldos de más de $RetentionDays días"
        $limit = (Get-Date).AddDays(-$RetentionDays)
        Get-ChildItem -LiteralPath $BackupRoot -Filter 'optica_*.zip' |
            Where-Object { $_.LastWriteTime -lt $limit } |
            ForEach-Object {
                Remove-Item -LiteralPath $_.FullName -Force
                Write-Host "  Eliminado: $($_.Name)"
            }
    }
}
catch {
    if (Test-Path -LiteralPath $workDir) {
        Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    throw
}
