@echo off
REM Lernhelfer starten (Windows)
cd /d "%~dp0"
title Lernhelfer
if not exist .venv (
  echo Erster Start: installiere Python-Umgebung ...
  python -m venv .venv || goto :nopython
)
echo Pruefe Pakete ...
.venv\Scripts\python -m pip install -q --disable-pip-version-check -r requirements.txt
if errorlevel 1 (
  echo.
  echo WARNUNG: Pakete konnten nicht installiert werden - keine Internetverbindung?
  echo Der Lernhelfer startet trotzdem mit den vorhandenen Paketen ...
  echo.
)
if "%ANTHROPIC_API_KEY%"=="" if exist .api-key set /p ANTHROPIC_API_KEY=<.api-key
set LERNHELFER_OPEN_BROWSER=1
.venv\Scripts\python app.py
echo.
echo ======================================================================
echo  Der Lernhelfer wurde beendet. Steht oben eine Fehlermeldung?
echo  Dann mach einen Screenshot von diesem Fenster und schick ihn Claude.
echo ======================================================================
pause
exit /b
:nopython
echo Fehler: Python wurde nicht gefunden. Installiere Python 3.10+ von https://www.python.org/downloads/
echo (Beim Installieren "Add Python to PATH" anhaken.)
pause
