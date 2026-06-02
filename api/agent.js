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
Du gibst einen übersichtlichen Status der aktuellen Projekte und Gruppenarbeit.
Hebe besonders Blockaden und dringende Aufgaben hervor.
Schlage konkrete nächste Schritte vor.
Halte deine Antwort strukturiert aber nicht zu lang (5-7 Sätze).
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
  if (jc && jc.title) {
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
    lines.push(`\nBitte beziehe dich auf diese reale Lernreise des Schülers, nicht auf Beispieldaten.`);
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
