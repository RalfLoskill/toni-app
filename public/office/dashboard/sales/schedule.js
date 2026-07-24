// ================================================================
// TONI — /api/schedule
// Wandelt fällige Zeitpläne (crm_schedules) in Aufträge um
// (crm_agent_runs mit status 'queued'). Der bestehende Worker
// (/api/worker) arbeitet sie danach ganz normal ab.
//
// Wird per Vercel-Cron aufgerufen (empfohlen: alle 5 Minuten).
// Die eigentliche Arbeit macht die Postgres-Funktion
// crm_run_due_schedules() — atomar per SKIP LOCKED, damit
// parallele Aufrufe keine doppelten Aufträge erzeugen.
//
// ENV: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//      WORKER_SECRET (optional, gleicher Schutz wie /api/worker)
// ================================================================

const SUPABASE_URL = () => process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

async function rpc(fn, args) {
  const r = await fetch(`${SUPABASE_URL()}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY(), Authorization: `Bearer ${SERVICE_ROLE_KEY()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args || {})
  });
  if (!r.ok) throw new Error(`rpc ${fn}: ${r.status} ${await r.text().catch(() => '')}`);
  return r.json();
}

export default async function handler(req, res) {
  const secret = process.env.WORKER_SECRET;
  if (secret) {
    const got = (req.query && req.query.key) || (req.headers && req.headers['x-worker-secret']);
    if (got !== secret) return res.status(401).json({ error: 'unauthorized' });
  }
  if (!SUPABASE_URL() || !SERVICE_ROLE_KEY()) {
    return res.status(500).json({ error: 'Supabase-ENV fehlt' });
  }

  try {
    const created = await rpc('crm_run_due_schedules', { p_limit: 20 });
    const list = Array.isArray(created) ? created : [];
    return res.status(200).json({ due: list.length, created: list });
  } catch (e) {
    console.error('schedule Fehler:', e);
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
