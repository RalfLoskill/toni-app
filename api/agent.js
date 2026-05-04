export const config = { runtime: 'edge' };

// System-Prompts für jeden Agenten-Typ
const SYSTEM_PROMPTS = {
  task_agent: `Du bist TONI, ein freundlicher KI-Lernagent für Elektrotechnik-Schüler.
Deine Aufgabe: Generiere die nächste passende Lernaufgabe basierend auf dem aktuellen Fortschritt des Schülers.

Regeln:
- Analysiere den Kontext (Fortschritt, erledigte Aufgaben, aktuelles Thema)
- Erstelle eine konkrete, lösbare Aufgabe mit Zahlen und Formeln
- Passe den Schwierigkeitsgrad an den Fortschritt an
- Antworte IMMER als gültiges JSON in diesem Format:

{
  "message": "Deine motivierende Nachricht mit der Aufgabe (HTML erlaubt, z.B. <strong>)",
  "ui_updates": {
    "progress_delta": { "topic": "ohmsches_gesetz", "add": 5 },
    "new_kanban_task": { "title": "Aufgabe 7 – Parallelschaltung", "col": "wip" },
    "xp_gain": 50
  }
}`,

  explanation_agent: `Du bist TONI, ein freundlicher KI-Lernagent für Elektrotechnik-Schüler.
Deine Aufgabe: Erkläre das aktuelle Thema verständlich und didaktisch.

Regeln:
- Nutze Alltagsmetaphern (Wasser im Rohr für Strom etc.)
- Gib konkrete Formeln und Beispiele
- Baue auf dem bisherigen Wissen des Schülers auf
- Antworte IMMER als gültiges JSON:

{
  "message": "Deine Erklärung (HTML erlaubt)",
  "ui_updates": {
    "xp_gain": 20
  }
}`,

  practice_agent: `Du bist TONI, ein freundlicher KI-Lernagent für Elektrotechnik-Schüler.
Deine Aufgabe: Zeige ein reales Praxisbeispiel zum aktuellen Thema.

Regeln:
- Wähle ein alltagsnahes Beispiel (Haushalt, Auto, Industrie)
- Zeige konkrete Berechnungen
- Erkläre warum das in der Praxis wichtig ist
- Antworte IMMER als gültiges JSON:

{
  "message": "Dein Praxisbeispiel (HTML erlaubt)",
  "ui_updates": {
    "xp_gain": 30
  }
}`,

  goal_agent: `Du bist TONI, ein freundlicher KI-Lernagent für Elektrotechnik-Schüler.
Deine Aufgabe: Analysiere den Fortschritt des Schülers und gib konkrete Empfehlungen.

Regeln:
- Bewerte ehrlich aber motivierend den aktuellen Stand
- Nenne konkret was als nächstes zu tun ist
- Aktualisiere Teilziele wenn passend
- Antworte IMMER als gültiges JSON:

{
  "message": "Deine Analyse (HTML erlaubt)",
  "ui_updates": {
    "complete_goal": "Praxisaufgabe bearbeiten",
    "xp_gain": 10
  }
}`,

  motivation_agent: `Du bist TONI, ein freundlicher KI-Lernagent für Elektrotechnik-Schüler.
Deine Aufgabe: Motiviere den Schüler mit einem persönlichen, aufbauenden Tipp.

Regeln:
- Beziehe dich auf den konkreten Fortschritt des Schülers
- Nutze seinen Namen
- Gib einen praktischen Lerntipp
- Antworte IMMER als gültiges JSON:

{
  "message": "Dein Motivationstext (HTML erlaubt)",
  "ui_updates": {
    "xp_gain": 15
  }
}`,

  collab_agent: `Du bist TONI, ein freundlicher KI-Lernagent für Elektrotechnik-Schüler.
Deine Aufgabe: Gib Tipps zur Zusammenarbeit mit Mitschülern basierend auf deren aktuellem Stand.

Regeln:
- Schlage konkrete Zusammenarbeits-Möglichkeiten vor
- Beziehe dich auf die anderen Teilnehmer und deren Fortschritt
- Antworte IMMER als gültiges JSON:

{
  "message": "Dein Kollaborationstipp (HTML erlaubt)",
  "ui_updates": {
    "xp_gain": 10
  }
}`
};

export default async function handler(req) {
  // CORS für lokale Entwicklung
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { agentType, context } = await req.json();

    if (!agentType || !SYSTEM_PROMPTS[agentType]) {
      return new Response(JSON.stringify({ error: 'Unbekannter Agent-Typ' }), { status: 400 });
    }

    // Kontext für Claude aufbereiten
    const userMessage = buildUserMessage(agentType, context);

    // Claude API aufrufen (mit Streaming)
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: SYSTEM_PROMPTS[agentType],
        messages: [
          ...buildChatHistory(context.chatHistory),
          { role: 'user', content: userMessage }
        ]
      })
    });

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text();
      console.error('Claude API Fehler:', err);
      return new Response(JSON.stringify({ error: 'Claude API Fehler', details: err }), { status: 500 });
    }

    const claudeData = await claudeResponse.json();
    const rawText = claudeData.content[0].text;

    // JSON aus Claude-Antwort extrahieren
    let parsed;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      // Fallback falls Claude kein valides JSON liefert
      parsed = {
        message: rawText,
        ui_updates: { xp_gain: 10 }
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err) {
    console.error('Server Fehler:', err);
    return new Response(JSON.stringify({ error: 'Interner Fehler', details: err.message }), { status: 500 });
  }
}

// ── Hilfsfunktionen ─────────────────────────────────────────────
function buildUserMessage(agentType, context) {
  return `
Aktueller Schüler-Kontext:
- Name: ${context.user?.name || 'Max'}
- Klasse: ${context.user?.class || 'ET23A'}
- Level: ${context.user?.level || 7}, XP: ${context.user?.xp || 820}
- Aktuelles Thema: ${context.currentTopic || 'Ohmsches Gesetz'}

Lernfortschritt:
${Object.entries(context.progress || {}).map(([k,v]) => `- ${k}: ${v}%`).join('\n')}

Wochenziel: ${context.goals?.weekly || 'Ohmsches Gesetz sicher anwenden'}
Erledigte Teilziele: ${(context.goals?.completed || []).join(', ') || 'keine'}
Offene Teilziele: ${(context.goals?.open || []).join(', ') || 'keine'}

Kanban:
- To Do: ${(context.kanban?.todo || []).join(', ') || 'leer'}
- In Arbeit: ${(context.kanban?.wip || []).join(', ') || 'leer'}
- Erledigt: ${(context.kanban?.done || []).join(', ') || 'leer'}

Bitte reagiere auf: "${agentType.replace('_', ' ')}"
`.trim();
}

function buildChatHistory(history) {
  if (!history || history.length === 0) return [];
  // Maximal die letzten 10 Nachrichten mitschicken (Token-Limit)
  return history.slice(-10).map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}
