<#
.SYNOPSIS
  Server statis kecil untuk pengembangan lokal Gaming Headquarters.

.DESCRIPTION
  ES modules dan service worker tidak jalan lewat file://, jadi selama ngoding
  aplikasinya perlu disajikan lewat http://. Script ini tidak butuh Node maupun
  Python — cukup PowerShell bawaan Windows.

.EXAMPLE
  .\serve.ps1
  .\serve.ps1 -Port 9000
#>
[CmdletBinding()]
param(
  [int]$Port = 8123,
  [string]$Root
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Root)) {
  $Root = if ($PSScriptRoot) { $PSScriptRoot }
          elseif ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path }
          else { (Get-Location).Path }
}

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.mjs'  = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.ico'  = 'image/x-icon'
  '.woff2'= 'font/woff2'
  '.txt'  = 'text/plain; charset=utf-8'
}

$root = (Resolve-Path $Root).Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
  $listener.Start()
} catch {
  Write-Error "Gagal membuka port $Port. Coba port lain: .\serve.ps1 -Port 9000"
  exit 1
}

Write-Host ""
Write-Host "  Gaming HQ dev server" -ForegroundColor Cyan
Write-Host "  http://localhost:$Port/" -ForegroundColor Green
Write-Host "  root: $root"
Write-Host "  Tekan Ctrl+C untuk berhenti."
Write-Host ""

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    try {
      $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
      if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
      $rel = $rel -replace '/', '\'

      $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))

      # Jangan izinkan keluar dari root.
      if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
        $res.StatusCode = 403
        $res.Close()
        continue
      }

      if ((Test-Path $full -PathType Container)) {
        $full = Join-Path $full 'index.html'
      }

      if (-not (Test-Path $full -PathType Leaf)) {
        $res.StatusCode = 404
        $bytes = [Text.Encoding]::UTF8.GetBytes("404 - $rel tidak ditemukan")
        $res.ContentType = 'text/plain; charset=utf-8'
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        $res.Close()
        Write-Host ("  404  " + $req.Url.AbsolutePath) -ForegroundColor DarkYellow
        continue
      }

      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      # Tanpa cache supaya perubahan file langsung terlihat saat ngoding.
      $res.Headers.Add('Cache-Control', 'no-store')

      $bytes = [System.IO.File]::ReadAllBytes($full)
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.Close()
      Write-Host ("  200  " + $req.Url.AbsolutePath) -ForegroundColor DarkGray
    } catch {
      try { $res.StatusCode = 500; $res.Close() } catch {}
      Write-Host ("  500  " + $_.Exception.Message) -ForegroundColor Red
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
