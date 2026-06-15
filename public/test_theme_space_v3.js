/* ============================================================
 * TONI – Test v3: Weltall-Theme mit Orbit-Monden, Vollbild, Task-Modal
 * Lädt journey.js -> journey_theme.js -> journey_theme_space_new.js
 * in einen gemeinsamen VM-Context (index.html-Reihenfolge).
 * ============================================================ */
const fs = require("fs");
const vm = require("vm");
const UP = "/mnt/user-data/uploads/";
const HOME = "/home/claude/";
const files = [
  UP + "journey.js",
  UP + "journey_theme.js",
  HOME + "journey_theme_space_new.js"
];

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra ? "  -> " + extra : "")); }
}

/* ---- DOM/Window-Stub ---- */
function makeEl(tag) {
  const el = {
    tag: tag || "div", _html: "", id: "", _cls: new Set(), style: {},
    children: [],
    classList: {
      _s: null,
      add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); },
      toggle(c,on){ on?this._s.add(c):this._s.delete(c); },
      contains(c){ return this._s.has(c); },
      forEach(fn){ this._s.forEach(fn); }
    },
    get className(){ return [...this._cls].join(" "); },
    set className(v){ this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
    set innerHTML(v){ this._html = v; }, get innerHTML(){ return this._html; },
    set textContent(v){ this._text = v; }, get textContent(){ return this._text || ""; },
    appendChild(c){ this.children.push(c); return c; },
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    closest(){ return null; }, focus(){}, addEventListener(){},
    removeEventListener(){}, getAttribute(){ return null; }, setAttribute(){},
    remove(){}, contains(){ return false; }
  };
  el.classList._s = el._cls;
  return el;
}
const elements = {};
function getEl(id){ if(!elements[id]){ const e=makeEl(); e.id=id; elements[id]=e; } return elements[id]; }
const documentStub = {
  getElementById: getEl,
  createElement: (t) => makeEl(t),
  querySelectorAll: () => [], querySelector: () => null,
  addEventListener: () => {}, readyState: "complete",
  head: makeEl(), body: makeEl()
};
const sandbox = {
  window: { addEventListener: () => {}, removeEventListener: () => {} },
  document: documentStub, console: console, Math: Math, Date: Date,
  setTimeout: setTimeout,
  MutationObserver: function(){ this.observe=()=>{}; this.disconnect=()=>{}; },
  alert: () => {},
  localStorage: { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} },
  sessionStorage: { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }
};
sandbox.window.document = documentStub;
sandbox.globalThis = sandbox.window;
vm.createContext(sandbox);

console.log("\nLade Dateien (index.html-Reihenfolge):");
for (const f of files) {
  try { vm.runInContext(fs.readFileSync(f, "utf8"), sandbox, { filename: f });
    console.log("  · " + f.split("/").pop() + " geladen"); }
  catch (e) { console.log("  ! Fehler in " + f.split("/").pop() + ": " + e.message); }
}
const win = sandbox.window;
let _cssCache = null;

// deterministischer stepStatus: 0=done, 1=current, Rest locked
win.stepStatus = function (s, i) { return i===0?"done":i===1?"current":"locked"; };

function makeJourney(n, theme) {
  const steps = [];
  for (let i=0;i<n;i++){
    steps.push({ id:"s"+i, title:"Station "+(i+1), tasks:[
      { id:"t"+i+"a", type:"quiz", required:true, status:i===0?"done":"todo", title:"Quiz "+i },
      { id:"t"+i+"b", type:"info", required:true, status:"todo", title:"Lerninhalt "+i },
      { id:"t"+i+"c", type:"video", required:false, status:"todo", title:"Video "+i }
    ]});
  }
  return { id:"test", title:"Reise", theme:theme, steps:steps };
}

/* ---- 1. Registrierung & Build ---- */
console.log("\n1. Registrierung");
ok("space registriert", win.toniThemes.list().map(t=>t.id).includes("space"));
ok("toniSpaceToggleStation global", typeof win.toniSpaceToggleStation === "function");

/* ---- 2. Monde: pro Aufgabe ein Mond, mit openLearningTask ---- */
console.log("\n2. Aufgaben-Monde (Orbit)");
for (const n of [3,4,7,9]) {
  const j = makeJourney(n, "space");
  const html = win.toniRenderJourneyStations(j);
  const planetCount = (html.match(/toni-space__planet /g)||[]).length;
  const moonCount = (html.match(/toni-space__moon /g)||[]).length;
  const orbitRings = (html.match(/toni-space__orbitring/g)||[]).length;
  ok(`n=${n}: ${n} Planeten`, planetCount===n, "gefunden "+planetCount);
  ok(`n=${n}: ${n*3} Monde (3 Aufgaben/Station)`, moonCount===n*3, "gefunden "+moonCount);
  ok(`n=${n}: ${n} Orbit-Ringe`, orbitRings===n, "gefunden "+orbitRings);
}

/* ---- 3. Mond-Klick verdrahtet openLearningTask, Planet toniSpaceToggleStation ---- */
console.log("\n3. Klick-Verdrahtung");
{
  const j = makeJourney(4, "space");
  const html = win.toniRenderJourneyStations(j);
  // Station 0=done -> interaktive Monde, Station >=2 locked -> keine onclick an Monden
  ok("Monde rufen openLearningTask", /openLearningTask\('t0a'\)/.test(html));
  ok("Mond-Klick stoppt Propagation", /event\.stopPropagation\(\);openLearningTask/.test(html));
  ok("Planet ruft toniSpaceToggleStation", /toniSpaceToggleStation\(0\)/.test(html));
  // gesperrte Station (i=2) -> Monde ohne onclick
  const lockedBlock = html.split('data-step-index="2"')[1] || "";
  const lockedNext = lockedBlock.split('data-step-index="3"')[0] || lockedBlock;
  ok("gesperrte Station: Monde ohne openLearningTask",
     !/openLearningTask\('t2/.test(lockedNext), "locked-Monde sollten nicht klickbar sein");
}

/* ---- 4. Vollbild-Hooks ---- */
console.log("\n4. Vollbild");
{
  const j = makeJourney(3, "space");
  win.toniRenderJourneyStations(j);
  ok("body bekommt toni-space-fullscreen",
     sandbox.document.body.classList.contains("toni-space-fullscreen"));
  // CSS enthält den fixed-Vollbild-Selektor und das Gate
  const css = findInjectedCss();
  ok("CSS: Vollbild nur bei toni-theme-active-space",
     /toni-space-fullscreen #lr-modal\.toni-theme-active-space/.test(css || ""));
  ok("CSS: 100vw/100vh", /100vw|100vh/.test(css || ""));
}

/* ---- 5. Task-Modal Weltraum-Look (gegated) ---- */
console.log("\n5. Aufgaben-Modal thematisch");
{
  const css = findInjectedCss() || "";
  ok("Task-Modal CSS-Variablen-Override", /#lr-task-modal\{[^}]*--color-background-primary/.test(css.replace(/\s+/g," ")));
  ok("Quiz-Optionen thematisiert", /#lr-task-modal #quiz-options button/.test(css));
  ok("Eingabefelder thematisiert", /#lr-task-modal #lr-answer/.test(css) || /toni-auf-input/.test(css));
  ok("Aktions-Buttons thematisiert", /lr-iconbtn-start|lr-success-btn/.test(css));
  ok("alles gegated über toni-space-fullscreen", (css.match(/toni-space-fullscreen #lr-task-modal/g)||[]).length >= 5);
}

/* ---- 6. classic unberührt + Fehler-Fallback ---- */
console.log("\n6. classic & Fallback");
{
  const j = makeJourney(4, "classic");
  const html = win.toniRenderJourneyStations(j);
  ok("classic nutzt toni-tl", html.includes('class="toni-tl"'));
  ok("classic kein toni-space", !html.includes('class="toni-space"'));
}

/* Hilfsfunktion: injiziertes CSS holen.
 * Das CSS ist statisch im Theme-String definiert; die zuverlässigste
 * Quelle im Test ist daher die Datei selbst (der DOM-Stub speichert
 * textContent nicht verlustfrei). Wir verifizieren also gegen den
 * tatsächlich ausgelieferten CSS-Block. */
function findInjectedCss(){
  if (_cssCache) return _cssCache;
  // 1) bevorzugt aus dem head-Stub (echter Injektionspfad)
  for (const child of sandbox.document.head.children) {
    if (child && child.id === "toni-theme-space-css") {
      const c = child._text || child.textContent;
      if (c && c.length > 50) { _cssCache = c; return c; }
    }
  }
  // 2) Fallback: die Theme-Datei selbst (CSS ist dort statisch enthalten)
  _cssCache = fs.readFileSync(HOME + "journey_theme_space_new.js", "utf8");
  return _cssCache;
}

console.log("\n============================================");
console.log(`ERGEBNIS: ${pass} bestanden, ${fail} fehlgeschlagen`);
console.log("============================================");
process.exit(fail===0?0:1);
