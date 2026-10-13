@echo off
rem ============================================================
rem  Create a shortcut (宵宫挂件.lnk) NEXT TO this file,
rem  pointing to win-unpacked\YoimiyaWidget.exe.
rem  Double-click the created .lnk to launch the widget.
rem
rem  NOTE: re-run this file after moving the whole folder,
rem        because .lnk stores absolute paths.
rem
rem  The powershell payload below is deliberately ASCII-only:
rem  cmd.exe mis-parses non-ASCII bytes on caret-continued
rem  lines after chcp 65001. The Chinese shortcut name
rem  (宵宫挂件) is built from char codes instead.
rem ============================================================
chcp 65001 >nul
title 创建挂件快捷方式

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$exe = Join-Path '%~dp0' 'win-unpacked\YoimiyaWidget.exe';" ^
  "if (-not (Test-Path -LiteralPath $exe)) { exit 1 };" ^
  "$ico = Join-Path '%~dp0' 'icon.ico';" ^
  "if (-not (Test-Path -LiteralPath $ico)) { $ico = $exe };" ^
  "$name = -join @([char]0x5BB5,[char]0x5BAB,[char]0x6302,[char]0x4EF6);" ^
  "$ws  = New-Object -ComObject WScript.Shell;" ^
  "$lnk = $ws.CreateShortcut((Join-Path '%~dp0' ($name + '.lnk')));" ^
  "$lnk.TargetPath = $exe;" ^
  "$lnk.WorkingDirectory = Split-Path $exe;" ^
  "$lnk.IconLocation = $ico + ',0';" ^
  "$lnk.Save()"

if errorlevel 1 (
  echo.
  echo 未找到 YoimiyaWidget.exe，请确认本文件与 win-unpacked 文件夹在同一目录。
) else (
  echo.
  echo 已在当前文件夹创建快捷方式：宵宫挂件.lnk
  echo 之后双击它即可启动挂件。
)
echo.
pause
