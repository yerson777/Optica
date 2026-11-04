[CmdletBinding()]
param(
    [string]$ApiUrl = '',
    [string]$FrontendPath = (Join-Path $PSScriptRoot '..\frontend'),
    [string]$OutputDir = (Join-Path $PSScriptRoot '..\apk'),
    [string]$AndroidSdkPath = (Join-Path $env:LOCALAPPDATA 'Android\Sdk'),
    [switch]$Release,
    [switch]$Install
)

$ErrorActionPreference = 'Stop'

function Write-Step($message) {
    Write-Host "==> $message" -ForegroundColor Cyan
}

$frontend = (Resolve-Path -LiteralPath $FrontendPath).Path
$android = Join-Path $frontend 'android'
$configPath = Join-Path $frontend 'public\app-config.js'

if (-not (Test-Path -LiteralPath $android)) {
    throw 'No se encontró el proyecto Android. Ejecuta primero: npx cap add android'
}

if ($ApiUrl -eq '') {
    $localIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike '127.*' -and
            $_.IPAddress -notlike '169.254*' -and
            $_.InterfaceAlias -notlike '*vEthernet*'
        } |
        Select-Object -First 1).IPAddress

    if (-not $localIp) {
        throw 'Indica la URL del servidor con -ApiUrl "http://IP_DE_LA_PC:8000/api".'
    }

    $ApiUrl = "http://${localIp}:8000/api"
}

$ApiUrl = $ApiUrl.TrimEnd('/')

if ($ApiUrl -notmatch '^https?://') {
    throw 'La URL de la API debe comenzar con http:// o https://'
}

$configBackup = if (Test-Path -LiteralPath $configPath) {
    [IO.File]::ReadAllText($configPath)
}
else {
    ''
}

$apkName = if ($Release) { 'Optica-release-unsigned.apk' } else { 'Optica-debug.apk' }
$gradleTask = if ($Release) { 'assembleRelease' } else { 'assembleDebug' }
$gradleOutput = if ($Release) {
    'app-release-unsigned.apk'
}
else {
    'app-debug.apk'
}

try {
    if (-not (Test-Path -LiteralPath $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir | Out-Null
    }

    Write-Step "Configurando la API para el APK: $ApiUrl"
    $configContent = @"
/* Generado por scripts/build-apk.ps1. No editar manualmente. */
window.__OPTICA_CONFIG__ = {
  apiUrl: '$ApiUrl',
};
"@
    [IO.File]::WriteAllText($configPath, $configContent, (New-Object System.Text.UTF8Encoding($false)))

    Write-Step 'Compilando la aplicación web'
    Push-Location $frontend
    try {
        & npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "La compilación web falló con código $LASTEXITCODE."
        }

        Write-Step 'Copiando archivos al proyecto Android'
        & npx cap sync android
        if ($LASTEXITCODE -ne 0) {
            throw "Capacitor sync falló con código $LASTEXITCODE."
        }
    }
    finally {
        [IO.File]::WriteAllText($configPath, $configBackup, (New-Object System.Text.UTF8Encoding($false)))
        Pop-Location
    }

    if (-not (Test-Path -LiteralPath $AndroidSdkPath)) {
        throw "No se encontró el Android SDK en: $AndroidSdkPath"
    }

    $env:ANDROID_HOME = $AndroidSdkPath
    $env:ANDROID_SDK_ROOT = $AndroidSdkPath

    $localProperties = Join-Path $android 'local.properties'
    $sdkDir = $AndroidSdkPath -replace '\\', '/'
    [IO.File]::WriteAllText(
        $localProperties,
        "sdk.dir=$sdkDir`n",
        (New-Object System.Text.UTF8Encoding($false))
    )

    $javaCandidates = @()

    if ($env:JAVA_HOME) {
        $javaCandidates += $env:JAVA_HOME
    }

    $javaCandidates += (Get-ChildItem 'C:\Program Files\Java' -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue |
        ForEach-Object { $_.FullName })

    $javaCandidates += (Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue |
        ForEach-Object { $_.FullName })

    $javaCandidates += 'C:\Program Files\Android\Android Studio\jbr'

    $javaHome = $null

    foreach ($candidate in ($javaCandidates | Select-Object -Unique)) {
        $javaExe = Join-Path $candidate 'bin\java.exe'

        if (-not (Test-Path -LiteralPath $javaExe)) {
            continue
        }

        $previousErrorAction = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        $versionOutput = (& $javaExe -version 2>&1 | Out-String)
        $ErrorActionPreference = $previousErrorAction

        if ($versionOutput -match 'version "17') {
            $javaHome = $candidate
            break
        }
    }

    if (-not $javaHome) {
        throw 'Se requiere JDK 17 para compilar el APK. Instala JDK 17 o define JAVA_HOME.'
    }

    $env:JAVA_HOME = $javaHome
    Write-Host "  Java: $javaHome" -ForegroundColor DarkGray

    Write-Step 'Compilando el APK (la primera vez puede tardar varios minutos)'
    Push-Location $android
    $previousErrorAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & .\gradlew.bat $gradleTask --no-daemon
        $gradleExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorAction
        Pop-Location
    }

    if ($gradleExitCode -ne 0) {
        throw "La compilación Android falló con código $gradleExitCode."
    }

    $sourceApk = Join-Path $android "app\build\outputs\apk\$(if ($Release) {'release'} else {'debug'})\$gradleOutput"

    if (-not (Test-Path -LiteralPath $sourceApk)) {
        throw "No se encontró el APK generado en: $sourceApk"
    }

    $targetApk = Join-Path $OutputDir $apkName
    Copy-Item -LiteralPath $sourceApk -Destination $targetApk -Force

    Write-Host ''
    Write-Host "APK generado: $targetApk" -ForegroundColor Green
    Write-Host "Servidor configurado: $ApiUrl" -ForegroundColor Green
    Write-Host ''
    Write-Host 'Instalación en el celular:' -ForegroundColor Yellow
    Write-Host '  1. Copia el APK al teléfono (USB, WhatsApp, correo o almacenamiento).'
    Write-Host '  2. Abre el archivo y permite "Instalar aplicaciones desconocidas".'
    Write-Host '  3. El teléfono debe estar en la misma red Wi-Fi que la computadora.'
    Write-Host ''
    Write-Host 'Para producción debes usar una URL HTTPS y volver a generar el APK.' -ForegroundColor Yellow

    if ($Release) {
        Write-Host 'El APK de release no está firmado; para distribuirlo debes firmarlo o usar Android Studio.' -ForegroundColor Yellow
    }

    if ($Install) {
        $adb = Join-Path $AndroidSdkPath 'platform-tools\adb.exe'

        if (-not (Test-Path -LiteralPath $adb)) {
            throw "No se encontró adb en: $adb"
        }

        Write-Step 'Instalando en el dispositivo conectado'
        & $adb install -r $targetApk

        if ($LASTEXITCODE -ne 0) {
            throw "adb install falló con código $LASTEXITCODE."
        }

        Write-Host 'APK instalado en el dispositivo.' -ForegroundColor Green
    }
}
catch {
    [IO.File]::WriteAllText($configPath, $configBackup, (New-Object System.Text.UTF8Encoding($false)))
    throw
}
