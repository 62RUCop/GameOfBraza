#Requires -Version 5.1
<#
.SYNOPSIS
  Деплой одной командой под Windows — аналог start.sh.

.DESCRIPTION
  Поднимает БД, применяет миграции, идемпотентно сеет справочники, стартует
  веб-сервер. Идемпотентно — можно запускать повторно.

    .\start.ps1

  Требуется: Docker Desktop для Windows с docker compose v2.
  Если PowerShell блокирует запуск скрипта (execution policy), запускай так
  (или используй start.cmd):
    powershell -ExecutionPolicy Bypass -File .\start.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$EnvFile     = Join-Path $PSScriptRoot '.env'
$ExampleFile = Join-Path $PSScriptRoot '.env.production.example'

function Write-Info { param([string]$Message) Write-Host "→ $Message" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Die        { param([string]$Message) Write-Host $Message -ForegroundColor Red; exit 1 }

# ─── Помощники чтения/записи значения по ключу в .env ────────────────────────────
function Get-EnvValue {
  param([string]$Key)
  $escaped = [regex]::Escape($Key)
  $line = @(Get-Content -LiteralPath $EnvFile) |
    Where-Object { $_ -match "^$escaped=" } | Select-Object -First 1
  if (-not $line) { return '' }
  return (($line -split '=', 2)[1]).Trim('"')
}

function Set-EnvValue {
  param([string]$Key, [string]$Value)
  $lines = @(Get-Content -LiteralPath $EnvFile)
  $escaped = [regex]::Escape($Key)
  $found = $false
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^$escaped=") { $lines[$i] = "$Key=$Value"; $found = $true; break }
  }
  if (-not $found) { $lines += "$Key=$Value" }
  # UTF-8 без BOM и с LF — чтобы docker compose читал .env как Unix-файл.
  $content = ($lines -join "`n") + "`n"
  [System.IO.File]::WriteAllText($EnvFile, $content, (New-Object System.Text.UTF8Encoding($false)))
}

# ─── Генераторы секретов (аналоги openssl) ──────────────────────────────────────
function New-HexSecret {
  param([int]$Bytes = 32)
  $buffer = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
  return (($buffer | ForEach-Object { $_.ToString('x2') }) -join '')
}

function New-AlphanumericPassword {
  param([int]$Length = 16)
  $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $byte = New-Object byte[] 1
  $result = ''
  while ($result.Length -lt $Length) {
    $rng.GetBytes($byte)
    $result += $alphabet[$byte[0] % $alphabet.Length]
  }
  return $result
}

# ─── 0. Проверки окружения ──────────────────────────────────────────────────────
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Die 'Не найден docker. Установи Docker Desktop для Windows и повтори.'
}
docker compose version 1>$null 2>$null
if ($LASTEXITCODE -ne 0) { Die "Не найден 'docker compose' (v2). Обнови Docker Desktop." }

# ─── 1. .env: создать из примера при первом запуске ─────────────────────────────
if (-not (Test-Path -LiteralPath $EnvFile)) {
  Write-Info ".env не найден — создаю из $(Split-Path -Leaf $ExampleFile)"
  Copy-Item -LiteralPath $ExampleFile -Destination $EnvFile
}

# ─── 2. AUTH_SECRET: сгенерировать, если пусто/плейсхолдер ───────────────────────
$authSecret = Get-EnvValue 'AUTH_SECRET'
if ($authSecret -eq '' -or $authSecret -match 'change|generate|сгенерируй|placeholder') {
  Set-EnvValue 'AUTH_SECRET' (New-HexSecret 32)
  Write-Ok 'Сгенерирован AUTH_SECRET'
}

# ─── 3. ADMIN_PASSWORD: сгенерировать, если задан email, но пуст пароль ──────────
$adminEmail = Get-EnvValue 'ADMIN_EMAIL'
$adminPass  = Get-EnvValue 'ADMIN_PASSWORD'
$generatedAdminPass = ''
if ($adminEmail -ne '' -and $adminPass -eq '') {
  $generatedAdminPass = New-AlphanumericPassword 16
  Set-EnvValue 'ADMIN_PASSWORD' $generatedAdminPass
  Write-Ok "Сгенерирован ADMIN_PASSWORD для $adminEmail"
}

# ─── 4. Сборка и запуск ─────────────────────────────────────────────────────────
Write-Info 'Сборка образов и запуск контейнеров (это займёт время при первом запуске)…'
docker compose up -d --build --wait
if ($LASTEXITCODE -ne 0) { Die 'Не удалось запустить контейнеры (docker compose up).' }

# ─── 5. Итог ────────────────────────────────────────────────────────────────────
$port = Get-EnvValue 'WEB_PORT'; if ($port -eq '') { $port = '3000' }
$url  = Get-EnvValue 'AUTH_URL'
Write-Host ''
if ($url -ne '') {
  Write-Ok "Готово! Приложение доступно на $url"
} else {
  # AUTH_URL пуст — origin определяется из Host-заголовка (AUTH_TRUST_HOST=true),
  # поэтому работает по любому IP/домену сервера. Локально — http://localhost:$port.
  Write-Ok "Готово! Приложение слушает порт $port — открывай http://<ip-или-домен-сервера>:$port"
}
if ($generatedAdminPass -ne '') {
  Write-Host ''
  Write-Host "  Учётка администратора (сохранена в .env):"
  Write-Host "    email:    $adminEmail"
  Write-Host "    password: $generatedAdminPass"
}
Write-Host ''
Write-Host '  Логи:   docker compose logs -f web'
Write-Host '  Стоп:   docker compose down'
