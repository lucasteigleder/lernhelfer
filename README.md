# 📚 Lernhelfer

Deine persönliche Lern-Webseite für Klassenarbeiten. Fach anlegen, Lernmaterial hochladen –
die KI (Claude) erstellt dir daraus:

- **📖 Zusammenfassung** – alle Themen verständlich erklärt, mit Beispielen, Stolperfallen, Merkzettel und möglichen Prüfungsfragen (inkl. Formeln)
- **🎯 Quiz** – Multiple-Choice-Fragen mit Erklärung, Ergebnis-Auswertung und „Falsche wiederholen“
- **🃏 Karteikarten** – mit Lernkartei-System (Fach 1–5): Was du nicht weißt, kommt öfter dran
- **💬 Chat** – stell Fragen zu deinem Stoff, lass dir Dinge einfacher erklären oder dich abfragen. Die KI kennt alle Dateien des Fachs. Aus dem Quiz kannst du bei falschen Antworten direkt „Im Chat nachfragen“
- **📝 Probeklausur** – realistische Klassenarbeit wie in der Berufsschule bzw. IHK-Prüfung: Ausgangssituation, Aufgaben mit Operatoren und 100 Punkten, Timer, Tabellen direkt ausfüllen. Die KI korrigiert mit Teilpunkten, Note nach IHK-Schlüssel, Feedback und Musterlösung. Liegt eine alte Klassenarbeit im Material, orientiert sich die Probeklausur an deren Stil

Außerdem: Countdown bis zur Arbeit, Fortschritt pro Fach, Hinweise auf Themen, bei denen du oft falsch liegst.

Unterstützte Dateien: **PDF, Word (.docx), PowerPoint (.pptx), Fotos (JPG/PNG/WebP), Text/Markdown**.
Fotos von Heftseiten und Tafelbildern sowie Bilder/Diagramme in Word- und PowerPoint-Dateien werden ebenfalls gelesen.
Unlesbare Dateien (z. B. geschützte Dokumente) werden markiert und übersprungen.

Unter **⚙ Meine Ausbildung** (unten links) stellst du dein Niveau ein, z. B. „Fachinformatiker/in für
Anwendungsentwicklung, 3. Ausbildungsjahr“ – danach richten sich alle Inhalte.

## Einrichtung (einmalig)

1. **Python 3.10 oder neuer** installieren: <https://www.python.org/downloads/>
   (Windows: beim Installieren „Add Python to PATH“ anhaken)
2. **API-Schlüssel** besorgen: Konto auf <https://platform.claude.com> anlegen → *API Keys* → Schlüssel erstellen.
3. Den Schlüssel in eine Datei namens `.api-key` im Ordner `lernhelfer` speichern (nur der Schlüssel, eine Zeile).
   Alternativ als Umgebungsvariable `ANTHROPIC_API_KEY` setzen.

## Starten

- **Windows:** Doppelklick auf `start.bat`
- **macOS/Linux:** `./start.sh` im Terminal

Beim ersten Start werden die Pakete installiert. Danach öffnet sich <http://localhost:5000> im Browser.

## So lernst du am besten

1. Fach anlegen, Datum der Arbeit und Thema eintragen.
2. Alle Materialien hochladen (Arbeitsblätter, Hefteinträge, Folien …) → **„Erstellen“** klicken (dauert 1–3 Minuten).
3. Zuerst die **Zusammenfassung** durcharbeiten.
4. Täglich ein paar Runden **Karteikarten** – bis alle Karten in Fach 4–5 sind.
5. **Quiz** machen, falsche Fragen wiederholen; bei „Neue Fragen erstellen“ bekommst du andere Fragen.
6. Was du nicht verstehst: im **Chat** nachfragen oder dich dort abfragen lassen.
7. Ein paar Tage vor der Arbeit: **Probeklausur** unter echten Bedingungen schreiben und die Fehler im Chat besprechen.

## Einstellungen (optional)

| Variable | Standard | Bedeutung |
|---|---|---|
| `LERNHELFER_MODEL` | `claude-opus-5-5` | KI-Modell (`claude-sonnet-5-5` ist günstiger) |
| `LERNHELFER_EFFORT` | `medium` | Gründlichkeit: `low`, `medium`, `high` |
| `PORT` | `5000` | Port der Webseite |

Alle Daten (Dateien, Quiz, Fortschritt) liegen lokal im Ordner `data/`. Dieser Ordner und dein
API-Schlüssel (`.api-key`) sind per `.gitignore` von Git ausgeschlossen.

## Technik

Python/Flask-Backend (`app.py`), Frontend ohne Build-Schritt (`static/`), Claude-API über das offizielle
`anthropic`-SDK (strukturierte Ausgaben für Quiz, Karteikarten und Probeklausuren; Streaming im Chat).
Mitgelieferte Bibliotheken in `static/vendor/`: marked (MIT), DOMPurify (Apache-2.0/MPL-2.0), KaTeX (MIT).

**Kosten:** Jedes „Erstellen“ und jede Chat-Nachricht ist ein Aufruf an die Claude-API und kostet je nach Materialmenge
typischerweise einige Cent. Das Material wird zwischengespeichert, damit Quiz und Karteikarten
günstiger werden.
