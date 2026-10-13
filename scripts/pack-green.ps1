# ============================================================
#  Green portable package builder for Yoimiya Widget
#
#  Usage:  npm run build:green
#
#  Steps:
#    1. Run electron-builder --dir  -> dist/win-unpacked
#    2. Copy launchers into dist/
#    3. Zip win-unpacked + launchers -> dist/YoimiyaWidget-green-vX.Y.Z.zip
#
#  End users: extract the zip anywhere, then either
#    - double-click run-widget.cmd to launch, or
#    - run create-desktop-shortcut.cmd once to pin a real
#      desktop shortcut (.lnk).
# ============================================================
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# --- use npmmirror for electron-builder / electron downloads ----------------
# electron-builder fetches winCodeSign & nsis from github.com by default,
# which is often unreachable. npmmirror hosts the same binaries.
$env:ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/'
$env:ELECTRON_MIRROR                  = 'https://npmmirror.com/mirrors/electron/'

# --- read version from package.json ---------------------------------------
$version = (Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version

# --- 1. build unpacked folder ---------------------------------------------
# --dir only (no portable target): avoids electron-builder re-downloading
# NSIS tooling from github.com, which is often unreachable and would fail
# the whole green-package build.
Write-Host "[1/3] Building win-unpacked via electron-builder ..."
npx electron-builder --win --dir
if ($LASTEXITCODE -ne 0) { throw "electron-builder failed with exit code $LASTEXITCODE" }

$dist = Join-Path $root 'dist'
if (-not (Test-Path -LiteralPath $dist)) { throw "dist folder not found after build" }

# --- 2. copy launchers ------------------------------------------------------
# cmd.exe requires CRLF line endings and UTF-8 without BOM;
# normalize defensively so the package never breaks regardless
# of git autocrlf settings on the build machine.
Write-Host "[2/3] Copying launchers into dist/ ..."
foreach ($name in @('run-widget.cmd', 'create-shortcut.cmd')) {
  $src = Join-Path $PSScriptRoot $name
  $dst = Join-Path $dist $name
  $text = [IO.File]::ReadAllText($src) -replace "`r?`n", "`r`n"
  [IO.File]::WriteAllText($dst, $text, (New-Object System.Text.UTF8Encoding($false)))
}
# ship the app icon next to the launchers (used by create-shortcut.cmd,
# avoids Windows icon-cache staleness on end-user machines)
Copy-Item -LiteralPath (Join-Path $root 'build\icon.ico') -Destination $dist -Force

# --- 3. zip (via .NET ZipFile: deterministic, avoids Compress-Archive
#       path-resolution quirks right after files are written) ---------------
$zip = Join-Path $dist ("YoimiyaWidget-green-v{0}.zip" -f $version)
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }

Write-Host "[3/3] Compressing to $([System.IO.Path]::GetFileName($zip)) (this may take a while) ..."
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$entries = @(
  @{ Src = Join-Path $dist 'win-unpacked';        Base = 'win-unpacked' },
  @{ Src = Join-Path $dist 'run-widget.cmd';      Base = 'run-widget.cmd' },
  @{ Src = Join-Path $dist 'create-shortcut.cmd'; Base = 'create-shortcut.cmd' },
  @{ Src = Join-Path $dist 'icon.ico';            Base = 'icon.ico' }
)
foreach ($e in $entries) {
  if (-not (Test-Path -LiteralPath $e.Src)) { throw "pack source missing: $($e.Src)" }
}

$archive = [System.IO.Compression.ZipFile]::Open($zip, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($e in $entries) {
    if ([System.IO.File]::Exists($e.Src)) {
      [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $archive, $e.Src, $e.Base, [System.IO.Compression.CompressionLevel]::Optimal)
    } else {
      # directory: recurse files, keep folder prefix in entry names
      $rootLen = $e.Src.Length
      Get-ChildItem -LiteralPath $e.Src -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($rootLen + 1) -replace '\\', '/'
        [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
          $archive, $_.FullName, ($e.Base + '/' + $rel), [System.IO.Compression.CompressionLevel]::Optimal)
      }
    }
  }
} finally {
  $archive.Dispose()
}

Write-Host ''
Write-Host "Done: $zip"
Write-Host 'Users: extract anywhere -> run-widget.cmd to launch,'
Write-Host '       or run create-shortcut.cmd once to get YoimiyaWidget.lnk in the folder.'
