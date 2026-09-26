@echo off
cd /d "%~dp0"
if not exist "node_modules" (
  echo Installing public dependencies...
  call npm ci
  if errorlevel 1 exit /b 1
)
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Add your Sarvam API key to .env, save, then run this file again. Gemini is an optional backup.
  exit /b 1
)
if not exist "dist\index.html" (
  call npm run build
  if errorlevel 1 exit /b 1
)
echo Open http://127.0.0.1:4317 in your browser.
call npm start
