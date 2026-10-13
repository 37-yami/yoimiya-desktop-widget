@echo off
rem ============================================================
rem  Create a source-launch shortcut (宵宫挂件.lnk) in the
rem  PROJECT ROOT. Target: node_modules\electron\dist\electron.exe
rem  with argument "." -- launches the widget directly from
rem  source, no build/dist needed, no console window.
rem
rem  Requires: npm install has been run in the project root.
rem
rem  The powershell payload below is deliberately ASCII-only:
rem  cmd.exe mis-parses non-ASCII bytes on caret-continued
rem  lines after chcp 65001. The Chinese shortcut name
rem  (宵宫挂件) is built from char codes instead.
rem ============================================================
chcp 65001 >nul
title 创建源码启动快捷方式

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = (Resolve-Path '%~dp0..').Path;" ^
  "$exe = Join-Path $root 'node_modules\electron\dist\electron.exe';" ^
  "if (-not (Test-Path -LiteralPath $exe)) { exit 1 };" ^
  "$ico = Join-Path $root 'build\icon.ico';" ^
  "if (-not (Test-Path -LiteralPath $ico)) { $ico = $exe };" ^
  "$name = -join @([char]0x5BB5,[char]0x5BAB,[char]0x6302,[char]0x4EF6);" ^
  "$ws  = New-Object -ComObject WScript.Shell;" ^
  "$lnk = $ws.CreateShortcut((Join-Path $root ($name + '.lnk')));" ^
  "$lnk.TargetPath = $exe;" ^
  "$lnk.Arguments = '.';" ^
  "$lnk.WorkingDirectory = $root;" ^
  "$lnk.IconLocation = $ico + ',0';" ^
  "$lnk.Description = 'Yoimiya Desktop Widget (source)';" ^
  "$lnk.Save()"

if errorlevel 1 (
  echo.
  echo 未找到 electron，请先在项目根目录执行：npm install
) else (
  echo.
  echo 已在项目根目录创建快捷方式：宵宫挂件.lnk
  echo 之后双击它即可从源码启动挂件（无需打包）。
)
echo.
pause
