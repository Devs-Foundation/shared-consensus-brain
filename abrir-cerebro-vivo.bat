@echo off
setlocal
set "APP_DIR=%~dp0"
set "URL=http://127.0.0.1:8787"

start "Cerebro Vivo Server" /min cmd /c "cd /d ""%APP_DIR%"" && node server.js"
timeout /t 2 /nobreak > nul

where msedge > nul 2> nul
if %errorlevel%==0 (
  start "Cerebro Vivo" msedge --app=%URL%
  exit /b
)

where chrome > nul 2> nul
if %errorlevel%==0 (
  start "Cerebro Vivo" chrome --app=%URL%
  exit /b
)

where brave > nul 2> nul
if %errorlevel%==0 (
  start "Cerebro Vivo" brave --app=%URL%
  exit /b
)

start "Cerebro Vivo" %URL%
