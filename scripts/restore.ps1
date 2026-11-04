[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupZip,
    [switch]$Force,
    [string]$BackendPath = (Join-Path $PSScriptRoot '..\backend'),
    [string]$DbHost = '127.0.0.1',
    [int]$DbPort = 3306,
    [string]$DbName = 'optica',
    [string]$DbUser = 'root',
    [string]$DbPassword = '',
    [string]$MySql = 'C:\xampp\mysql\bin\mysql.exe',
    [string]$StoragePath = '',
    [switch]$RestoreEnv
)

$ErrorActionPreference = 'Stop'

function Write-Step($message) {
    Write-Host "==> $message" -ForegroundColor Cyan
}

if (-not (Test-Path -LiteralPath $BackupZip)) {
    throw "No se encontró el respaldo: $BackupZip"
}

if (-not (Test-Path -LiteralPath $MySql)) {
    throw "No se encontró mysql.exe en: $MySql. Indica la ruta con -MySql."
}

if ($DbName -notmatch '^[A-Za-z0-9_]+$') {
    throw 'El nombre de la base de datos solo puede contener letras, números y guiones bajos.'
}

$backend = (Resolve-Path -LiteralPath $BackendPath).Path
$tempDir = Join-Path $env:TEMP ("optica_restore_" + [guid]::NewGuid().ToString('N'))

Write-Step 'Descomprimiendo respaldo'
Expand-Archive -LiteralPath $BackupZip -DestinationPath $tempDir -Force

$sqlFile = Join-Path $tempDir 'database.sql'
$storageSource = Join-Path $tempDir 'storage\prescriptions'
$envSource = Join-Path $tempDir 'config\env'

if (-not (Test-Path -LiteralPath $sqlFile)) {
    throw 'El respaldo no contiene database.sql.'
}

if (-not $Force) {
    Write-Host ''
    Write-Host "Se reemplazará la base de datos '$DbName' y las fotografías actuales." -ForegroundColor Yellow
    Write-Host "Servidor: ${DbHost}:${DbPort}" -ForegroundColor Yellow
    $answer = Read-Host 'Escribe SI para continuar'
    if ($answer -ne 'SI') {
        Remove-Item -LiteralPath $tempDir -Recurse -Force
        throw 'Restauración cancelada.'
    }
}

try {
    Write-Step "Recreando base de datos $DbName"
    $env:MYSQL_PWD = $DbPassword
    try {
        $executeSql = "DROP DATABASE IF EXISTS $DbName; CREATE DATABASE $DbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

        & $MySql `
            "--host=$DbHost" `
            "--port=$DbPort" `
            "--user=$DbUser" `
            '--default-character-set=utf8mb4' `
            "--execute=$executeSql"

        if ($LASTEXITCODE -ne 0) {
            throw "mysql terminó con código $LASTEXITCODE al recrear la base de datos."
        }

        Write-Step 'Importando datos'
        $quotedMysql = '"' + $MySql + '"'
        $command = "$quotedMysql --host=$DbHost --port=$DbPort --user=$DbUser --default-character-set=utf8mb4 $DbName < `"$sqlFile`""
        & cmd.exe /c $command

        if ($LASTEXITCODE -ne 0) {
            throw "La importación falló con código $LASTEXITCODE."
        }
    }
    finally {
        Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    }

    Write-Step 'Restaurando fotografías'
    $storageTarget = if ($StoragePath -ne '') {
        [IO.Path]::GetFullPath($StoragePath)
    }
    else {
        Join-Path $backend 'storage\app\private\prescriptions'
    }
    $storageParent = Split-Path -Parent $storageTarget

    if (-not (Test-Path -LiteralPath $storageParent)) {
        New-Item -ItemType Directory -Path $storageParent -Force | Out-Null
    }

    if (Test-Path -LiteralPath $storageTarget) {
        Remove-Item -LiteralPath $storageTarget -Recurse -Force
    }

    if (Test-Path -LiteralPath $storageSource) {
        Copy-Item -LiteralPath $storageSource -Destination $storageTarget -Recurse -Force
    }
    else {
        New-Item -ItemType Directory -Path $storageTarget | Out-Null
    }

    if ($RestoreEnv -and (Test-Path -LiteralPath $envSource)) {
        Write-Step 'Restaurando archivo .env'
        $envTarget = Join-Path $backend '.env'

        if (Test-Path -LiteralPath $envTarget) {
            $backupEnv = Join-Path $backend ('.env.before-restore.' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
            Copy-Item -LiteralPath $envTarget -Destination $backupEnv -Force
            Write-Host "  Se guardó el .env anterior en: $backupEnv" -ForegroundColor Yellow
        }

        Copy-Item -LiteralPath $envSource -Destination $envTarget -Force
    }

    Write-Step 'Limpiando cachés de Laravel'
    Push-Location $backend
    try {
        & php artisan optimize:clear | Out-Host
    }
    catch {
        Write-Host '  No se pudo ejecutar php artisan optimize:clear. Hazlo manualmente.' -ForegroundColor Yellow
    }
    finally {
        Pop-Location
    }

    Write-Host 'Restauración completada.' -ForegroundColor Green
    Write-Host 'Verifica el inicio de sesión y que las fotografías se visualicen correctamente.' -ForegroundColor Green
}
finally {
    if (Test-Path -LiteralPath $tempDir) {
        Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
