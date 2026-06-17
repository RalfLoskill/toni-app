// TONi – Vercel Serverless Function: KI-gestützte Lernreisen-Erzeugung
// Pfad im Repo: /api/generate-journey.js
//
// Nimmt den Leitfragen-Prompt entgegen, ruft Anthropic auf und gibt das
// "journey"-Objekt im TONi-Format zurück. Speichert NICHT in Supabase – das
// macht der Browser über den bestehenden RLS-konformen Import-Weg.
//
// Erforderliche Vercel-Umgebungsvariable (Settings -> Environment Variables):
//   ANTHROPIC_API_KEY   = dein Anthropic API Key (NUR serverseitig!)
//
// Optional:
//   TONI_AI_MODEL       = Modellname (Default: claude-sonnet-4-6)

const FORMAT_INSTRUCTION = `
Du bist Autor:in für die Lernplattform TONi. Erzeuge eine vollständige Lernreise
als JSON. Antworte AUSSCHLIESSLICH mit einem einzigen gültigen JSON-Objekt –
KEIN Markdown, KEINE Code-Fences, KEIN erklärender Text davor oder danach.

Liefere NUR das "journey"-Objekt (NICHT die Datei-Hülle mit format/version).

Pflicht-Struktur des journey-Objekts:
{
  "title": string,                  // Pflicht
  "subject": string,                // Fach/Lernfeld
  "goal": string,                   // übergeordnetes Lernziel
  "description": string,            // 1-3 Sätze
  "theme": "classic",               // immer "classic", sofern nicht anders sinnvoll
  "cover_image": "",                // siehe Bild-Regeln unten
  "cover_image_name": "",
  "steps": [                        // Pflicht: Array der Stationen
    {
      "id": "station-1",            // eindeutig
      "title": string,
      "subtitle": string,
      "description": string,
      "tasks": [                    // je Station mehrere Aufgaben
        {
          "id": "task-...",         // eindeutig
          "type": "Lerninhalt" | "Aufgabe" | "Quiz" | "Video" | "Reflexion",
          "title": string,
          "answer": "",             // immer leerer String
          "status": "todo",         // immer "todo"
          "required": true,
          "description": string,
          "content": string         // HTML wie <b>...</b> erlaubt
        }
      ]
    }
  ]
}

Typ-spezifische Zusatzfelder:
- Lerninhalt: "content" mit dem Lerntext. Optional "blocks":[{ "type":"image",
  "url": <SVG-Data-URL>, "alt": string }] für eine eingebettete Grafik.
- Quiz: "quiz_data":{ "questions":[{ "question":string, "options":[string,...],
  "correct_index": number (0-basiert), "explanation": string }] }
- Video: "youtube_video_id": "" (LEER lassen – der/die Tutor:in trägt eine
  geprüfte YouTube-ID nach; erfinde KEINE ID).
- Aufgabe: "solution": string (Musterlösung). Optional "expected_answer" und
  "expected_unit" für automatische Prüfung (sonst leer lassen).
- Reflexion: "reflexion_prompt": string, "reflexion_scales":[{ "label":string }],
  "reflexion_helpers":[string,...].

Bild-Regeln (WICHTIG):
- Es gibt KEINEN Bild-Upload. Wenn ein Bild sinnvoll ist, erzeuge ein
  SELBSTGEZEICHNETES, gültiges SVG und bette es als Data-URL ein:
  "url": "data:image/svg+xml;utf8,<svg ...>...</svg>"
  Verwende NUR einfache SVG-Formen (rect, circle, line, path, text). Halte die
  SVGs kompakt (Diagramme, Schaubilder). Keine externen URLs, keine Fotos.
- Mindestens eine Grafik in der gesamten Reise ist erwünscht.

Inhaltliche Vorgaben:
- Erzeuge eine didaktisch sinnvolle, fachlich korrekte Lernreise.
- Pro Station mehrere Aufgaben; über die Reise hinweg sollen ALLE fünf
  Aufgabentypen vorkommen.
- Schreibe auf Deutsch, altersgerecht zur genannten Zielgruppe.
`;

module.exports = async function handler(req, res) {
  // CORS (gleiche Domain: meist nicht nötig, schadet aber nicht)
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Nur POST erlaubt." }));
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "Serverkonfiguration fehlt (ANTHROPIC_API_KEY)." }));
  }

  // Body einlesen (Vercel parst JSON i. d. R. automatisch; defensiv beides abfangen)
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const prompt = body && typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: "Kein Prompt übergeben." }));
  }
  // Grobe Längenbegrenzung gegen Missbrauch
  if (prompt.length > 8000) {
    res.statusCode = 413;
    return res.end(JSON.stringify({ error: "Prompt zu lang." }));
  }

  const model = process.env.TONI_AI_MODEL || "claude-sonnet-4-6";

  try {
    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: 16000,
        system: FORMAT_INSTRUCTION,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!anthropicResp.ok) {
      const detail = await anthropicResp.text().catch(() => "");
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: "KI-Dienst nicht erreichbar.", detail: detail.slice(0, 500) }));
    }

    const data = await anthropicResp.json();
    const text = (data.content || [])
      .map(b => (b && b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    // JSON aus der Antwort herauslösen (defensiv: Code-Fences entfernen,
    // erstes {...} bis letztes } nehmen, falls Drumherum vorhanden ist).
    let jsonText = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const first = jsonText.indexOf("{");
    const last = jsonText.lastIndexOf("}");
    if (first > 0 || last < jsonText.length - 1) {
      if (first !== -1 && last !== -1) jsonText = jsonText.slice(first, last + 1);
    }

    let journey;
    try {
      journey = JSON.parse(jsonText);
    } catch (e) {
      res.statusCode = 422;
      return res.end(JSON.stringify({ error: "Die KI-Antwort war kein gültiges JSON.", raw: text.slice(0, 1000) }));
    }

    // Minimal-Validierung der Pflichtstruktur.
    if (!journey || typeof journey !== "object" || !journey.title || !Array.isArray(journey.steps) || journey.steps.length === 0) {
      res.statusCode = 422;
      return res.end(JSON.stringify({ error: "Die erzeugte Lernreise ist unvollständig (title/steps fehlen)." }));
    }

    // Sicherstellen, dass Pflicht-Defaults gesetzt sind (defensiv nachziehen).
    journey.theme = journey.theme || "classic";
    journey.steps.forEach((s, si) => {
      s.id = s.id || ("station-" + (si + 1));
      (s.tasks || []).forEach((t, ti) => {
        t.id = t.id || ("task-" + (si + 1) + "-" + (ti + 1));
        if (typeof t.answer !== "string") t.answer = "";
        if (!t.status) t.status = "todo";
        if (typeof t.required !== "boolean") t.required = true;
      });
    });

    res.statusCode = 200;
    return res.end(JSON.stringify({ journey }));
  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "Unerwarteter Fehler bei der Generierung.", detail: String(err && err.message || err).slice(0, 300) }));
  }
};
