@echo off
setlocal
set SCRIPT=%~dp0claude-auto-resume.ps1
where pwsh >nul 2>nul
if %errorlevel%==0 (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*
)
endlocal
