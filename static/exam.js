"use strict";
/* Probeklausur: erstellen → schreiben (mit Timer) → KI korrigiert → Note & Musterlösung.
   Nutzt Hilfsfunktionen aus app.js (api, esc, toast, renderMd, $, state, route …). */

const FORMAT_LABEL = { text: "Textantwort", calculation: "Rechnung", code: "Code / SQL / UML", table: "Tabelle" };
const FORMAT_PH = {
  text: "Deine Antwort …",
  calculation: "Rechenweg und Ergebnis, z. B.\nMaterialeinzelkosten: 40.000 €\n+ MGK (12 %): 4.800 €\n= …",
  code: "Code, Pseudocode, SQL oder UML (z. B. PlantUML) …",
  table: "Tabelle als Text, z. B.\nSpalte A | Spalte B\n…",
};

/* ---------------------------------------------------------------- Einstellungen */
async function openSettings() {
  const dlg = $("#settingsDialog"), f = $("#settingsForm");
  const st = await api("/settings").catch(() => ({ profile: "" }));
  f.profile.value = st.profile || "";
  $("#settingsCancel").onclick = () => dlg.close();
  f.onsubmit = async (e) => {
    e.preventDefault();
    await api("/settings", { json: { profile: f.profile.value } });
    dlg.close();
    toast("✅ Gespeichert – gilt ab dem nächsten Erstellen");
  };
  dlg.showModal();
}

/* ---------------------------------------------------------------- Einstieg */
async function viewExam(s, view, eid) {
  if (eid) return openExam(s, view, eid);
  const st = s.status?.exam;
  if (st?.state === "running") {
    view.innerHTML = `<div class="card loading-card"><div class="spinner"></div><h3>Probeklausur wird erstellt …</h3>
      <p class="muted">Die KI liest dein Material und baut eine Klausur mit Ausgangssituation, Aufgaben,<br>
      Musterlösung und Erwartungshorizont. Das dauert meist 2–4 Minuten.</p></div>`;
    return;
  }
  if (!s.file_count) {
    view.innerHTML = `<div class="card empty"><div class="em">📝</div><h2>Probeklausur</h2>
      <p>Lade zuerst deine Lernmaterialien hoch – am besten auch eine alte Klassenarbeit, dann wird die Probeklausur ganz ähnlich.</p>
      <button class="btn primary" onclick="location.hash='#/s/${s.id}/files'">📄 Dateien hochladen</button></div>`;
    return;
  }
  let exams, settings;
  try {
    [exams, settings] = await Promise.all([api(`/subjects/${s.id}/exams`), api("/settings").catch(() => ({}))]);
  } catch (e) {
    view.innerHTML = `<div class="card empty"><div class="em">⚠️</div><h2>Probeklausur nicht verfügbar</h2>
      <p>Der Server antwortet nicht passend (${esc(e.message)}).<br>Meist läuft noch die alte Version im Hintergrund:
      alle schwarzen Lernhelfer-Fenster schließen, <b>start.bat</b> neu starten, dann <b>Strg+F5</b>.</p></div>`;
    return;
  }
  const graded = exams.filter(e => e.state === "graded");
  const best = graded.length ? Math.max(...graded.map(e => e.percent)) : null;
  view.innerHTML = `
    <div class="exam-new card">
      <div class="exam-new-head">
        <div class="exam-icon">📝</div>
        <div><h2 style="margin:0">Neue Probeklausur</h2>
          <div class="muted" style="font-size:13px">Wie eine echte Klassenarbeit: Ausgangssituation, Aufgaben mit Punkten, Korrektur mit Note (IHK-Schlüssel).</div></div>
      </div>
      <div class="exam-form">
        <label>Bearbeitungszeit
          <select id="exDur"><option value="45">45 Minuten</option><option value="60">60 Minuten</option><option value="90" selected>90 Minuten</option><option value="120">120 Minuten</option></select></label>
        <label style="flex:1"><span>Schwerpunkt <span class="muted" style="font-weight:400">(optional)</span></span>
          <input id="exFocus" maxlength="300" placeholder="z. B. mehr Rechenaufgaben zur Zuschlagskalkulation"></label>
        <button class="btn primary" id="exCreate">✨ Probeklausur erstellen</button>
      </div>
      <div class="muted" style="font-size:12.5px;margin-top:10px">Niveau: <b>${esc(settings.profile || "nicht festgelegt")}</b> · <a href="#" id="exProfile">ändern</a>
        ${s.files.some(f => /klassenarbeit|\bka\b|ka\.|probe|prüfung|pruefung|beispielka/i.test(f.name)) ? " · 👍 Alte Klassenarbeit erkannt – die Probeklausur orientiert sich daran." : " · 💡 Tipp: Lade eine alte Klassenarbeit hoch, dann passt der Stil noch besser."}</div>
      ${st?.state === "error" ? `<div class="err">⚠️ ${esc(st.error)}</div>` : ""}
    </div>
    ${exams.length ? `
    <div class="exam-list-head"><h3>Deine Probeklausuren</h3>${best !== null ? `<span class="chip">🏆 Beste: ${best} %</span>` : ""}</div>
    <div class="exam-list">${exams.map(e => examRow(e)).join("")}</div>` : ""}`;
  $("#exProfile").onclick = (e) => { e.preventDefault(); openSettings(); };
  $("#exCreate").onclick = async () => {
    try {
      await api(`/subjects/${s.id}/exams`, { json: { duration: +$("#exDur").value, focus: $("#exFocus").value } });
      toast("🧠 Die KI erstellt deine Probeklausur … (2–4 Minuten)");
      route();
    } catch (err) { toast(err.message); }
  };
  view.querySelectorAll(".exam-row").forEach(r => {
    r.onclick = (e) => {
      if (e.target.closest(".del")) return;
      location.hash = `#/s/${s.id}/exam/${r.dataset.id}`;
    };
    r.querySelector(".del").onclick = async () => {
      if (!confirm("Diese Probeklausur löschen?")) return;
      await api(`/subjects/${s.id}/exams/${r.dataset.id}`, { method: "DELETE" });
      route();
    };
  });
}

function examRow(e) {
  let badge;
  if (e.state === "graded") badge = `<span class="grade-badge g${e.grade}">${e.grade}</span><span class="muted">${fmtPts(e.score)}/${e.total} P. · ${e.percent} %</span>`;
  else if (e.state === "grading") badge = `<span class="chip"><span class="spinner" style="width:11px;height:11px"></span> wird korrigiert</span>`;
  else if (e.state === "submitted") badge = `<span class="chip hot">⚠ Korrektur fehlgeschlagen</span>`;
  else if (e.state === "running") badge = `<span class="chip warn">✎ ${e.answered}/${e.task_count} bearbeitet</span>`;
  else badge = `<span class="chip">Neu · ${e.duration} Min.</span>`;
  return `<div class="exam-row" data-id="${e.id}">
    <div style="min-width:0;flex:1"><b>${esc(e.title)}</b>
      <div class="muted" style="font-size:12px">${new Date(e.created * 1000).toLocaleDateString("de-DE", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })} · ${e.task_count} Aufgaben · ${e.total} Punkte</div></div>
    <div class="exam-row-r">${badge}<button class="icon-btn del" title="Löschen">✕</button></div></div>`;
}

/* ---------------------------------------------------------------- Tabellen zum Ausfüllen */
const NOTES_MARK = "Nebenrechnung / Erläuterung:";
const isEmptyCell = (c) => /^\s*(\?+|…|\.{2,}|_+)?\s*$/.test(c);

function mdTables(md) {
  const blocks = [];
  let cur = null, inCode = false;
  for (const line of String(md || "").split("\n")) {
    const l = line.trim();
    if (l.startsWith("```")) inCode = !inCode;
    if (!inCode && l.startsWith("|")) { if (!cur) blocks.push(cur = []); cur.push(l); }
    else cur = null;
  }
  const split = (r) => r.replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, "|"));
  return blocks.filter(b => b.length >= 3 && /^\|?\s*:?-{2,}/.test(b[1]))
    .map(b => ({ head: split(b[0]), body: b.slice(2).map(split) }));
}

function cellMd(v) { return String(v ?? "").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim(); }

/* Wandelt leere Zellen der Aufgaben-Tabellen in Eingabefelder um. Gibt null zurück, wenn es keine gibt. */
function makeFillTables(t, taskEl, savedAnswer, onChange) {
  const src = mdTables(t.task);
  const domTables = [...taskEl.querySelectorAll("table")];
  if (!src.length || src.length !== domTables.length) return null;
  const fill = src.map((tb, i) => ({ ...tb, dom: domTables[i], inputs: [] }))
    .filter(tb => tb.body.some(row => row.some(isEmptyCell)));
  if (!fill.length) return null;

  // Gespeicherte Antwort zurückholen
  const [tablePart, notes = ""] = String(savedAnswer || "").split(NOTES_MARK);
  const saved = mdTables(tablePart);

  fill.forEach((tb, ti) => {
    tb.dom.classList.add("fill-table");
    const rows = [...tb.dom.querySelectorAll("tbody tr")];
    tb.body.forEach((row, r) => {
      const tds = rows[r] ? [...rows[r].children] : [];
      row.forEach((cell, c) => {
        if (!isEmptyCell(cell) || !tds[c]) return;
        const inp = document.createElement("input");
        inp.className = "cell-in";
        inp.autocomplete = "off";
        inp.value = saved[ti]?.body[r]?.[c] ?? "";
        inp.dataset.r = r; inp.dataset.c = c;
        inp.oninput = onChange;
        inp.onkeydown = (e) => {  // Enter / Pfeiltasten wie in Excel
          const dir = e.key === "Enter" || e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
          if (!dir) return;
          e.preventDefault();
          const next = tb.inputs.find(x => +x.dataset.c === c && +x.dataset.r === r + dir);
          next?.focus(); next?.select();
        };
        tds[c].textContent = "";
        tds[c].classList.add("cell-edit");
        tds[c].appendChild(inp);
        tb.inputs.push(inp);
      });
    });
  });

  const serialize = (notesText) => {
    const any = fill.some(tb => tb.inputs.some(i => i.value.trim()));
    let out = "";
    if (any) {
      out = fill.map((tb, ti) => {
        const body = tb.body.map((row, r) => row.map((cell, c) => {
          const inp = tb.inputs.find(x => +x.dataset.r === r && +x.dataset.c === c);
          return cellMd(inp ? inp.value : cell);
        }));
        return (fill.length > 1 ? `Tabelle ${ti + 1}:\n` : "") + [tb.head.map(cellMd), tb.head.map(() => "---"), ...body]
          .map(r => `| ${r.join(" | ")} |`).join("\n");
      }).join("\n\n");
    }
    if (notesText.trim()) out += (out ? "\n\n" : "") + `${NOTES_MARK}\n${notesText.trim()}`;
    return out;
  };
  return { serialize, notes: notes.replace(/^\s*\n/, ""), first: fill[0].inputs[0] };
}

function fmtPts(n) { return String(Math.round(n * 2) / 2).replace(".", ","); }

/* ---------------------------------------------------------------- Klausur öffnen */
async function openExam(s, view, eid) {
  let exam;
  try { exam = await api(`/subjects/${s.id}/exams/${eid}`); } catch { location.hash = `#/s/${s.id}/exam`; return; }
  if (exam.state === "graded") return showResult(s, view, exam);
  if (exam.state === "grading" || exam.state === "submitted") return showGrading(s, view, exam);
  if (!exam.started) return showStart(s, view, exam);
  return showWriting(s, view, exam);
}

function examBackLink(s) {
  return `<a href="#/s/${s.id}/exam" class="back-link">← Alle Probeklausuren</a>`;
}

function showStart(s, view, exam) {
  view.innerHTML = `${examBackLink(s)}
    <div class="card exam-start">
      <div class="exam-icon big">📝</div>
      <h2>${esc(exam.title)}</h2>
      <div class="exam-facts">
        <div><b>${exam.duration}</b><span>Minuten</span></div>
        <div><b>${exam.tasks.length}</b><span>Aufgaben</span></div>
        <div><b>${exam.total}</b><span>Punkte</span></div>
      </div>
      <ul class="exam-rules">
        <li>Hilfsmittel: nur ein Taschenrechner – wie in der echten Arbeit.</li>
        <li>Deine Antworten werden automatisch gespeichert. Du kannst zwischendurch aufhören und später weitermachen.</li>
        <li>Rechenaufgaben: Schreib den Rechenweg auf – dafür gibt es Teilpunkte.</li>
        <li>Am Ende auf <b>„Abgeben“</b> klicken: Die KI korrigiert nach Erwartungshorizont und gibt dir eine Note.</li>
      </ul>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="btn primary" id="exStart">▶ Klausur starten</button>
        <button class="btn" id="exPrint">🖨 Ausdrucken (auf Papier lösen)</button>
      </div>
    </div>`;
  $("#exStart").onclick = async () => {
    const r = await api(`/subjects/${s.id}/exams/${exam.id}/answers`, { json: { answers: {}, start: true } });
    exam.started = r.started; exam.state = "running";
    showWriting(s, view, exam);
  };
  $("#exPrint").onclick = () => printExam(exam);
}

function taskHead(t, extra = "") {
  return `<div class="task-head"><div><span class="task-nr">Aufgabe ${esc(t.number)}</span><span class="task-title">${esc(t.title)}</span></div>
    <div style="display:flex;gap:6px;align-items:center">${extra}<span class="chip">${t.points} P.</span></div></div>`;
}

function showWriting(s, view, exam) {
  state.examActive = true;
  view.innerHTML = `
    <div class="exam-bar">
      ${examBackLink(s)}
      <div class="exam-bar-r">
        <span class="save-state" id="saveState">✓ gespeichert</span>
        <span class="timer" id="timer">--:--</span>
        <button class="btn primary sm" id="exSubmit">Abgeben ✓</button>
      </div>
    </div>
    <h2 style="margin:4px 0 14px">${esc(exam.title)}</h2>
    <div class="card situation"><div class="lbl">Ausgangssituation</div><div class="md" id="sit"></div></div>
    <div id="tasks"></div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">
      <button class="btn" id="exPrint2">🖨 Drucken</button>
      <button class="btn primary" id="exSubmit2">Klausur abgeben & bewerten lassen ✓</button>
    </div>`;
  renderMd(exam.situation, $("#sit"));
  const wrap = $("#tasks");
  for (const t of exam.tasks) {
    const el = document.createElement("div");
    el.className = "card task";
    el.innerHTML = `${taskHead(t, `<span class="fmt">${FORMAT_LABEL[t.answer_format] || ""}</span>`)}
      <div class="md task-text"></div>
      <textarea class="answer ${["code", "calculation", "table"].includes(t.answer_format) ? "mono" : ""}" rows="${t.answer_format === "text" ? 5 : 8}"
        placeholder="${esc(FORMAT_PH[t.answer_format] || FORMAT_PH.text)}" spellcheck="${t.answer_format === "text"}"></textarea>`;
    renderMd(t.task, el.querySelector(".task-text"));
    const ta = el.querySelector("textarea");
    const update = () => { exam.answers[t.number] = fillTab ? fillTab.serialize(ta.value) : ta.value; scheduleSave(); };
    const fillTab = makeFillTables(t, el.querySelector(".task-text"), exam.answers[t.number], update);
    let minH = 120;
    if (fillTab) {  // Tabelle wird direkt ausgefüllt – Textfeld nur noch für Nebenrechnungen
      ta.value = fillTab.notes;
      ta.rows = 3; minH = 70;
      ta.placeholder = "Nebenrechnungen / Erläuterungen (optional) – z. B. kv = Kv / Menge";
      ta.insertAdjacentHTML("beforebegin", `<div class="fill-hint">✍️ Trag deine Werte direkt in die Tabelle oben ein · <kbd>Tab</kbd> nächste Zelle · <kbd>Enter</kbd> Zelle darunter</div>`);
    } else {
      ta.value = exam.answers[t.number] || "";
    }
    const grow = () => { ta.style.height = "auto"; ta.style.height = Math.max(ta.scrollHeight + 2, minH) + "px"; };
    ta.oninput = () => { grow(); update(); };
    ta.onkeydown = (e) => {  // Tab rückt in Code-Feldern ein, statt das Feld zu verlassen
      if (e.key === "Tab" && ta.classList.contains("mono")) {
        e.preventDefault();
        const a = ta.selectionStart;
        ta.setRangeText("    ", a, ta.selectionEnd, "end");
        ta.oninput();
      }
    };
    wrap.appendChild(el);
    requestAnimationFrame(grow);
  }

  // Automatisch speichern
  let saveT = null;
  const saveState = $("#saveState");
  const save = async () => {
    try {
      await api(`/subjects/${s.id}/exams/${exam.id}/answers`, { json: { answers: exam.answers } });
      saveState.textContent = "✓ gespeichert"; saveState.classList.remove("dirty");
    } catch { saveState.textContent = "⚠ nicht gespeichert"; }
  };
  function scheduleSave() {
    saveState.textContent = "… speichert"; saveState.classList.add("dirty");
    clearTimeout(saveT); saveT = setTimeout(save, 800);
  }

  // Timer
  const timer = $("#timer");
  let warned = false;
  const tick = () => {
    const left = Math.round(exam.duration * 60 - (Date.now() / 1000 - exam.started));
    const abs = Math.abs(left);
    timer.textContent = (left < 0 ? "+" : "") + `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
    timer.classList.toggle("low", left <= 300 && left > 0);
    timer.classList.toggle("over", left <= 0);
    timer.title = left <= 0 ? "Zeit abgelaufen – du kannst trotzdem fertig schreiben" : "verbleibende Zeit";
    if (left <= 0 && !warned) { warned = true; toast("⏰ Die Zeit ist um! In der echten Arbeit müsstest du jetzt abgeben.", 6000); }
  };
  tick();
  clearInterval(state.examTimer);
  state.examTimer = setInterval(tick, 1000);

  const submit = async () => {
    const empty = exam.tasks.filter(t => !(exam.answers[t.number] || "").trim()).length;
    if (!confirm(empty ? `${empty} Aufgabe(n) sind noch leer. Trotzdem abgeben?` : "Klausur abgeben und bewerten lassen?")) return;
    clearTimeout(saveT);
    await save();
    try {
      await api(`/subjects/${s.id}/exams/${exam.id}/submit`, { json: {} });
      clearInterval(state.examTimer);
      state.examActive = false;
      exam.state = "grading";
      showGrading(s, view, exam);
    } catch (e) { toast(e.message); }
  };
  $("#exSubmit").onclick = submit;
  $("#exSubmit2").onclick = submit;
  $("#exPrint2").onclick = () => printExam(exam);
}

/* ---------------------------------------------------------------- Korrektur läuft */
function showGrading(s, view, exam) {
  if (exam.state === "submitted") {
    view.innerHTML = `${examBackLink(s)}<div class="card empty"><div class="em">⚠️</div><h2>Korrektur hat nicht geklappt</h2>
      <div class="err" style="text-align:left">${esc(exam.error || "Unbekannter Fehler")}</div>
      <p>Deine Antworten sind gespeichert.</p><button class="btn primary" id="exRetry">↻ Nochmal bewerten lassen</button></div>`;
    $("#exRetry").onclick = async () => {
      try { await api(`/subjects/${s.id}/exams/${exam.id}/submit`, { json: {} }); exam.state = "grading"; showGrading(s, view, exam); }
      catch (e) { toast(e.message); }
    };
    return;
  }
  view.innerHTML = `${examBackLink(s)}<div class="card loading-card"><div class="spinner"></div><h3>Deine Klausur wird korrigiert …</h3>
    <p class="muted">Die KI vergleicht jede Antwort mit Musterlösung und Erwartungshorizont<br>und vergibt Teilpunkte. Das dauert ca. 1–2 Minuten.</p></div>`;
  const poll = async () => {
    if (!location.hash.includes(exam.id)) return;
    const e = await api(`/subjects/${s.id}/exams/${exam.id}`).catch(() => null);
    if (e && e.state === "graded") { loadSubjects(); toast("✅ Deine Probeklausur ist bewertet!"); return showResult(s, view, e); }
    if (e && e.state === "submitted") return showGrading(s, view, e);
    state.examPoll = setTimeout(poll, 3000);
  };
  clearTimeout(state.examPoll);
  state.examPoll = setTimeout(poll, 3000);
}

/* ---------------------------------------------------------------- Ergebnis */
function showResult(s, view, exam) {
  const C = 2 * Math.PI * 62;
  view.innerHTML = `${examBackLink(s)}
    <div class="card result-head">
      <div class="score-ring" style="width:150px;height:150px;margin:0">
        <svg width="150" height="150"><circle cx="75" cy="75" r="62" stroke="var(--line)" stroke-width="11" fill="none"/>
          <circle cx="75" cy="75" r="62" stroke="var(--grade-c)" stroke-width="11" fill="none" stroke-linecap="round"
            stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - exam.percent / 100)}" style="transition:stroke-dashoffset 1s"/></svg>
        <div class="v" style="flex-direction:column;display:flex;align-items:center;justify-content:center;line-height:1.1">
          <span style="font-size:44px">${exam.grade}</span><span style="font-size:13px;font-weight:600;color:var(--muted)">${esc(exam.grade_word)}</span></div>
      </div>
      <div style="flex:1;min-width:240px">
        <div class="muted" style="font-size:13px">${esc(exam.title)}</div>
        <h2 style="margin:2px 0 8px">${fmtPts(exam.score)} von ${exam.total} Punkten · ${String(exam.percent).replace(".", ",")} %</h2>
        <div class="md" id="overall"></div>
        ${exam.to_review?.length ? `<div class="review"><span class="muted" style="font-size:12px">Nochmal üben:</span> ${exam.to_review.map(t => `<span class="chip warn">${esc(t)}</span>`).join(" ")}</div>` : ""}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
          <button class="btn primary sm" id="exChat">💬 Fehler im Chat besprechen</button>
          <button class="btn sm" id="exNew">📝 Neue Probeklausur</button>
          <button class="btn sm" id="exPrint3">🖨 Drucken mit Lösungen</button>
        </div>
        <div class="muted" style="font-size:11.5px;margin-top:10px">IHK-Notenschlüssel: ab 92 % = 1 · 81 % = 2 · 67 % = 3 · 50 % = 4 · 30 % = 5</div>
      </div>
    </div>
    <div class="card situation"><div class="lbl">Ausgangssituation</div><div class="md" id="sit"></div></div>
    <div id="tasks"></div>`;
  view.querySelector(".result-head").style.setProperty("--grade-c", gradeColor(exam.grade));
  renderMd(exam.overall_feedback, $("#overall"));
  renderMd(exam.situation, $("#sit"));
  const wrap = $("#tasks");
  for (const t of exam.tasks) {
    const r = exam.results?.[t.number] || { points: 0, feedback: "" };
    const pct = r.points / t.points;
    const cls = pct >= 0.85 ? "good" : pct >= 0.5 ? "mid" : "bad";
    const ans = (exam.answers[t.number] || "").trim();
    const el = document.createElement("div");
    el.className = `card task graded ${cls}`;
    el.innerHTML = `${taskHead(t, `<span class="pts ${cls}">${fmtPts(r.points)} / ${t.points}</span>`).replace(`<span class="chip">${t.points} P.</span>`, "")}
      <div class="bar"><i style="width:${pct * 100}%"></i></div>
      <details class="task-q"><summary>Aufgabenstellung</summary><div class="md"></div></details>
      <div class="lbl">Deine Antwort</div>
      ${ans && mdTables(ans).length ? `<div class="your-answer md table-answer"></div>`
        : `<pre class="your-answer ${ans ? "" : "empty"}">${esc(ans || "(keine Antwort)")}</pre>`}
      <div class="feedback"><b>Rückmeldung:</b> <span class="md fb"></span></div>
      <details class="sol" ${pct < 0.85 ? "open" : ""}><summary>✅ Musterlösung</summary><div class="md"></div></details>
      <details class="sol"><summary>📋 Erwartungshorizont</summary><div class="md"></div></details>`;
    const mds = el.querySelectorAll("details .md");
    renderMd(t.task, mds[0]);
    renderMd(t.solution, mds[1]);
    renderMd(t.criteria, mds[2]);
    renderMd(r.feedback, el.querySelector(".fb"));
    if (el.querySelector(".table-answer")) renderMd(ans, el.querySelector(".table-answer"));
    el.querySelectorAll(".fb p").forEach(p => p.replaceWith(...p.childNodes));
    wrap.appendChild(el);
  }
  $("#exNew").onclick = () => (location.hash = `#/s/${s.id}/exam`);
  $("#exPrint3").onclick = () => printExam(exam, true);
  $("#exChat").onclick = () => {
    const weak = exam.tasks.filter(t => (exam.results?.[t.number]?.points || 0) < t.points * 0.85)
      .map(t => `Aufgabe ${t.number} (${t.title}): ${fmtPts(exam.results?.[t.number]?.points || 0)}/${t.points} P.`);
    state.chatDraft = `Ich habe die Probeklausur „${exam.title}“ geschrieben: ${fmtPts(exam.score)}/${exam.total} Punkte (Note ${exam.grade}).\n`
      + (weak.length ? `Schwach war ich bei:\n- ${weak.join("\n- ")}\n` : "")
      + (exam.to_review?.length ? `Themen zum Üben: ${exam.to_review.join(", ")}.\n` : "")
      + "Erklär mir bitte, was ich falsch gemacht habe, und gib mir eine ähnliche Übungsaufgabe.";
    location.hash = `#/s/${s.id}/chat`;
  };
}

function gradeColor(g) {
  return { 1: "#34d399", 2: "#4ade80", 3: "#facc15", 4: "#fb923c", 5: "#f87171", 6: "#ef4444" }[g] || "#8b5cf6";
}

/* ---------------------------------------------------------------- Drucken */
function printExam(exam, withSolutions = false) {
  const md = (x) => { const d = document.createElement("div"); renderMd(x, d); return d.innerHTML; };
  const tasks = exam.tasks.map(t => `
    <section><h3>Aufgabe ${esc(t.number)}: ${esc(t.title)} <span class="p">${t.points} Punkte</span></h3>
    ${md(t.task)}
    ${withSolutions
      ? `<div class="ans"><b>Deine Antwort:</b><pre>${esc(exam.answers?.[t.number] || "–")}</pre>
         ${exam.results ? `<b>Punkte: ${fmtPts(exam.results[t.number]?.points || 0)}/${t.points}</b> – ${esc(exam.results[t.number]?.feedback || "")}` : ""}</div>
         <div class="sol"><b>Musterlösung</b>${md(t.solution || "")}</div>`
      : `<div class="lines"></div>`}</section>`).join("");
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>${esc(exam.title)}</title><link rel="stylesheet" href="${location.origin}/vendor/katex.min.css">
    <style>body{font-family:Inter,system-ui,sans-serif;max-width:820px;margin:24px auto;line-height:1.55;color:#111;font-size:14px}
    h1{font-size:22px;margin:0}.meta{color:#555;margin:4px 0 16px}.name{border-bottom:1px solid #999;width:260px;display:inline-block}
    .sit{background:#f3f4f8;border-left:4px solid #6d4ae0;padding:8px 14px;margin:12px 0}
    section{break-inside:avoid-page;margin:18px 0}h3{font-size:15px;border-bottom:1px solid #ccc;padding-bottom:4px;display:flex;justify-content:space-between}
    .p{font-weight:400;color:#555}table{border-collapse:collapse;margin:6px 0}td,th{border:1px solid #aaa;padding:3px 8px}
    .lines{height:190px;background:repeating-linear-gradient(#fff 0 27px,#ccc 27px 28px);margin-top:8px}
    pre{white-space:pre-wrap;background:#f6f6f6;padding:6px 10px;font-size:12.5px}.sol{background:#eefaf3;padding:6px 12px;margin-top:8px}</style>
    </head><body><h1>${esc(exam.title)}</h1>
    <div class="meta">Bearbeitungszeit: ${exam.duration} Minuten · ${exam.total} Punkte · Hilfsmittel: Taschenrechner · Name: <span class="name">&nbsp;</span></div>
    <div class="sit"><b>Ausgangssituation</b>${md(exam.situation)}</div>${tasks}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 700);
}
