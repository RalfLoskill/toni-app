// ================================================================
// TONI – api/agent.js
// Echter KI-Assistent powered by Claude
// ================================================================
// Empfängt: { agentType, context (= STATE) }
// Sendet:   { message, ui_updates }
// ================================================================

// ── KI-Kosten-Logging (per fetch gegen Supabase-REST, kein npm nötig) ──
// Nutzt dieselben ENV wie create-user.js: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
const AI_PRICING = {
  'claude-sonnet-4-6':         { in: 3.00 / 1e6, out: 15.00 / 1e6 },
  'claude-haiku-4-5-20251001': { in: 1.00 / 1e6, out:  5.00 / 1e6 },
};

// Schreibt eine Logzeile in ai_usage_log. Schlägt nie hart fehl, damit das
// Logging den eigentlichen Request niemals kaputtmacht.
async function logAiUsage({ profileId, agent, model, usage, journeyId }) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !usage) return;

    const p = AI_PRICING[model] || { in: 0, out: 0 };
    const inTok  = usage.input_tokens  || 0;
    const outTok = usage.output_tokens || 0;
    const cost_usd = Number((inTok * p.in + outTok * p.out).toFixed(5));

    // Institution aus der Profil-ID auflösen (REST-GET)
    let institution_id = null;
    if (profileId) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}&select=institution_id&limit=1`,
        { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
      );
      if (r.ok) { const rows = await r.json(); institution_id = rows?.[0]?.institution_id ?? null; }
    }

    // Logzeile schreiben (REST-POST)
    await fetch(`${SUPABASE_URL}/rest/v1/ai_usage_log`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        institution_id,
        profile_id: profileId || null,
        agent,
        model,
        input_tokens: inTok,
        output_tokens: outTok,
        cost_usd,
        journey_id: journeyId || null
      })
    });
  } catch (e) {
    console.error('ai_usage_log Fehler (ignoriert):', e && e.message);
  }
}

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
  const profileId = (req.body && req.body.profileId) || null;

  // ================================================================
  // SCHRITT 1: Outline-Generator (journey_outline)
  // Schnell + klein: liefert nur Titel, Lernziel, Kompetenzen und eine
  // Stationsvorschau – KEINE Inhalte, keine Bilder. Dient der Zwischenansicht,
  // in der der Tutor prüft und Kompetenzen wählt.
  // Erwartet: { agentType:"journey_outline", prompt }
  // Antwortet: { outline:{ title, goal, competencies:[...], stations:[{title,description}] } }
  // ================================================================
  if (agentType === 'journey_outline') {
    const prompt = (req.body && typeof req.body.prompt === 'string') ? req.body.prompt.trim() : '';
    if (!prompt) return res.status(400).json({ error: 'Kein Prompt übergeben.' });
    if (prompt.length > 8000) return res.status(413).json({ error: 'Prompt zu lang.' });

    const OUTLINE_SYSTEM = `Du bist Autor:in für die Lernplattform TONi. Erstelle eine kompakte VORSCHAU (Outline) für eine Lernreise.
Antworte AUSSCHLIESSLICH mit einem einzigen gültigen JSON-Objekt – KEIN Markdown, KEINE Code-Fences, KEIN Text davor oder danach.
Verwende in Texten nur normale ASCII-Satzzeichen (keine Pfeile wie -> als Sonderzeichen, keine typografischen Anführungszeichen).

Struktur:
{
 "title": string,                       // prägnanter Titel der Lernreise
 "goal": string,                        // 1-2 Sätze Lernzielbeschreibung
 "competencies": [string, ...],         // 4-8 konkrete Kompetenzen ("Die Lernenden koennen ...")
 "stations": [ { "title": string, "description": string }, ... ]  // 3-6 vorgesehene Stationen
}
Inhaltlich: didaktisch sinnvoll, fachlich korrekt, Deutsch, altersgerecht zur genannten Zielgruppe.
KEINE Aufgaben, keine Inhalte, keine Bilder – nur diese Outline. Halte dich kurz.`;

    try {
      const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: process.env.TONI_AI_OUTLINE_MODEL || 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: OUTLINE_SYSTEM,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      if (!aiResp.ok) {
        const detail = await aiResp.text().catch(() => '');
        console.error('journey_outline Claude-Fehler:', detail.slice(0, 500));
        return res.status(502).json({ error: 'KI-Dienst nicht erreichbar.' });
      }
      const data = await aiResp.json();
      // KI-Kosten protokollieren (nicht blockierend)
      logAiUsage({ profileId, agent: 'journey_outline', model: (process.env.TONI_AI_OUTLINE_MODEL || 'claude-sonnet-4-6'), usage: data.usage });
      let text = (data.content || []).map(b => (b && b.type === 'text' ? b.text : '')).join('').trim();
      text = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
      const f = text.indexOf('{'), l = text.lastIndexOf('}');
      if (f !== -1 && l !== -1) text = text.slice(f, l + 1);
      let outline;
      try { outline = JSON.parse(text); }
      catch (e) {
        try { outline = JSON.parse(text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')); }
        catch (e2) {
          console.error('journey_outline Parse-Fehler:', e2 && e2.message);
          return res.status(422).json({ error: 'Die Outline-Antwort war kein gültiges JSON.' });
        }
      }
      if (!outline || !outline.title || !Array.isArray(outline.competencies)) {
        return res.status(422).json({ error: 'Die Outline ist unvollständig.' });
      }
      // Defensiv normalisieren.
      outline.goal = outline.goal || '';
      outline.competencies = outline.competencies.filter(c => typeof c === 'string' && c.trim()).slice(0, 12);
      outline.stations = Array.isArray(outline.stations)
        ? outline.stations.filter(s => s && s.title).map(s => ({ title: String(s.title), description: String(s.description || '') })).slice(0, 8)
        : [];
      return res.status(200).json({ outline });
    } catch (err) {
      console.error('journey_outline Fehler:', err);
      return res.status(500).json({ error: 'Unerwarteter Fehler bei der Vorschau.' });
    }
  }

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

    // Entwicklungstiefe (vom Slider). Steuert Bilder, Umfang und max_tokens.
    // Stufen: basis | basis_plus | extension | high
    const depth = (req.body && typeof req.body.depth === 'string') ? req.body.depth : 'extension';
    const depthCfg = {
      basis:      { bilder: false, maxTokens: 8000,  umfang: '3-4 Stationen mit je 3-4 Aufgaben, knappe aber vollständige Inhalte.' },
      basis_plus: { bilder: false, maxTokens: 12000, umfang: '4-5 Stationen mit je 4-5 Aufgaben, etwas ausführlichere Inhalte.' },
      extension:  { bilder: true,  maxTokens: 16000, umfang: '4-6 Stationen mit je 4-5 Aufgaben, ausführliche Inhalte mit Grafiken.' },
      high:       { bilder: true,  maxTokens: 24000, umfang: '6-8 Stationen mit je 5-6 Aufgaben, sehr ausführliche, vertiefte Inhalte mit Grafiken und Rückbezügen zwischen den Stationen.' }
    }[depth] || { bilder: true, maxTokens: 16000, umfang: '4-6 Stationen mit je 4-5 Aufgaben, ausführliche Inhalte mit Grafiken.' };

    const bilderHinweis = depthCfg.bilder
      ? `Bilder: Erzeuge KEIN rohes SVG. Wenn bei einem Lerninhalt eine Grafik sinnvoll ist, gib stattdessen ein Feld "image_spec":{ "title": string, "kind": "diagram"|"bars"|"cycle"|"list", "labels": [string, ...] } an. Der Server zeichnet daraus die Grafik. "labels" sind kurze Begriffe (max. 6). Nutze "cycle" fuer gegenlaeufige Prozesse (genau 2 Pole als labels[0]/labels[1], optional Pfeil-Beschriftung labels[2]/labels[3]), "bars" fuer Vergleiche, "diagram" fuer ein zentrales Thema mit zugeordneten Begriffen, "list" fuer eine einfache Aufzaehlung. Mindestens ein Lerninhalt soll eine image_spec enthalten. cover_image bleibt leer (der Server erzeugt das Deckblatt).`
      : `Bilder: In dieser Stufe KEINE Bilder. Setze KEINE image_spec, lass blocks und cover_image leer.`;

    const JOURNEY_SYSTEM = `Du bist Autor:in für die Lernplattform TONi. Erzeuge eine vollständige Lernreise als JSON.
Antworte AUSSCHLIESSLICH mit einem einzigen gültigen JSON-Objekt – KEIN Markdown, KEINE Code-Fences, KEIN Text davor oder danach.
Liefere NUR das "journey"-Objekt (NICHT die Datei-Hülle mit format/version).

ABSOLUT WICHTIG für gültiges JSON:
- Verwende in allen Texten NUR normale ASCII-Satzzeichen. KEINE Pfeil-Zeichen wie → oder ←, KEINE typografischen Anführungszeichen. Schreibe Abläufe mit Bindestrich-Pfeil "->", z. B. "Lerninhalt -> Quiz -> Aufgabe".
- Zeilenumbrüche innerhalb von Texten als \\n schreiben, niemals als echten Umbruch im String.
- Alle Strings mit geraden doppelten Anführungszeichen.

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
- Lerninhalt: content (Lerntext, einfaches HTML wie <b> erlaubt).
- Quiz: quiz_data:{questions:[{question, options:[...], correct_index (0-basiert), explanation}]}.
- Video: youtube_video_id:"" (LEER lassen, KEINE ID erfinden – Tutor trägt sie nach).
- Aufgabe: solution (Musterlösung). Optional expected_answer + expected_unit.
- Reflexion: reflexion_prompt, reflexion_scales:[{label}], reflexion_helpers:[...].
${bilderHinweis}
Umfang dieser Stufe: ${depthCfg.umfang}
Inhalt: didaktisch sinnvoll, fachlich korrekt, Deutsch, altersgerecht. Pro Station mehrere Aufgaben; über die Reise alle fünf Typen.`;

    try {
      // Stärkere JSON-Reparatur: Steuerzeichen entfernen, typografische Quotes
      // normalisieren, Trailing-Commas entfernen, offene Klammern/Brackets am
      // Ende schließen (fängt leicht abgeschnittene Antworten ab).
      function repairJsonText(s){
        let t = s
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u2190-\u21FF]/g, '->')        // Pfeil-Sonderzeichen
          .replace(/,\s*([}\]])/g, '$1');           // Trailing-Commas vor } oder ]
        // Bei abgeschnittenem JSON: unvollständiges Ende kappen. Zähle echte
        // (nicht escapte) Anführungszeichen; bei ungerader Zahl ist ein String
        // offen -> bis zum letzten sicheren Strukturzeichen zurückschneiden.
        const quotes = (t.match(/(?<!\\)"/g) || []).length;
        if (quotes % 2 !== 0) {
          const lastSafe = Math.max(t.lastIndexOf('"}'), t.lastIndexOf('",'), t.lastIndexOf('"]'));
          if (lastSafe !== -1) t = t.slice(0, lastSafe + 1);
        }
        // Dangling Komma/Doppelpunkt am Ende entfernen.
        t = t.replace(/[,:]\s*$/, '');
        // Offene Klammern in KORREKTER Reihenfolge schließen: Stack aufbauen,
        // dabei Strings überspringen, am Ende in umgekehrter Reihenfolge schließen.
        const stack = [];
        let inStr = false, esc = false;
        for (let i = 0; i < t.length; i++) {
          const c = t[i];
          if (inStr) {
            if (esc) { esc = false; }
            else if (c === '\\') { esc = true; }
            else if (c === '"') { inStr = false; }
            continue;
          }
          if (c === '"') inStr = true;
          else if (c === '{' || c === '[') stack.push(c);
          else if (c === '}' || c === ']') stack.pop();
        }
        // Falls die Antwort mitten im String endete: schließendes " ergänzen.
        if (inStr) t += '"';
        while (stack.length) {
          const open = stack.pop();
          t += open === '{' ? '}' : ']';
        }
        return t;
      }

      function extractAndParse(rawText){
        let jt = rawText.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
        const f = jt.indexOf('{'), l = jt.lastIndexOf('}');
        // 1. Versuch: sauber zwischen erstem { und letztem } parsen.
        if (f !== -1 && l !== -1 && l > f) {
          try { return { ok: true, journey: JSON.parse(jt.slice(f, l + 1)) }; } catch (e) {}
        }
        // 2. Versuch: ab erstem { reparieren (NICHT auf letztes } zuschneiden,
        // damit die Klammer-Schließung abgeschnittene Antworten retten kann).
        const fromStart = f !== -1 ? jt.slice(f) : jt;
        try { return { ok: true, journey: JSON.parse(repairJsonText(fromStart)) }; }
        catch (e2) { return { ok: false, err: e2 }; }
      }

      // Bis zu 2 Versuche: sporadisch liefert das Modell ungültiges JSON, ein
      // zweiter Aufruf ist dann meist sauber.
      let journey = null, lastErr = null, lastText = '', lastStop = '';
      for (let attempt = 1; attempt <= 2 && !journey; attempt++) {
        const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: process.env.TONI_AI_JOURNEY_MODEL || 'claude-sonnet-4-6',
            max_tokens: depthCfg.maxTokens,
            system: JOURNEY_SYSTEM,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (!aiResp.ok) {
          const detail = await aiResp.text().catch(() => '');
          console.error('journey_builder Claude-Fehler (Versuch ' + attempt + '):', detail.slice(0, 500));
          // Bei Netzwerk-/Dienstfehler nicht weiter probieren.
          return res.status(502).json({ error: 'KI-Dienst nicht erreichbar.' });
        }

        const data = await aiResp.json();
        // KI-Kosten protokollieren (nicht blockierend)
        logAiUsage({ profileId, agent: 'journey_builder', model: (process.env.TONI_AI_JOURNEY_MODEL || 'claude-sonnet-4-6'), usage: data.usage });
        lastText = (data.content || []).map(b => (b && b.type === 'text' ? b.text : '')).join('').trim();
        lastStop = data.stop_reason || '(unbekannt)';
        const parsed = extractAndParse(lastText);
        if (parsed.ok) { journey = parsed.journey; break; }
        lastErr = parsed.err;
        console.error('journey_builder Parse-Fehler (Versuch ' + attempt + '). stop_reason=' + lastStop +
          ' len=' + lastText.length + ' err=' + (lastErr && lastErr.message));
      }

      if (!journey) {
        console.error('journey_builder JSON-Parse-Fehler endgültig. stop_reason=' + lastStop +
          ' len=' + lastText.length + ' err=' + (lastErr && lastErr.message) +
          ' anfang=' + JSON.stringify(lastText.slice(0, 200)) +
          ' ende=' + JSON.stringify(lastText.slice(-200)));
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

          // BILDER: Die KI liefert KEIN rohes SVG (Fehlerquelle), sondern
          // optional eine strukturierte image_spec. Der Server baut daraus ein
          // sauberes SVG als Data-URL. Nur bei Stufen mit Bildern.
          if (depthCfg.bilder && t.image_spec && typeof t.image_spec === 'object') {
            const url = buildSvgFromSpec(t.image_spec);
            if (url) {
              if (!Array.isArray(t.blocks)) t.blocks = [];
              t.blocks.unshift({ type: 'image', url, alt: String(t.image_spec.title || 'Abbildung') });
            }
          }
          if (t.image_spec) delete t.image_spec;
        });
      });

      // Cover-Hintergrundbild serverseitig erzeugen – nur bei Stufen mit Bildern.
      if (depthCfg.bilder && !journey.cover_image) {
        journey.cover_image = buildCoverSvg(journey.title || 'Lernreise', journey.subject || '');
        journey.cover_image_name = 'cover.svg';
      }

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

// ----------------------------------------------------------------
// SVG-Generatoren für KI-Lernreisen (serverseitig, damit nie rohes
// SVG-Markup ins KI-JSON gelangt). Alle Texte werden XML-escaped.
// ----------------------------------------------------------------
function svgEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Baut aus einer strukturierten image_spec ein einfaches, gültiges SVG.
// image_spec: { title, kind: "diagram"|"bars"|"cycle"|"list", labels: [string,...] }
function buildSvgFromSpec(spec) {
  try {
    const title = svgEsc(spec.title || '');
    const labels = Array.isArray(spec.labels) ? spec.labels.slice(0, 6).map(svgEsc) : [];
    const kind = String(spec.kind || 'list');
    const W = 640, H = 360;
    let body = '';

    if (kind === 'bars') {
      // Einfaches Balkendiagramm mit gleichmäßigen Beispielhöhen.
      const n = Math.max(1, labels.length || 4);
      const bw = Math.floor((W - 80) / n);
      for (let i = 0; i < n; i++) {
        const h = 60 + ((i * 37) % 160);
        const x = 50 + i * bw;
        body += `<rect x="${x}" y="${300 - h}" width="${bw - 16}" height="${h}" rx="6" fill="#185FA5"/>`;
        body += `<text x="${x + (bw - 16) / 2}" y="320" font-size="13" text-anchor="middle" fill="#3c5a78">${labels[i] || ('Wert ' + (i + 1))}</text>`;
      }
    } else if (kind === 'cycle') {
      // Zwei Pole mit gegenläufigen Pfeilen (z. B. Kreislauf).
      const a = labels[0] || 'A', b = labels[1] || 'B';
      body += `<rect x="60" y="140" width="200" height="90" rx="14" fill="#E6F1FB" stroke="#185FA5" stroke-width="3"/><text x="160" y="195" font-size="20" font-weight="bold" text-anchor="middle" fill="#0C447C">${a}</text>`;
      body += `<rect x="380" y="140" width="200" height="90" rx="14" fill="#FAEEDA" stroke="#854F0B" stroke-width="3"/><text x="480" y="195" font-size="20" font-weight="bold" text-anchor="middle" fill="#633806">${b}</text>`;
      body += `<path d="M260 165 C 320 120, 320 120, 380 165" fill="none" stroke="#0F6E56" stroke-width="4"/><path d="M380 205 C 320 250, 320 250, 260 205" fill="none" stroke="#993C1D" stroke-width="4"/>`;
      if (labels[2]) body += `<text x="320" y="120" font-size="14" text-anchor="middle" fill="#0F6E56">${labels[2]}</text>`;
      if (labels[3]) body += `<text x="320" y="270" font-size="14" text-anchor="middle" fill="#993C1D">${labels[3]}</text>`;
    } else if (kind === 'diagram') {
      // Mittelknoten mit ringsum angeordneten Beschriftungen.
      body += `<circle cx="320" cy="180" r="54" fill="#185FA5"/><text x="320" y="185" font-size="15" text-anchor="middle" fill="#fff">${labels[0] || title || 'Thema'}</text>`;
      const around = labels.slice(1);
      const R = 130;
      around.forEach((lab, i) => {
        const ang = (i / Math.max(1, around.length)) * 2 * Math.PI;
        const cx = 320 + Math.round(R * Math.cos(ang));
        const cy = 180 + Math.round(R * Math.sin(ang));
        body += `<line x1="320" y1="180" x2="${cx}" y2="${cy}" stroke="#9fb3c8" stroke-width="2"/>`;
        body += `<rect x="${cx - 60}" y="${cy - 16}" width="120" height="32" rx="8" fill="#E6F1FB" stroke="#185FA5"/><text x="${cx}" y="${cy + 5}" font-size="12" text-anchor="middle" fill="#0C447C">${lab}</text>`;
      });
    } else {
      // list: schlichte beschriftete Liste.
      labels.forEach((lab, i) => {
        const y = 90 + i * 42;
        body += `<circle cx="70" cy="${y - 5}" r="9" fill="#185FA5"/><rect x="95" y="${y - 17}" width="480" height="26" rx="6" fill="#EEF3F9"/><text x="110" y="${y}" font-size="15" fill="#0C447C">${lab}</text>`;
      });
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#F7FAFE"/>` +
      (title ? `<text x="${W / 2}" y="36" font-size="20" font-weight="bold" text-anchor="middle" fill="#0C447C">${title}</text>` : '') +
      body + `</svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  } catch (e) {
    return '';
  }
}

// Cover-Deckblatt aus Titel + Fach.
function buildCoverSvg(title, subject) {
  const t = svgEsc(title), s = svgEsc(subject);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D4E89"/><stop offset="1" stop-color="#0C447C"/></linearGradient></defs>` +
    `<rect width="1200" height="675" fill="url(#g)"/>` +
    `<circle cx="600" cy="300" r="220" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="40"/>` +
    `<text x="600" y="360" font-family="Georgia, serif" font-size="56" font-weight="bold" text-anchor="middle" fill="#ffffff">${t}</text>` +
    (s ? `<text x="600" y="420" font-family="Arial" font-size="26" text-anchor="middle" fill="#FAD46B">${s}</text>` : '') +
    `</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
