#!/usr/bin/env bash
# Lernhelfer starten (macOS / Linux)
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  echo "Erster Start: installiere Python-Umgebung …"
  python3 -m venv .venv || exit 1
fi
echo "Prüfe Pakete …"
.venv/bin/python -m pip install -q --disable-pip-version-check -r requirements.txt || echo "WARNUNG: Pakete konnten nicht installiert werden – starte trotzdem …"
if [ -z "$ANTHROPIC_API_KEY" ] && [ -f .api-key ]; then export ANTHROPIC_API_KEY="$(tr -d '\r\n' < .api-key)"; fi
export LERNHELFER_OPEN_BROWSER=1
.venv/bin/python app.py
