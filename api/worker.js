// ================================================================
// TONI — /api/worker
// Serverseitiger Worker für die Agenten-Warteschlange.
// Wird per Vercel-Cron (GET, minütlich) aufgerufen. Greift bis zu
// N wartende Jobs (status 'queued') atomar (SKIP LOCKED), führt sie
// aus und schreibt die Ergebnisse selbst in die DB (kein Browser).
//
// Läuft browser-unabhängig; mehrere Worker-Instanzen können parallel
// laufen (Cron ohne Overlap-Schutz) — die Claim-Funktion verhindert
// Doppelverarbeitung.
//
// ENV: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY,
//      WORKER_SECRET (optional, schützt den Endpoint),
//      AGENT_ENDPOINT (optional, Standard: relativ /api/agent via VERCEL_URL)
// ================================================================

const SUPABASE_URL = () => process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

// Wie viele Jobs pro Worker-Aufruf. Bei Pro laufen mehrere Cron-
// Instanzen parallel; jeder greift bis BATCH Jobs.
function batchSize() { return Math.max(1, Math.min(10, Number(process.env.WORKER_BATCH) || 3)); }

async function sb(path, opts) {
  const r = await fetch(`${SUPABASE_URL()}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SERVICE_ROLE_KEY(), Authorization: `Bearer ${SERVICE_ROLE_KEY()}`,
      'Content-Type': 'application/json', ...(opts && opts.headers || {})
    }
  });
  return r;
}

async function rpc(fn, args) {
  const r = await fetch(`${SUPABASE_URL()}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SERVICE_ROLE_KEY(), Authorization: `Bearer ${SERVICE_ROLE_KEY()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args || {})
  });
  if (!r.ok) throw new Error(`rpc ${fn}: ${r.status} ${await r.text().catch(() => '')}`);
  return r.json();
}

// Agent-Endpoint absolut bestimmen (Cron/Server hat keine relativen URLs)
function agentEndpoint() {
  if (process.env.AGENT_ENDPOINT) return process.env.AGENT_ENDPOINT;
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  return `${base}/api/agent`;
}

// dedup_keys der bestehenden Query laden (für find_leads)
async function loadQueryDedup() {
  const set = {};
  try {
    const r = await sb('crm_query?select=dedup_key', {});
    if (r.ok) (await r.json()).forEach(q => { if (q.dedup_key) set[q.dedup_key] = true; });
  } catch (e) {}
  return set;
}

// bestehende Institutionen (name|plz) für Dubletten
async function loadExisting() {
  const out = [];
  try {
    const r = await sb('crm_institution_details?select=institution_id', {});
    // Namen/PLZ kommen aus institutions; einfacher: separate Sicht
    const r2 = await sb('institutions?select=name,postal_code', {});
    if (r2.ok) (await r2.json()).forEach(i => out.push(((i.name || '') + '|' + (i.postal_code || '')).toLowerCase().trim()));
  } catch (e) {}
  return out;
}

async function finishRun(id, patch) {
  await sb(`crm_agent_runs?id=eq.${id}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch)
  });
}

async function saveChat(runId, chat) {
  if (!Array.isArray(chat) || !chat.length) return;
  const rows = chat.map((c, i) => ({ run_id: runId, seq: i + 1, role: c.role || 'agent', content: c.content }));
  await sb('crm_agent_chat', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
}

// --- Job-Typen -------------------------------------------------

// find_leads: Agent rufen, Treffer in crm_query schreiben
async function runFindLeads(job, ANTHROPIC_API_KEY, needsApproval) {
  const input = job.input || {};
  const existing = await loadExisting();
  const payload = {
    agentType: 'find_leads',
    employeeId: job.employee_id,
    employeeName: input.employeeName, employeeDescription: input.employeeDescription,
    memory: input.memory || [],
    criteria: input.criteria || {}, freeText: input.freeText || '',
    existing, maxLeads: input.maxLeads || 10
  };
  const resp = await fetch(agentEndpoint(), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`agent find_leads: ${resp.status} ${t.slice(0, 200)}`);
  }
  const out = await resp.json();
  await saveChat(job.id, out.chat);

  const leads = (out.result && out.result.leads) || [];
  const dedup = await loadQueryDedup();
  const rows = [];
  leads.forEach(l => {
    const key = ((l.name || '') + '|' + (l.postal_code || '')).toLowerCase().trim();
    if (dedup[key]) return;
    dedup[key] = true;
    rows.push({
      name: l.name, school_type: l.school_type || null, city: l.city || null,
      state: l.state || null, postal_code: l.postal_code || null, street: l.street || null,
      website: l.website || null, source_url: l.source_url || null, why: l.why || null,
      contacts: l.contacts || [], status: 'new',
      found_by: job.employee_id || null, run_id: job.id, dedup_key: key
    });
  });
  if (needsApproval) {
    // Freigabe nötig: nichts schreiben, Rohdaten zur Bestätigung ablegen
    await parkForApproval(job, { kind: 'query_rows', rows: rows },
      { found: leads.length, pending: rows.length });
    return { parked: true };
  }
  if (rows.length) {
    await sb('crm_query', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
  }
  return { result: { queued_to_query: rows.length, found: leads.length }, usage: out.usage || {} };
}

// lead_qualify: Agent rufen, Ergebnis an die Schule schreiben (auto-apply,
// da im Hintergrund niemand "Übernehmen" klickt). Bewertung ist reversibel.
async function runLeadQualify(job, ANTHROPIC_API_KEY, needsApproval) {
  const input = job.input || {};

  // Geplanter Auftrag ohne feste Schule: die naechsten noch unbewerteten
  // Leads holen und der Reihe nach bewerten (max. maxItems).
  if (!input.institution && input.mode === 'unrated') {
    const limit = Math.max(1, Math.min(25, Number(input.maxItems) || 10));
    let targets = [];
    try {
      const r = await sb(`crm_institution_details?select=institution_id,lifecycle_stage&ai_assessed_at=is.null&limit=${limit}`, {});
      if (r.ok) targets = await r.json();
    } catch (e) {}
    if (!targets.length) return { result: { rated: 0, note: 'keine unbewerteten Leads' }, usage: {} };

    let rated = 0;
    for (const t of targets) {
      // Stammdaten der Schule nachladen
      let inst = null;
      try {
        const ri = await sb(`institutions?select=id,name,city&id=eq.${t.institution_id}`, {});
        if (ri.ok) { const arr = await ri.json(); inst = arr && arr[0]; }
      } catch (e) {}
      if (!inst) continue;
      try {
        await qualifyOne(job, {
          id: inst.id, name: inst.name, city: inst.city, stage: t.lifecycle_stage
        }, needsApproval);
        rated++;
      } catch (e) { console.error('qualify (geplant) fehlgeschlagen:', e && e.message); }
    }
    return { result: { rated: rated }, usage: {} };
  }

  if (!input.institution) throw new Error('lead_qualify: keine institution im input');
  const out = await qualifyOne(job, input.institution, needsApproval);
  return out;
}

// find_contacts: Ansprechpartner einer Schule suchen und anlegen.
// Vermerkt, WER sie gefunden hat; verified bleibt false bis zur Prüfung.
async function runFindContacts(job, ANTHROPIC_API_KEY, needsApproval) {
  const input = job.input || {};
  let institution = input.institution;

  // Geplanter Auftrag ohne feste Schule: Leads ohne Ansprechpartner nehmen
  if (!institution && input.mode === 'missing_contacts') {
    const limit = Math.max(1, Math.min(10, Number(input.maxItems) || 5));
    let picked = [];
    try {
      const r = await sb(`crm_institution_details?select=institution_id&limit=${limit * 4}`, {});
      if (r.ok) {
        const cand = await r.json();
        for (const c of cand) {
          const rc = await sb(`crm_contacts?select=id&institution_id=eq.${c.institution_id}&limit=1`, {});
          const has = rc.ok ? (await rc.json()).length > 0 : true;
          if (!has) picked.push(c.institution_id);
          if (picked.length >= limit) break;
        }
      }
    } catch (e) {}
    if (!picked.length) return { result: { searched: 0, note: 'alle Leads haben Kontakte' }, usage: {} };

    let total = 0;
    for (const instId of picked) {
      try {
        const ri = await sb(`institutions?select=id,name,city,postal_code&id=eq.${instId}`, {});
        const arr = ri.ok ? await ri.json() : [];
        if (!arr[0]) continue;
        const r = await contactsForOne(job, arr[0], needsApproval);
        total += (r && r.added) || 0;
      } catch (e) { console.error('find_contacts (geplant):', e && e.message); }
    }
    return { result: { contacts_added: total, institutions: picked.length }, usage: {} };
  }

  if (!institution) throw new Error('find_contacts: keine institution im input');
  const out = await contactsForOne(job, institution, needsApproval);
  if (out && out.parked) return { parked: true };
  return { result: { contacts_added: out.added, institution_name: institution.name }, usage: out.usage || {} };
}

// Kontakte für EINE Schule suchen und (falls erlaubt) anlegen
async function contactsForOne(job, institution, needsApproval) {
  const input = job.input || {};

  // Website + bereits bekannte Kontakte nachladen
  let website = institution.website || null;
  if (!website) {
    try {
      const rd = await sb(`crm_institution_details?select=website&institution_id=eq.${institution.id}`, {});
      if (rd.ok) { const d = await rd.json(); if (d && d[0]) website = d[0].website; }
    } catch (e) {}
  }
  let existingContacts = [];
  try {
    const rc = await sb(`crm_contacts?select=first_name,last_name,role&institution_id=eq.${institution.id}`, {});
    if (rc.ok) existingContacts = (await rc.json()).map(c =>
      [c.first_name, c.last_name].filter(Boolean).join(' ') + (c.role ? ' (' + c.role + ')' : ''));
  } catch (e) {}

  const payload = {
    agentType: 'find_contacts',
    employeeId: job.employee_id,
    employeeName: input.employeeName, employeeDescription: input.employeeDescription,
    institution: {
      id: institution.id, name: institution.name, city: institution.city,
      postal_code: institution.postal_code, website: website
    },
    existingContacts
  };
  const resp = await fetch(agentEndpoint(), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`agent find_contacts: ${resp.status} ${t.slice(0, 200)}`);
  }
  const out = await resp.json();
  await saveChat(job.id, out.chat);

  const found = (out.result && out.result.contacts) || [];
  if (!found.length) return { added: 0, usage: out.usage || {} };

  const rows = found.map(c => {
    const parts = (c.name || '').trim().split(/\s+/);
    const last = parts.length > 1 ? parts.pop() : (parts[0] || '');
    const first = parts.join(' ');
    return {
      institution_id: institution.id,
      first_name: first || null, last_name: last || null,
      role: c.role || null, email: c.email || null, phone: c.phone || null,
      is_decision_maker: !!c.is_decision_maker,
      source: 'public_website', source_url: c.source_url || null,
      consent_status: 'unknown', do_not_contact: false,
      // Herkunft: wer hat gefunden
      found_by_employee: job.employee_id || null,
      found_at: new Date().toISOString(),
      found_run_id: job.id,
      verified: false
    };
  });

  if (needsApproval) {
    await parkForApproval(job, { kind: 'contacts', institution_id: institution.id,
      institution_name: institution.name, rows: rows },
      { found: rows.length, institution_name: institution.name });
    return { parked: true };
  }

  await sb('crm_contacts', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
  return { added: rows.length, usage: out.usage || {} };
}
async function qualifyOne(job, institution, needsApproval) {
  const input = job.input || {};
  const payload = {
    agentType: 'lead_qualify',
    employeeId: job.employee_id,
    employeeName: input.employeeName, employeeDescription: input.employeeDescription,
    memory: input.memory || [], institution: institution
  };
  const resp = await fetch(agentEndpoint(), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`agent lead_qualify: ${resp.status} ${t.slice(0, 200)}`);
  }
  const out = await resp.json();
  await saveChat(job.id, out.chat);

  const r = out.result || {};
  const instId = institution.id;
  const qual = {
    lead_score: r.lead_score, toni_fit: r.toni_fit, confidence: r.confidence,
    identified_needs: r.identified_needs, likely_objections: r.likely_objections,
    digital_signals: r.digital_signals
  };
  const assess = { customer_summary: r.customer_summary, main_risk: r.main_risk, recommended_actions: r.recommended_actions };

  if (needsApproval) {
    await parkForApproval(job,
      { kind: 'qualification', institution_id: instId, institution_name: institution.name, qualification: qual, assessment: assess },
      { lead_score: r.lead_score, toni_fit: r.toni_fit, institution_name: institution.name });
    return { parked: true };
  }

  if (instId) {
    await sb(`crm_institution_details?institution_id=eq.${instId}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        ai_qualification: qual, ai_assessment: assess,
        ai_assessed_at: new Date().toISOString(), ai_assessed_by: job.employee_id || null
      })
    });
    await finishRun(job.id, { applied_at: new Date().toISOString() });
  }
  return { result: r, usage: out.usage || {} };
}

// Autonomiestufe des Agenten zu einem Job ermitteln.
// 'approval' => Ergebnis wird NICHT direkt angewendet, sondern zur
// Freigabe abgelegt. 'autonomous'/'rule_based' => wie bisher.
async function agentAutonomy(job) {
  // Zeitplan/Frontend liefern agent_id; sonst über agent_key nachschlagen
  try {
    if (job.agent_id) {
      const r = await sb(`crm_agents?select=autonomy&id=eq.${job.agent_id}`, {});
      if (r.ok) { const a = await r.json(); if (a && a[0]) return a[0].autonomy; }
    }
    if (job.agent_key) {
      const r2 = await sb(`crm_agents?select=autonomy&agent_key=eq.${encodeURIComponent(job.agent_key)}`, {});
      if (r2.ok) { const a2 = await r2.json(); if (a2 && a2[0]) return a2[0].autonomy; }
    }
  } catch (e) { /* im Zweifel wie bisher weiterarbeiten */ }
  return null;
}

// Ergebnis zur Freigabe ablegen statt anzuwenden
async function parkForApproval(job, payload, summary) {
  await finishRun(job.id, {
    status: 'awaiting_approval',
    pending_payload: payload,
    result: summary || {},
    finished_at: new Date().toISOString()
  });
}

async function processJob(job, ANTHROPIC_API_KEY) {
  try {
    const key = job.agent_key;
    const autonomy = await agentAutonomy(job);
    const needsApproval = (autonomy === 'approval');
    let res;
    // Katalog-Schlüssel ist 'qualify_leads'; 'lead_qualify' (agentType) wird
    // aus Toleranz ebenfalls akzeptiert, damit Alt-Aufträge nicht scheitern.
    if (key === 'find_leads') res = await runFindLeads(job, ANTHROPIC_API_KEY, needsApproval);
    else if (key === 'qualify_leads' || key === 'lead_qualify') res = await runLeadQualify(job, ANTHROPIC_API_KEY, needsApproval);
    else if (key === 'find_contacts') res = await runFindContacts(job, ANTHROPIC_API_KEY, needsApproval);
    else throw new Error(`unbekannter agent_key: ${key}`);

    // Wenn der Agent das Ergebnis zur Freigabe geparkt hat, ist der Lauf
    // bereits auf 'awaiting_approval' gesetzt worden.
    if (res && res.parked) return { id: job.id, ok: true, parked: true };

    await finishRun(job.id, { status: 'done', result: (res && res.result) || {}, finished_at: new Date().toISOString() });
    return { id: job.id, ok: true };
  } catch (e) {
    await finishRun(job.id, { status: 'error', error_text: String(e && e.message || e).slice(0, 500), finished_at: new Date().toISOString() });
    return { id: job.id, ok: false, error: String(e && e.message || e) };
  }
}

export default async function handler(req, res) {
  // Optionaler Schutz: nur mit korrektem Secret (Cron sendet es als Query/Header)
  const secret = process.env.WORKER_SECRET;
  if (secret) {
    const got = (req.query && req.query.key) || (req.headers && req.headers['x-worker-secret']);
    if (got !== secret) return res.status(401).json({ error: 'unauthorized' });
  }
  if (!SUPABASE_URL() || !SERVICE_ROLE_KEY()) return res.status(500).json({ error: 'Supabase-ENV fehlt' });
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  const workerId = 'w_' + Math.random().toString(36).slice(2, 10);
  try {
    // hängengebliebene Jobs aufräumen
    try { await rpc('crm_reap_stuck_runs', {}); } catch (e) { /* nicht kritisch */ }

    // Jobs atomar greifen
    const jobs = await rpc('crm_claim_agent_runs', { p_worker: workerId, p_limit: batchSize() });
    if (!Array.isArray(jobs) || !jobs.length) {
      return res.status(200).json({ worker: workerId, claimed: 0, processed: [] });
    }

    // parallel abarbeiten
    const results = await Promise.all(jobs.map(j => processJob(j, ANTHROPIC_API_KEY)));
    return res.status(200).json({ worker: workerId, claimed: jobs.length, processed: results });
  } catch (e) {
    console.error('worker Fehler:', e);
    return res.status(500).json({ worker: workerId, error: String(e && e.message || e) });
  }
}
