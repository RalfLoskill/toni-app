// ================================================================
// TONI – api/agent.js
// Echter KI-Assistent powered by Claude
// ================================================================
// Empfängt: { agentType, context (= STATE) }
// Sendet:   { message, ui_updates }
// ================================================================

export default async function handler(req, res) {

  // Nur POST erlaubt
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // API Key prüfen
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({
      message: 'TONI ist gerade nicht verfügbar. (API Key fehlt)',
      ui_updates: {}
    });
  }

  const { agentType, context } = req.body || {};

  // ================================================================
  // SONDERFALL: Lernreisen-Generator (journey_builder)
  // Eigener Zweig – nutzt ein stärkeres Modell und viele Tokens und gibt
  // ein journey-Objekt zurück (NICHT message/ui_updates). Der bestehende
  // Chat-/Hinweis-Ablauf darunter bleibt unberührt.
  // Erwartet: { agentType:"journey_builder", prompt:"<Leitfragen-Prompt>" }
  // Antwortet: { journey:{...} } oder { error:"..." }
  // ================================================================
  if (agentType === 'journey_builder') {
    const prompt = (req.body && typeof req.body.prompt === 'string') ? req.body.prompt.trim() : '';
    if (!prompt) {
      return res.status(400).json({ error: 'Kein Prompt übergeben.' });
    }
    if (prompt.length > 8000) {
      return res.status(413).json({ error: 'Prompt zu lang.' });
    }

    const JOURNEY_SYSTEM = `Du bist Autor:in für die Lernplattform TONi. Erzeuge eine vollständige Lernreise als JSON.
Antworte AUSSCHLIESSLICH mit einem einzigen gültigen JSON-Objekt – KEIN Markdown, KEINE Code-Fences, KEIN Text davor oder danach.
Liefere NUR das "journey"-Objekt (NICHT die Datei-Hülle mit format/version).

Struktur:
{
 "title": string, "subject": string, "goal": string, "description": string,
 "theme": "classic", "cover_image": "", "cover_image_name": "",
 "steps": [
   { "id":"station-1", "title":string, "subtitle":string, "description":string,
     "tasks":[
       { "id":"task-1-1", "type":"Lerninhalt"|"Aufgabe"|"Quiz"|"Video"|"Reflexion",
         "title":string, "answer":"", "status":"todo", "required":true,
         "description":string, "content":string }
     ] }
 ]
}
Typ-Zusatzfelder:
- Lerninhalt: content (Lerntext, HTML wie <b> erlaubt). Optional blocks:[{"type":"image","url":<SVG-Data-URL>,"alt":string}].
- Quiz: quiz_data:{questions:[{question, options:[...], correct_index (0-basiert), explanation}]}.
- Video: youtube_video_id:"" (LEER lassen, KEINE ID erfinden – Tutor trägt sie nach).
- Aufgabe: solution (Musterlösung). Optional expected_answer + expected_unit.
- Reflexion: reflexion_prompt, reflexion_scales:[{label}], reflexion_helpers:[...].
Bilder: KEIN Upload. Falls sinnvoll, zeichne ein gültiges SVG und bette es als Data-URL ein:
"url":"data:image/svg+xml;utf8,<svg ...>...</svg>" – nur rect/circle/line/path/text, kompakt. Mind. eine Grafik erwünscht.
Inhalt: didaktisch sinnvoll, fachlich korrekt, Deutsch, altersgerecht. Pro Station mehrere Aufgaben; über die Reise alle fünf Typen.`;

    try {
      const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: process.env.TONI_AI_JOURNEY_MODEL || 'claude-sonnet-4-6',
          max_tokens: 16000,
          system: JOURNEY_SYSTEM,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!aiResp.ok) {
        const detail = await aiResp.text().catch(() => '');
        console.error('journey_builder Claude-Fehler:', detail.slice(0, 500));
        return res.status(502).json({ error: 'KI-Dienst nicht erreichbar.' });
      }

      const data = await aiResp.json();
      const text = (data.content || []).map(b => (b && b.type === 'text' ? b.text : '')).join('').trim();

      // JSON robust herauslösen.
      let jsonText = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
      const first = jsonText.indexOf('{');
      const last = jsonText.lastIndexOf('}');
      if (first !== -1 && last !== -1) jsonText = jsonText.slice(first, last + 1);

      let journey;
      try {
        journey = JSON.parse(jsonText);
      } catch (e) {
        return res.status(422).json({ error: 'Die KI-Antwort war kein gültiges JSON.' });
      }

      if (!journey || typeof journey !== 'object' || !journey.title || !Array.isArray(journey.steps) || journey.steps.length === 0) {
        return res.status(422).json({ error: 'Die erzeugte Lernreise ist unvollständig (title/steps fehlen).' });
      }

      // Pflicht-Defaults defensiv nachziehen.
      journey.theme = journey.theme || 'classic';
      journey.steps.forEach((s, si) => {
        s.id = s.id || ('station-' + (si + 1));
        (s.tasks || []).forEach((t, ti) => {
          t.id = t.id || ('task-' + (si + 1) + '-' + (ti + 1));
          if (typeof t.answer !== 'string') t.answer = '';
          if (!t.status) t.status = 'todo';
          if (typeof t.required !== 'boolean') t.required = true;
        });
      });

      return res.status(200).json({ journey });
    } catch (err) {
      console.error('journey_builder Fehler:', err);
      return res.status(500).json({ error: 'Unerwarteter Fehler bei der Generierung.' });
    }
  }

  if (!context) {
    return res.status(400).json({
      message: 'Kein Kontext übermittelt.',
      ui_updates: {}
    });
  }

  // ----------------------------------------------------------------
  // System-Prompt je nach Agent-Typ
  // ----------------------------------------------------------------
  const systemPrompts = {

    task_agent: `Du bist TONI, ein freundlicher und motivierender Lernassistent für Berufsschüler.
Der Schüler möchte mit der nächsten sinnvollen Aufgabe in seiner Lernreise weitermachen.
Schau dir den aktuellen Lernreise-Stand an (aktuelle Station, erledigte und offene Aufgaben).
Empfiehl konkret die nächste offene Aufgabe und erkläre in einem Satz, warum sie jetzt dran ist.
Die Aufgabe wird dem Schüler direkt nach deiner Antwort automatisch geöffnet – kündige das kurz an
(z.B. "Ich öffne sie dir gleich").
Halte deine Antwort kurz und motivierend (2-4 Sätze).
Sprich den Schüler direkt mit seinem Namen an.
Antworte auf Deutsch.`,

    project_agent: `Du bist TONI, ein freundlicher Lernassistent für Berufsschüler.
Du gibst einen übersichtlichen Status der echten Projekte und Gruppenaufgaben des Schülers.
Priorisiere klar: zuerst blockierte Aufgaben (sie bremsen die ganze Gruppe), dann überfällige,
dann nicht zugewiesene. Sprich Verbindlichkeiten freundlich, aber deutlich an – wer auf wen wartet
und was die Gruppe voranbringt.
Schlage konkrete nächste Schritte vor.
Halte deine Antwort strukturiert, aber nicht zu lang (5-7 Sätze).
Sprich den Schüler direkt mit seinem Namen an.
Antworte auf Deutsch.`,

    collab_agent: `Du bist TONI, ein freundlicher Lernassistent für Berufsschüler.
Du hilfst dabei, Gruppenaufgaben sinnvoll zu verteilen und die Zusammenarbeit zu verbessern.
Schau dir den Stand der Teammitglieder an und schlage vor, wer was als nächstes tun sollte.
Berücksichtige dabei Blockaden und Fälligkeitsdaten.
Halte deine Antwort praktisch und konkret (4-6 Sätze).
Sprich den Schüler direkt mit seinem Namen an.
Antworte auf Deutsch.`,

    goal_agent: `Du bist TONI, ein freundlicher Lernassistent für Berufsschüler.
Der Schüler möchte seinen Stand in der aktuellen Lernreise prüfen.
Gib einen Überblick anhand des echten Lernreise-Kontexts: Fortschritt, abgeschlossene Stationen,
aktuelle Station und welche Pflichtaufgaben dort noch offen sind.
Zeige auf, was schon gut läuft, und nenne konkret, was als Nächstes ansteht.
Motiviere den Schüler und erinnere ihn an das Lernziel der Reise.
Halte deine Antwort ermutigend und konkret (4-6 Sätze).
Sprich den Schüler direkt mit seinem Namen an.
Antworte auf Deutsch.`,

    reflection_agent: `Du bist TONI, ein einfühlsamer Lernassistent für Berufsschüler.
Du leitest eine kurze Lernreflexion an.
Stelle 2-3 gezielte Reflexionsfragen basierend auf dem aktuellen Lernstand.
Fragen können sein: Was hat gut geklappt? Was war schwierig? Was nimmst du mit?
Halte deine Antwort offen und einladend (3-4 Sätze + Fragen).
Sprich den Schüler direkt mit seinem Namen an.
Antworte auf Deutsch.`,

    explanation_agent: `Du bist TONI, ein kompetenter und geduldiger Lernassistent für Berufsschüler.
Du beantwortest Fragen und erklärst Konzepte verständlich.
Nutze den Lernkontext des Schülers um deine Erklärungen relevant zu machen.
Bei Fachfragen (z.B. Elektrotechnik, Mathematik): erkläre schrittweise mit Beispielen.
Bei organisatorischen Fragen: beziehe dich auf den aktuellen Stand des Schülers.
Halte deine Antworten klar und nicht zu lang.
Sprich den Schüler direkt mit seinem Namen an.
Antworte auf Deutsch.`
  };

  const systemPrompt = systemPrompts[agentType] || systemPrompts.explanation_agent;

  // ----------------------------------------------------------------
  // Kontext aufbereiten
  // ----------------------------------------------------------------
  const contextSummary = buildContextSummary(context);

  // ----------------------------------------------------------------
  // Gesprächsverlauf aufbereiten
  // Maximal die letzten 10 Nachrichten (5 hin und zurück)
  // ----------------------------------------------------------------
  const chatHistory = (context.chatHistory || [])
    .slice(-10)
    .map(msg => ({
      role: msg.role === 'toni' ? 'assistant' : msg.role,
      content: msg.content
    }))
    .filter(msg => msg.role === 'user' || msg.role === 'assistant');

  // Letzte Nutzernachricht aus History holen
  const lastUserMessage = chatHistory
    .filter(m => m.role === 'user')
    .slice(-1)[0]?.content || 'Hilf mir bitte.';

  // History ohne letzte Nutzernachricht (die kommt separat)
  const historyWithoutLast = chatHistory.slice(0, -1);

  // ----------------------------------------------------------------
  // Nachrichten zusammenbauen
  // ----------------------------------------------------------------
  const messages = [
    // Kontext als erste System-ähnliche Nutzernachricht
    {
      role: 'user',
      content: `Hier ist mein aktueller Lernstand:\n\n${contextSummary}`
    },
    {
      role: 'assistant',
      content: `Verstanden! Ich habe deinen aktuellen Stand gespeichert und helfe dir gleich weiter.`
    },
    // Bisheriger Gesprächsverlauf
    ...historyWithoutLast,
    // Aktuelle Nutzernachricht
    {
      role: 'user',
      content: lastUserMessage
    }
  ];

  // ----------------------------------------------------------------
  // Claude API aufrufen
  // ----------------------------------------------------------------
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Claude API Fehler:', JSON.stringify(error));
      return res.status(200).json({
        message: 'Entschuldigung, ich bin gerade kurz nicht erreichbar. Bitte versuche es nochmal.',
        ui_updates: {}
      });
    }

    const data = await response.json();
    const message = data.content?.[0]?.text || 'Ich konnte keine Antwort generieren.';

    return res.status(200).json({
      message,
      ui_updates: {}
    });

  } catch (error) {
    console.error('Agent Fehler:', error);
    return res.status(200).json({
      message: 'Entschuldigung, da ist etwas schiefgelaufen. Bitte versuche es nochmal.',
      ui_updates: {}
    });
  }
}

// ----------------------------------------------------------------
// Hilfsfunktion: Kontext in lesbaren Text umwandeln
// ----------------------------------------------------------------
function buildContextSummary(ctx) {
  const lines = [];

  // ----------------------------------------------------------------
  // ECHTER LERNREISE-KONTEXT (Baustein 1) – hat Vorrang.
  // Wird clientseitig aus der aktiven Lernreise erstellt und als
  // ctx.journeyContext mitgeschickt. Wenn vorhanden, beschreibt er
  // den tatsächlichen Stand des Schülers.
  // ----------------------------------------------------------------
  const jc = ctx.journeyContext;
  const pc = ctx.projectContext;
  let hasReal = false;

  if (jc && jc.title) {
    hasReal = true;
    if (ctx.user) {
      lines.push(`SCHÜLER: ${ctx.user.name || 'Unbekannt'}, Klasse: ${ctx.user.class || '-'}`);
    }
    lines.push(`\nAKTUELLE LERNREISE: "${jc.title}"${jc.subject ? ` (${jc.subject})` : ''}`);
    if (jc.goal) lines.push(`LERNZIEL: ${jc.goal}`);
    if (jc.progressPct !== null && jc.progressPct !== undefined) lines.push(`FORTSCHRITT: ${jc.progressPct}%`);
    if (jc.doneStations && jc.doneStations.length) {
      lines.push(`ABGESCHLOSSENE STATIONEN: ${jc.doneStations.join(', ')}`);
    }
    if (jc.currentStation) {
      lines.push(`AKTUELLE STATION: ${jc.currentStation}${jc.currentStationSubtitle ? ` – ${jc.currentStationSubtitle}` : ''}`);
    }
    if (jc.currentDone && jc.currentDone.length) {
      lines.push(`  davon erledigt: ${jc.currentDone.join(', ')}`);
    }
    if (jc.currentOpen && jc.currentOpen.length) {
      lines.push(`  noch offen: ${jc.currentOpen.join(', ')}`);
    }
    // Aktuell geöffnete Aufgabe – der Schüler arbeitet gerade hieran.
    if (jc.openTask && jc.openTask.title) {
      const ot = jc.openTask;
      lines.push(`\nDER SCHÜLER ARBEITET GERADE AN DIESER AUFGABE:`);
      lines.push(`  Titel: ${ot.title}${ot.type ? ` (${ot.type})` : ''}`);
      if (ot.prompt) lines.push(`  Aufgabenstellung: ${ot.prompt}`);
      if (ot.studentAnswer) lines.push(`  Bisherige Eingabe des Schülers: ${ot.studentAnswer}`);
      else lines.push(`  Der Schüler hat noch nichts eingegeben.`);
      lines.push(`  Hilf ihm, selbst auf die Lösung zu kommen – gib Hinweise und stelle Fragen, statt die Lösung einfach zu verraten.`);
    }
  }

  // ----------------------------------------------------------------
  // ECHTER PROJEKT-KONTEXT inkl. Verbindlichkeiten.
  // Wird als ctx.projectContext mitgeschickt. Betont, was die Gruppe
  // blockiert, was überfällig ist und was noch niemandem zugewiesen ist.
  // ----------------------------------------------------------------
  if (pc && pc.projectCount) {
    hasReal = true;
    if (ctx.user && !jc) {
      lines.push(`SCHÜLER: ${ctx.user.name || 'Unbekannt'}, Klasse: ${ctx.user.class || '-'}`);
    }
    lines.push(`\nPROJEKTE (${pc.projectCount}):`);
    (pc.projects || []).forEach(p => {
      const parts = [`  - "${p.title}"`];
      if (p.type) parts.push(p.type === 'group' ? '(Gruppe)' : '(Solo)');
      parts.push(`${p.progressPct}%`);
      if (p.deadline) parts.push(`Deadline ${p.deadline}${p.deadlineOverdue ? ' ⚠ überfällig' : ''}`);
      if (p.hasBlocker) parts.push('⚠ Blocker');
      lines.push(parts.join(' '));
    });

    if (pc.blocked && pc.blocked.length) {
      lines.push(`\n⚠ BLOCKIERTE AUFGABEN (bremsen die ganze Gruppe – zuerst klären!):`);
      pc.blocked.forEach(t => {
        lines.push(`  - "${t.title}" (Projekt: ${t.project})${t.assignee ? `, zuständig: ${t.assignee}` : ', nicht zugewiesen'} – Blocker: ${t.blocker}`);
      });
    }
    if (pc.overdue && pc.overdue.length) {
      lines.push(`\n⚠ ÜBERFÄLLIGE AUFGABEN:`);
      pc.overdue.forEach(t => {
        lines.push(`  - "${t.title}" (Projekt: ${t.project})${t.assignee ? `, zuständig: ${t.assignee}` : ''}, fällig war: ${t.dueDate}`);
      });
    }
    if (pc.unassigned && pc.unassigned.length) {
      lines.push(`\nNOCH NIEMANDEM ZUGEWIESEN:`);
      pc.unassigned.forEach(t => {
        lines.push(`  - "${t.title}" (Projekt: ${t.project})`);
      });
    }
    if (pc.otherOpen && pc.otherOpen.length) {
      lines.push(`\nWEITERE OFFENE AUFGABEN:`);
      pc.otherOpen.forEach(t => {
        lines.push(`  - "${t.title}" (Projekt: ${t.project})${t.assignee ? `, zuständig: ${t.assignee}` : ''}${t.dueDate ? `, fällig: ${t.dueDate}` : ''}`);
      });
    }
    lines.push(`\nIn Gruppenprojekten gilt: Wenn eine Aufgabe blockiert oder überfällig ist, betrifft das oft auch andere Mitglieder. Sprich solche Verbindlichkeiten freundlich, aber klar an – wer auf wen wartet und was die Gruppe voranbringt.`);
  }

  if (hasReal) {
    lines.push(`\nBitte beziehe dich auf diese realen Daten des Schülers, nicht auf Beispieldaten.`);
    return lines.join('\n');
  }

  // ----------------------------------------------------------------
  // Fallback: bisheriger (Demo-/Projekt-)Kontext, wenn keine aktive
  // Lernreise mitgeschickt wurde.
  // ----------------------------------------------------------------

  // Nutzer
  if (ctx.user) {
    lines.push(`SCHÜLER: ${ctx.user.name || 'Unbekannt'}, Klasse: ${ctx.user.class || '-'}`);
  }

  // Aktuelles Thema
  if (ctx.currentTopic) {
    lines.push(`AKTUELLES THEMA: ${ctx.currentTopic}`);
  }

  // Lernreise / Fortschritt
  if (ctx.progress) {
    lines.push(`\nLERNFORTSCHRITT:`);
    Object.entries(ctx.progress).forEach(([key, val]) => {
      const label = key.replace(/_/g, ' ');
      lines.push(`  - ${label}: ${val}%`);
    });
  }

  // Ziele
  if (ctx.goals) {
    lines.push(`\nWOCHENZIEL: ${ctx.goals.weekly || '-'}`);
    if (ctx.goals.completed?.length) {
      lines.push(`ABGESCHLOSSEN: ${ctx.goals.completed.join(', ')}`);
    }
    if (ctx.goals.open?.length) {
      lines.push(`OFFEN: ${ctx.goals.open.join(', ')}`);
    }
  }

  // Projekte
  if (ctx.projects?.length) {
    lines.push(`\nPROJEKTE:`);
    ctx.projects.forEach(p => {
      lines.push(`  - ${p.title} (${p.type}): ${p.progress}%${p.blocker ? ` ⚠️ Blocker: ${p.blocker}` : ''}`);
    });
  }

  // Kanban
  if (ctx.kanban) {
    lines.push(`\nKANBAN:`);
    if (ctx.kanban.todo?.length) {
      lines.push(`  To Do: ${ctx.kanban.todo.join(', ')}`);
    }
    if (ctx.kanban.wip?.length) {
      lines.push(`  In Arbeit: ${ctx.kanban.wip.join(', ')}`);
    }
    if (ctx.kanban.review?.length) {
      lines.push(`  Zur Prüfung: ${ctx.kanban.review.join(', ')}`);
    }
    if (ctx.kanban.done?.length) {
      lines.push(`  Erledigt: ${ctx.kanban.done.join(', ')}`);
    }
  }

  // Team
  if (ctx.team?.length) {
    lines.push(`\nTEAM:`);
    ctx.team.forEach(m => {
      lines.push(`  - ${m.name}: ${m.task} (${m.progress}%)${m.due ? ` fällig: ${m.due}` : ''}`);
    });
  }

  return lines.join('\n');
}
