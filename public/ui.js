/* ============================================================
   TONI – ui.js
   Motivationsspruch, Loader, Logo, Online/Offline
   Ausgelagert aus index.html (V110)
   ============================================================ */

/* TONI V61 – Zufälliger Motivationsspruch für Student-Profil */

window.TONI_V61_LAST_QUOTE_USER = "";
window.TONI_V61_LAST_QUOTE_TEXT = "";

const TONI_V61_FALLBACK_QUOTES = [
  "Bleib dran: kleine Fortschritte zählen – Schritt für Schritt.",
  "Du schaffst das: jeder Versuch bringt dich weiter.",
  "Geh den nächsten Schritt: dein Einsatz macht den Unterschied.",
  "Lerne mutig: Fehler sind Teil des Lernens.",
  "Heute zählt: dein Fortschritt beginnt jetzt."
];

function toniV61CurrentRole(){
  return (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.role) ||
         localStorage.getItem("toni_role") ||
         "student";
}

function toniV61CurrentProfileId(){
  return (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.id) ||
         localStorage.getItem("toni_profile_id") ||
         "";
}

function toniV61GoalElements(){
  return {
    box: document.querySelector(".topbar-goal"),
    label: document.querySelector(".topbar-goal .goal-label"),
    title: document.querySelector(".topbar-goal .goal-title"),
    edit: document.querySelector(".topbar-goal .goal-edit")
  };
}

function toniV61RememberOriginalGoal(){
  const {box, label, title, edit} = toniV61GoalElements();
  if(!box || box.dataset.v61OriginalSaved === "1") return;

  box.dataset.v61OriginalSaved = "1";
  box.dataset.v61OriginalLabel = label?.textContent || "Dein aktuelles Ziel";
  box.dataset.v61OriginalTitle = title?.textContent || "";
  box.dataset.v61OriginalEdit = edit?.textContent || "Ziel bearbeiten";
}

function toniV61RestoreGoal(){
  const {box, label, title, edit} = toniV61GoalElements();
  if(!box) return;

  box.classList.remove("toni-motivation-quote-v61");

  if(label) label.textContent = box.dataset.v61OriginalLabel || "Dein aktuelles Ziel";
  if(title) title.textContent = box.dataset.v61OriginalTitle || title.textContent || "";
  if(edit){
    edit.textContent = box.dataset.v61OriginalEdit || "Ziel bearbeiten";
    edit.style.display = "";
  }
}

function toniV61ApplyQuoteToHeader(quote){
  const {box, label, title, edit} = toniV61GoalElements();
  if(!box || !label || !title) return;

  toniV61RememberOriginalGoal();

  box.classList.add("toni-motivation-quote-v61");
  label.textContent = "Motivationsspruch";
  title.textContent = quote || "Bleib dran: kleine Fortschritte zählen – Schritt für Schritt.";
  if(edit) edit.style.display = "none";
}

async function toniV61LoadRandomQuote(){
  try{
    if(typeof supabaseRequest === "function"){
      const result = await supabaseRequest("rpc/get_random_motivation_quote_v61", {
        method:"POST",
        body:JSON.stringify({})
      });

      if(result?.quote) return result.quote;
      if(Array.isArray(result) && result[0]?.quote) return result[0].quote;
    }
  }catch(error){
    console.warn("TONI V61 Motivationsspruch konnte nicht aus Supabase geladen werden:", error);
  }

  return TONI_V61_FALLBACK_QUOTES[Math.floor(Math.random() * TONI_V61_FALLBACK_QUOTES.length)];
}

async function toniV61ShowMotivationForStudent(forceNew=false){
  toniV61RememberOriginalGoal();

  if(toniV61CurrentRole() !== "student"){
    toniV61RestoreGoal();
    return;
  }

  const profileId = toniV61CurrentProfileId() || "anonymous";

  if(!forceNew && window.TONI_V61_LAST_QUOTE_USER === profileId && window.TONI_V61_LAST_QUOTE_TEXT){
    toniV61ApplyQuoteToHeader(window.TONI_V61_LAST_QUOTE_TEXT);
    return;
  }

  const quote = await toniV61LoadRandomQuote();

  window.TONI_V61_LAST_QUOTE_USER = profileId;
  window.TONI_V61_LAST_QUOTE_TEXT = quote;

  toniV61ApplyQuoteToHeader(quote);
}

function toniV61HandleProfileChange(forceNew=false){
  setTimeout(() => toniV61ShowMotivationForStudent(forceNew), 150);
  setTimeout(() => toniV61ShowMotivationForStudent(false), 900);
}

["applyAuthProfile","toniV77ApplyProfile","toniV9ApplyProfile","toniV12ApplyDashboard","toniV14ApplyCompletedProfile"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      toniV61HandleProfileChange(true);
      return result;
    };
  }
});

["applyRoleUI","toniV8ApplyRoleClasses"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      toniV61HandleProfileChange(false);
      return result;
    };
  }
});

["signOutUser","signOut"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = async function(...args){
      window.TONI_V61_LAST_QUOTE_USER = "";
      window.TONI_V61_LAST_QUOTE_TEXT = "";
      toniV61RestoreGoal();
      return await original.apply(this, args);
    };
  }
});

window.addEventListener("DOMContentLoaded", () => {
  toniV61RememberOriginalGoal();
  setTimeout(() => toniV61ShowMotivationForStudent(false), 800);
  setTimeout(() => toniV61ShowMotivationForStudent(false), 2200);

  try{
    const client = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
    if(client?.auth?.onAuthStateChange && !window.TONI_V61_AUTH_LISTENER_INSTALLED){
      window.TONI_V61_AUTH_LISTENER_INSTALLED = true;
      client.auth.onAuthStateChange((event) => {
        if(event === "SIGNED_IN"){
          window.TONI_V61_LAST_QUOTE_USER = "";
          window.TONI_V61_LAST_QUOTE_TEXT = "";
          setTimeout(() => toniV61ShowMotivationForStudent(true), 600);
        }
        if(event === "SIGNED_OUT"){
          window.TONI_V61_LAST_QUOTE_USER = "";
          window.TONI_V61_LAST_QUOTE_TEXT = "";
          toniV61RestoreGoal();
        }
      });
    }
  }catch(error){
    console.warn("TONI V61 Auth-Listener:", error);
  }
});

/* TONI V62 – Kein Zielbereich/Motivationsspruch für Tutor und Admin */

function toniV62CurrentRole(){
  return (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.role) ||
         localStorage.getItem("toni_role") ||
         "student";
}

function toniV62ApplyGoalVisibility(){
  const goal = document.querySelector(".topbar-goal");
  if(!goal) return;

  const role = toniV62CurrentRole();
  const hide = role === "admin" || role === "tutor";

  goal.classList.toggle("toni-v62-hidden-for-staff", hide);

  if(hide){
    goal.classList.remove("toni-motivation-quote-v61");
  }
}

["applyAuthProfile","toniV77ApplyProfile","toniV9ApplyProfile","toniV12ApplyDashboard","toniV14ApplyCompletedProfile","applyRoleUI","toniV8ApplyRoleClasses"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(toniV62ApplyGoalVisibility, 40);
      setTimeout(toniV62ApplyGoalVisibility, 300);
      return result;
    };
  }
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV62ApplyGoalVisibility, 200);
  setTimeout(toniV62ApplyGoalVisibility, 900);
  setTimeout(toniV62ApplyGoalVisibility, 2200);
});

window.addEventListener("storage", () => {
  setTimeout(toniV62ApplyGoalVisibility, 50);
});

/* TONI V63 – Studentenansicht: Motivationsspruch dauerhaft statt Ziel anzeigen */

window.TONI_V63_ACTIVE_QUOTE = window.TONI_V63_ACTIVE_QUOTE || "";
window.TONI_V63_QUOTE_LOADING = false;
window.TONI_V63_REAPPLYING = false;

const TONI_V63_FALLBACK_QUOTES = [
  "Bleib dran: kleine Fortschritte zählen – Schritt für Schritt.",
  "Du schaffst das: jeder Versuch bringt dich weiter.",
  "Geh den nächsten Schritt: dein Einsatz macht den Unterschied.",
  "Lerne mutig: Fehler sind Teil des Lernens.",
  "Heute zählt: dein Fortschritt beginnt jetzt."
];

function toniV63CurrentRole(){
  return (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.role) ||
         localStorage.getItem("toni_role") ||
         "student";
}

function toniV63GoalEls(){
  return {
    box: document.querySelector(".topbar-goal"),
    label: document.querySelector(".topbar-goal .goal-label"),
    title: document.querySelector(".topbar-goal .goal-title"),
    edit: document.querySelector(".topbar-goal .goal-edit")
  };
}

function toniV63FallbackQuote(){
  return TONI_V63_FALLBACK_QUOTES[Math.floor(Math.random() * TONI_V63_FALLBACK_QUOTES.length)];
}

function toniV63ApplyQuote(quote){
  const {box, label, title, edit} = toniV63GoalEls();
  if(!box || !label || !title) return;

  if(toniV63CurrentRole() !== "student"){
    return;
  }

  const q = quote || window.TONI_V63_ACTIVE_QUOTE || toniV63FallbackQuote();
  window.TONI_V63_ACTIVE_QUOTE = q;

  window.TONI_V63_REAPPLYING = true;

  box.classList.remove("toni-v62-hidden-for-staff");
  box.classList.add("toni-motivation-quote-v61");
  box.style.display = "";

  label.textContent = "Motivationsspruch";
  title.textContent = q;

  if(edit){
    edit.style.display = "none";
  }

  setTimeout(() => {
    window.TONI_V63_REAPPLYING = false;
  }, 80);
}

async function toniV63LoadQuote(forceNew=false){
  if(toniV63CurrentRole() !== "student"){
    return;
  }

  if(window.TONI_V63_QUOTE_LOADING) return;
  if(window.TONI_V63_ACTIVE_QUOTE && !forceNew){
    toniV63ApplyQuote(window.TONI_V63_ACTIVE_QUOTE);
    return;
  }

  window.TONI_V63_QUOTE_LOADING = true;

  // Sofort verhindern, dass noch ein Lernziel unter „Motivationsspruch“ stehen bleibt.
  toniV63ApplyQuote(window.TONI_V63_ACTIVE_QUOTE || toniV63FallbackQuote());

  try{
    if(typeof supabaseRequest === "function"){
      const result = await supabaseRequest("rpc/get_random_motivation_quote_v61", {
        method:"POST",
        body:JSON.stringify({})
      });

      const quote = result?.quote || (Array.isArray(result) ? result[0]?.quote : "");
      if(quote){
        window.TONI_V63_ACTIVE_QUOTE = quote;
        toniV63ApplyQuote(quote);
      }
    }
  }catch(error){
    console.warn("TONI V63: Motivationsspruch konnte nicht geladen werden:", error);
  }finally{
    window.TONI_V63_QUOTE_LOADING = false;
    toniV63ApplyQuote(window.TONI_V63_ACTIVE_QUOTE);
  }
}

function toniV63EnsureCorrectHeader(){
  if(toniV63CurrentRole() !== "student"){
    return;
  }

  const {label, title} = toniV63GoalEls();
  const expected = window.TONI_V63_ACTIVE_QUOTE;

  if(!expected){
    toniV63LoadQuote(false);
    return;
  }

  if(label?.textContent !== "Motivationsspruch" || title?.textContent !== expected){
    toniV63ApplyQuote(expected);
  }
}

function toniV63Schedule(forceNew=false){
  setTimeout(() => toniV63LoadQuote(forceNew), 80);
  setTimeout(() => toniV63EnsureCorrectHeader(), 350);
  setTimeout(() => toniV63EnsureCorrectHeader(), 1000);
}

// Wichtige Dashboard-Funktionen können den Zielbereich neu schreiben.
// Deshalb danach den Motivationsspruch erneut erzwingen.
[
  "syncJourneyToDashboard",
  "updateLearningJourneyBar",
  "toniV24UpdateHeaderNow",
  "toniV48MoveStatsIntoTopbar",
  "toniV49ArrangeTopbar",
  "applyRoleUI",
  "toniV8ApplyRoleClasses",
  "toniV12ApplyDashboard",
  "toniV14ApplyCompletedProfile"
].forEach(fnName => {
  if(typeof window[fnName] === "function" && !window[fnName].__toniV63Wrapped){
    const original = window[fnName];
    const wrapped = function(...args){
      const result = original.apply(this, args);
      toniV63Schedule(false);
      return result;
    };
    wrapped.__toniV63Wrapped = true;
    window[fnName] = wrapped;
  }
});

// Bei echter neuer Anmeldung neuen Spruch laden.
["applyAuthProfile","toniV77ApplyProfile","toniV9ApplyProfile"].forEach(fnName => {
  if(typeof window[fnName] === "function" && !window[fnName].__toniV63ProfileWrapped){
    const original = window[fnName];
    const wrapped = function(...args){
      const result = original.apply(this, args);
      window.TONI_V63_ACTIVE_QUOTE = "";
      toniV63Schedule(true);
      return result;
    };
    wrapped.__toniV63ProfileWrapped = true;
    window[fnName] = wrapped;
  }
});

// MutationObserver: falls irgendein anderer Code später wieder das Lernziel einträgt,
// wird der Spruch sofort wiederhergestellt.
window.addEventListener("DOMContentLoaded", () => {
  const goal = document.querySelector(".topbar-goal");
  if(goal && !window.TONI_V63_GOAL_OBSERVER_INSTALLED){
    window.TONI_V63_GOAL_OBSERVER_INSTALLED = true;

    const observer = new MutationObserver(() => {
      if(window.TONI_V63_REAPPLYING) return;
      if(toniV63CurrentRole() !== "student") return;
      clearTimeout(window.TONI_V63_OBSERVER_TIMER);
      window.TONI_V63_OBSERVER_TIMER = setTimeout(toniV63EnsureCorrectHeader, 40);
    });

    observer.observe(goal, {
      childList:true,
      subtree:true,
      characterData:true,
      attributes:true,
      attributeFilter:["class","style"]
    });
  }

  setTimeout(() => toniV63LoadQuote(false), 300);
  setTimeout(() => toniV63EnsureCorrectHeader(), 900);
  setTimeout(() => toniV63EnsureCorrectHeader(), 2200);

  try{
    const client = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
    if(client?.auth?.onAuthStateChange && !window.TONI_V63_AUTH_LISTENER_INSTALLED){
      window.TONI_V63_AUTH_LISTENER_INSTALLED = true;
      client.auth.onAuthStateChange((event) => {
        if(event === "SIGNED_IN"){
          window.TONI_V63_ACTIVE_QUOTE = "";
          setTimeout(() => toniV63LoadQuote(true), 500);
        }
        if(event === "SIGNED_OUT"){
          window.TONI_V63_ACTIVE_QUOTE = "";
        }
      });
    }
  }catch(error){
    console.warn("TONI V63 Auth-Listener:", error);
  }
});

/* TONI V64 – Überschrift des Motivationsspruchs entfernen */
function toniV64RemoveMotivationHeading(){
  const box = document.querySelector(".topbar-goal.toni-motivation-quote-v61");
  if(!box) return;
  const label = box.querySelector(".goal-label");
  if(label) label.textContent = "";
}

["toniV63ApplyQuote","toniV63EnsureCorrectHeader","toniV63LoadQuote"].forEach(fnName => {
  if(typeof window[fnName] === "function" && !window[fnName].__toniV64Wrapped){
    const original = window[fnName];
    const wrapped = function(...args){
      const result = original.apply(this, args);
      setTimeout(toniV64RemoveMotivationHeading, 30);
      return result;
    };
    wrapped.__toniV64Wrapped = true;
    window[fnName] = wrapped;
  }
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV64RemoveMotivationHeading, 400);
  setTimeout(toniV64RemoveMotivationHeading, 1200);
  setTimeout(toniV64RemoveMotivationHeading, 2500);
});

/* TONI V65 – Motivationsspruch kleiner und immer zweizeilig */

function toniV65EscapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}

function toniV65SplitQuote(quote){
  const q = String(quote || "").replace(/\s+/g, " ").trim();
  if(!q) return ["", "\u00A0"];

  const preferred = [" – ", ": ", "; ", ". "];
  for(const sep of preferred){
    const idx = q.indexOf(sep);
    if(idx > 8 && idx < q.length - 8){
      return [
        q.slice(0, idx + sep.trimEnd().length).trim(),
        q.slice(idx + sep.length).trim() || "\u00A0"
      ];
    }
  }

  const mid = Math.floor(q.length / 2);
  let best = -1;
  let distance = 9999;
  for(let i = 0; i < q.length; i++){
    if(q[i] === " " && i > 8 && i < q.length - 8){
      const d = Math.abs(i - mid);
      if(d < distance){
        best = i;
        distance = d;
      }
    }
  }

  if(best > 0){
    return [q.slice(0, best).trim(), q.slice(best + 1).trim() || "\u00A0"];
  }

  return [q, "\u00A0"];
}

function toniV65FormatQuote(quote){
  const title = document.querySelector(".topbar-goal.toni-motivation-quote-v61 .goal-title");
  const label = document.querySelector(".topbar-goal.toni-motivation-quote-v61 .goal-label");
  if(!title) return;

  const q = String(quote || window.TONI_V63_ACTIVE_QUOTE || title.textContent || "").trim();
  if(!q) return;

  const lines = toniV65SplitQuote(q);

  if(label) label.textContent = "";
  title.dataset.v65Quote = q;
  title.title = q;
  title.setAttribute("aria-label", q);
  title.innerHTML =
    '<span class="motivation-line-v65">' + toniV65EscapeHtml(lines[0]) + '</span>' +
    '<span class="motivation-line-v65">' + toniV65EscapeHtml(lines[1] || "\u00A0") + '</span>';
}

if(typeof window.toniV63ApplyQuote === "function" && !window.toniV63ApplyQuote.__toniV65Wrapped){
  const originalApply = window.toniV63ApplyQuote;
  window.toniV63ApplyQuote = function(quote){
    const result = originalApply.apply(this, arguments);
    setTimeout(() => toniV65FormatQuote(quote || window.TONI_V63_ACTIVE_QUOTE), 25);
    return result;
  };
  window.toniV63ApplyQuote.__toniV65Wrapped = true;
}

if(typeof window.toniV63EnsureCorrectHeader === "function" && !window.toniV63EnsureCorrectHeader.__toniV65Wrapped){
  const originalEnsure = window.toniV63EnsureCorrectHeader;
  window.toniV63EnsureCorrectHeader = function(){
    const result = originalEnsure.apply(this, arguments);
    setTimeout(() => toniV65FormatQuote(window.TONI_V63_ACTIVE_QUOTE), 25);
    return result;
  };
  window.toniV63EnsureCorrectHeader.__toniV65Wrapped = true;
}

["toniV63LoadQuote","syncJourneyToDashboard","toniV24UpdateHeaderNow","toniV49ArrangeTopbar"].forEach(fnName => {
  if(typeof window[fnName] === "function" && !window[fnName].__toniV65FormatWrapped){
    const original = window[fnName];
    const wrapped = function(...args){
      const result = original.apply(this, args);
      setTimeout(() => toniV65FormatQuote(window.TONI_V63_ACTIVE_QUOTE), 70);
      return result;
    };
    wrapped.__toniV65FormatWrapped = true;
    window[fnName] = wrapped;
  }
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => toniV65FormatQuote(window.TONI_V63_ACTIVE_QUOTE), 500);
  setTimeout(() => toniV65FormatQuote(window.TONI_V63_ACTIVE_QUOTE), 1400);
  setTimeout(() => toniV65FormatQuote(window.TONI_V63_ACTIVE_QUOTE), 2800);
});

/* TONI V69 – Ladeanimation entfernen, sobald Dashboard geladen ist */
(function(){
  const startedAt = Date.now();
  const minVisibleMs = 5000;
  const maxVisibleMs = 10000;

  function dashboardLooksReady(){
    const hasTopbar = !!document.querySelector(".topbar");
    const hasMain = !!document.querySelector(".left-panel, .dashboard, main, .card");
    const hasAuth = !!document.getElementById("auth-status");
    return hasTopbar && hasMain && hasAuth;
  }

  function hideToniLoadingScreen(){
    const loader = document.getElementById("toni-loading-screen-v69");
    if(!loader || loader.dataset.hidden === "1") return;

    const elapsed = Date.now() - startedAt;
    const wait = Math.max(0, minVisibleMs - elapsed);

    setTimeout(() => {
      loader.dataset.hidden = "1";
      loader.classList.add("hidden");
      setTimeout(() => loader.remove(), 450);
    }, wait);
  }

  function checkAndHide(){
    if(dashboardLooksReady()){
      hideToniLoadingScreen();
    }
  }

  window.addEventListener("load", () => {
    setTimeout(checkAndHide, 250);
  });

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(checkAndHide, 700);
    setTimeout(checkAndHide, 1500);
    setTimeout(checkAndHide, 2500);
  });

  const observer = new MutationObserver(() => {
    if(dashboardLooksReady()){
      observer.disconnect();
      hideToniLoadingScreen();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    observer.observe(document.body, {childList:true, subtree:true});
  });

  // Sicherheitsnetz: Loader verschwindet spätestens nach 8 Sekunden,
  // auch wenn ein externes Skript langsam ist.
  setTimeout(hideToniLoadingScreen, maxVisibleMs);
})();

/* TONI V70 – Logo an weiteren Dashboard-Stellen vereinheitlichen */
function toniV70UnifyLogos(){
  // Header-Logo sicherstellen
  document.querySelectorAll(".toni-logo-icon").forEach(el => {
    const hasImg = !!el.querySelector("img");
    const looksLikeHeaderLogo = el.closest(".toni-logo");
    if(looksLikeHeaderLogo && !hasImg){
      el.classList.add("toni-logo-icon-v66", "toni-logo-unified-v70");
      el.innerHTML = '<img src="./assets/toni-logo-face.png" alt="TONI Logo"/>';
    }
    if(looksLikeHeaderLogo && hasImg){
      el.classList.add("toni-logo-unified-v70");
    }
  });

  // Footer dezent mit gleichem Logo ergänzen, falls noch nicht vorhanden
  const footer = document.querySelector(".footer");
  if(footer && !footer.querySelector(".toni-inline-logo-v70")){
    const firstSpan = footer.querySelector("span");
    if(firstSpan){
      firstSpan.innerHTML = '<img class="toni-inline-logo-v70" src="./assets/toni-logo-face.png" alt="TONI Logo"> ' + firstSpan.innerHTML;
    }
  }

  // Falls ein Browser die Favicon-Links nicht sofort lädt, Links dynamisch absichern.
  if(!document.querySelector('link[href="./favicon.ico"]')){
    const ico = document.createElement("link");
    ico.rel = "icon";
    ico.type = "image/x-icon";
    ico.href = "./favicon.ico";
    document.head.appendChild(ico);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV70UnifyLogos, 100);
  setTimeout(toniV70UnifyLogos, 900);
  setTimeout(toniV70UnifyLogos, 2200);
});

/* TONI V71 – Motivationsspruch/KW deaktivieren und ausblenden */
function toniV71RemoveMotivationAndWeek(){
  const goal = document.querySelector(".topbar-goal");
  const week = document.querySelector(".topbar-week");

  if(goal){
    goal.style.display = "none";
    goal.classList.remove("toni-motivation-quote-v61");
    goal.setAttribute("aria-hidden", "true");
  }

  if(week){
    week.style.display = "none";
    week.setAttribute("aria-hidden", "true");
  }
}

window.toniV61LoadRandomQuote = async function(){ return ""; };
window.toniV61ShowMotivationForStudent = async function(){ toniV71RemoveMotivationAndWeek(); };
window.toniV61ApplyQuoteToHeader = function(){ toniV71RemoveMotivationAndWeek(); };
window.toniV61RestoreGoal = function(){ toniV71RemoveMotivationAndWeek(); };
window.toniV63LoadQuote = async function(){ toniV71RemoveMotivationAndWeek(); };
window.toniV63ApplyQuote = function(){ toniV71RemoveMotivationAndWeek(); };
window.toniV63EnsureCorrectHeader = function(){ toniV71RemoveMotivationAndWeek(); };
window.toniV65FormatQuote = function(){ toniV71RemoveMotivationAndWeek(); };

[
  "applyAuthProfile",
  "toniV77ApplyProfile",
  "toniV9ApplyProfile",
  "toniV12ApplyDashboard",
  "toniV14ApplyCompletedProfile",
  "applyRoleUI",
  "toniV8ApplyRoleClasses",
  "syncJourneyToDashboard",
  "toniV48MoveStatsIntoTopbar",
  "toniV49ArrangeTopbar"
].forEach(fnName => {
  if(typeof window[fnName] === "function" && !window[fnName].__toniV71Wrapped){
    const original = window[fnName];
    const wrapped = function(...args){
      const result = original.apply(this, args);
      setTimeout(toniV71RemoveMotivationAndWeek, 20);
      setTimeout(toniV71RemoveMotivationAndWeek, 200);
      return result;
    };
    wrapped.__toniV71Wrapped = true;
    window[fnName] = wrapped;
  }
});

window.addEventListener("DOMContentLoaded", () => {
  toniV71RemoveMotivationAndWeek();
  setTimeout(toniV71RemoveMotivationAndWeek, 300);
  setTimeout(toniV71RemoveMotivationAndWeek, 1000);
  setTimeout(toniV71RemoveMotivationAndWeek, 2500);

  const observer = new MutationObserver(() => {
    clearTimeout(window.TONI_V71_REMOVE_TIMER);
    window.TONI_V71_REMOVE_TIMER = setTimeout(toniV71RemoveMotivationAndWeek, 30);
  });

  observer.observe(document.body, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:["class","style"]
  });
});

/* TONI V72 – Loader mindestens 4 Sekunden sichtbar halten */
(function(){
  window.TONI_V72_LOADER_MIN_MS = 5000;

  function ensureLoaderMinimumTime(){
    const loader = document.getElementById("toni-loading-screen-v69");
    if(!loader) return;

    if(!loader.dataset.v72StartedAt){
      loader.dataset.v72StartedAt = String(Date.now());
    }

    const started = Number(loader.dataset.v72StartedAt || Date.now());
    const elapsed = Date.now() - started;

    // Falls ältere Logik zu früh ausblendet, bis Sekunde 4 wieder sichtbar machen.
    if(elapsed < window.TONI_V72_LOADER_MIN_MS && loader.classList.contains("hidden")){
      loader.classList.remove("hidden");
      loader.dataset.hidden = "0";

      const wait = window.TONI_V72_LOADER_MIN_MS - elapsed;
      setTimeout(() => {
        loader.dataset.hidden = "1";
        loader.classList.add("hidden");
        setTimeout(() => loader.remove(), 750);
      }, wait);
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    const loader = document.getElementById("toni-loading-screen-v69");
    if(loader){
      loader.dataset.v72StartedAt = String(Date.now());
    }

    setTimeout(ensureLoaderMinimumTime, 200);
    setTimeout(ensureLoaderMinimumTime, 900);
    setTimeout(ensureLoaderMinimumTime, 1700);
    setTimeout(ensureLoaderMinimumTime, 3000);
  });
})();

/* TONI V73 – Loader beim Seitenladen 5s, nach Passwort-Login 4s */

window.TONI_V73_LOGIN_LOADER_ACTIVE = false;

function toniV73BuildLoaderElement(reason = "manual"){
  const loader = document.createElement("div");
  loader.className = "toni-loading-screen-v69 toni-login-loader-v73";
  loader.id = "toni-loading-screen-v73";
  loader.dataset.reason = reason;
  loader.innerHTML = `
    <div class="toni-loading-card-v69">
      <img class="toni-loading-gif-v69" src="./assets/toni-loader.gif" alt="TONI lädt"/>
      <div class="toni-loading-title-v69"></div>
      <div class="toni-loading-sub-v69"></div>
    </div>
  `;
  return loader;
}

function toniV73ShowLoader(durationMs = 4000, reason = "manual"){
  // Nach erfolgreicher Anmeldung bleibt der Vorhang sichtbar, bis der
  // Lade-Koordinator (V83) meldet, dass Profil, Lernreisen und Projekte
  // geladen sind – oder bis das Sicherheits-Timeout greift.
  let loader = document.getElementById("toni-loading-screen-v73");

  if(loader){
    loader.remove();
  }

  // Falls der Start-Loader noch existiert, entfernen wir ihn und zeigen denselben Loader neu.
  const oldStartLoader = document.getElementById("toni-loading-screen-v69");
  if(oldStartLoader){
    oldStartLoader.remove();
  }

  loader = toniV73BuildLoaderElement(reason);
  document.body.appendChild(loader);

  window.TONI_V73_LOGIN_LOADER_ACTIVE = true;

  // Beim Login (und Logout) den Koordinator die Steuerung übernehmen lassen.
  if(window.toniReady && (reason === "password-login" || reason === "login")){
    window.toniReady.begin();
  } else {
    // Andere Fälle (z.B. Logout): wie bisher feste Dauer.
    setTimeout(() => {
      loader.classList.add("hidden");
      setTimeout(() => {
        loader.remove();
        window.TONI_V73_LOGIN_LOADER_ACTIVE = false;
      }, 750);
    }, Math.max(0, durationMs));
  }
}

// Zusätzliche Absicherung: Falls die Anmeldung über Email/Passwort durch bestehende
// Auth-State-Logik abgeschlossen wird, aber der direkte Hook nicht greift.
if(typeof window.signInWithPassword === "function" && !window.signInWithPassword.__toniV73Wrapped){
  const TONI_V73_ORIGINAL_SIGNIN_WITH_PASSWORD = window.signInWithPassword;
  window.signInWithPassword = async function(...args){
    const result = await TONI_V73_ORIGINAL_SIGNIN_WITH_PASSWORD.apply(this, args);

    const modal = document.getElementById("auth-modal");
    const password = document.getElementById("auth-password")?.value || "";

    // Nur bei Passwort-Login: Passwortfeld war gefüllt und das Modal wurde geschlossen.
    setTimeout(() => {
      const isModalClosed = !modal || !modal.classList.contains("open");
      if(password && isModalClosed && !window.TONI_V73_LOGIN_LOADER_ACTIVE){
        toniV73ShowLoader(4000, "password-login");
        if (typeof window.toniV50RenderAllJourneysInActivities === "function") {
          setTimeout(() => window.toniV50RenderAllJourneysInActivities(), 300);
        }
      }
    }, 250);

    return result;
  };
  window.signInWithPassword.__toniV73Wrapped = true;
}

// Start-Loader nochmals absichern: Er soll mindestens 5 Sekunden sichtbar bleiben.
window.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("toni-loading-screen-v69");
  if(loader){
    loader.dataset.v73StartedAt = String(Date.now());

    setTimeout(() => {
      // Falls ältere Logik ihn vor 5 Sekunden ausgeblendet hat, noch einmal sichtbar machen.
      if(loader.isConnected && loader.classList.contains("hidden")){
        loader.classList.remove("hidden");
        loader.dataset.hidden = "0";
        setTimeout(() => {
          loader.dataset.hidden = "1";
          loader.classList.add("hidden");
          setTimeout(() => loader.remove(), 750);
        }, 500);
      }
    }, 4500);
  }
});

/* TONI V74 – Fragezeichen aus Kopfzeile entfernen + Loader bei Abmeldung */

function toniV74RemoveQuestionMark(){
  document.querySelectorAll(".topbar-icons .icon-btn").forEach(btn => {
    const text = (btn.textContent || "").trim();
    if(text === "❓" || text === "?"){
      btn.classList.add("toni-v74-question-hidden");
      btn.setAttribute("aria-hidden", "true");
      btn.style.display = "none";
    }
  });
}

function toniV74ShowLogoutLoader(){
  if(typeof window.toniV73ShowLoader === "function"){
    window.toniV73ShowLoader(4000, "logout");
  }
}

// signOutUser wird am Ende der Datei überschrieben/erweitert,
// damit es auch bei späteren Auth-Overrides greift.
function toniV74WrapSignOut(){
  if(typeof window.signOutUser !== "function") return;
  if(window.signOutUser.__toniV74Wrapped) return;

  const originalSignOut = window.signOutUser;

  window.signOutUser = async function(...args){
    toniV74ShowLogoutLoader();

    try{
      return await originalSignOut.apply(this, args);
    }finally{
      // Loader läuft bewusst volle 4 Sekunden weiter.
    }
  };

  window.signOutUser.__toniV74Wrapped = true;
}

// Zusatzabsicherung: Bei Klick auf den Abmelden-Button den Loader sofort starten,
// auch bevor die Inline-Funktion vollständig ausgeführt ist.
function toniV74InstallLogoutClickHandler(){
  const btn = document.getElementById("auth-logout-btn");
  if(!btn || btn.dataset.toniV74ClickInstalled === "1") return;

  btn.dataset.toniV74ClickInstalled = "1";
  btn.addEventListener("click", () => {
    toniV74ShowLogoutLoader();
  }, {capture:true});
}

[
  "applyAuthProfile",
  "toniV77ApplyProfile",
  "toniV9ApplyProfile",
  "toniV12ApplyDashboard",
  "toniV14ApplyCompletedProfile",
  "applyRoleUI",
  "toniV8ApplyRoleClasses",
  "toniV49ArrangeTopbar"
].forEach(fnName => {
  if(typeof window[fnName] === "function" && !window[fnName].__toniV74Wrapped){
    const original = window[fnName];
    const wrapped = function(...args){
      const result = original.apply(this, args);
      setTimeout(toniV74RemoveQuestionMark, 30);
      setTimeout(toniV74InstallLogoutClickHandler, 30);
      setTimeout(toniV74WrapSignOut, 30);
      return result;
    };
    wrapped.__toniV74Wrapped = true;
    window[fnName] = wrapped;
  }
});

window.addEventListener("DOMContentLoaded", () => {
  toniV74RemoveQuestionMark();
  toniV74WrapSignOut();
  toniV74InstallLogoutClickHandler();

  setTimeout(toniV74RemoveQuestionMark, 300);
  setTimeout(toniV74WrapSignOut, 300);
  setTimeout(toniV74InstallLogoutClickHandler, 300);

  setTimeout(toniV74RemoveQuestionMark, 1300);
  setTimeout(toniV74WrapSignOut, 1300);
  setTimeout(toniV74InstallLogoutClickHandler, 1300);

  const observer = new MutationObserver(() => {
    clearTimeout(window.TONI_V74_HEADER_TIMER);
    window.TONI_V74_HEADER_TIMER = setTimeout(() => {
      toniV74RemoveQuestionMark();
      toniV74WrapSignOut();
      toniV74InstallLogoutClickHandler();
    }, 50);
  });

  observer.observe(document.body, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:["class","style"]
  });
});

/* TONI V75 – Chat-FAB und Chat-Avatare auf aktuelles Logo vereinheitlichen */
function toniV75ReplaceOldBotIcons(){
  document.querySelectorAll(".chat-fab").forEach(btn => {
    if(!btn.querySelector("img")){
      btn.classList.add("chat-fab-v75");
      btn.innerHTML = '<img src="./assets/toni-logo-face.png" alt="TONI"/>';
      btn.setAttribute("aria-label", "TONI öffnen");
    }
  });

  document.querySelectorAll(".chat-avatar").forEach(avatar => {
    if(!avatar.querySelector("img")){
      avatar.classList.add("chat-avatar-v75");
      avatar.innerHTML = '<img src="./assets/toni-logo-face.png" alt="TONI Logo"/>';
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  toniV75ReplaceOldBotIcons();
  setTimeout(toniV75ReplaceOldBotIcons, 400);
  setTimeout(toniV75ReplaceOldBotIcons, 1200);
  setTimeout(toniV75ReplaceOldBotIcons, 2500);

  const observer = new MutationObserver(() => {
    clearTimeout(window.TONI_V75_ICON_TIMER);
    window.TONI_V75_ICON_TIMER = setTimeout(toniV75ReplaceOldBotIcons, 50);
  });

  observer.observe(document.body, {
    childList:true,
    subtree:true
  });
});

/* TONI V82 – Online/Offline-Anzeige deaktivieren */
function toniV82RemoveApiBadge(){
  document.querySelectorAll("#api-badge,.api-badge,#api-label,.api-dot").forEach(el => {
    el.style.display = "none";
    el.style.visibility = "hidden";
    el.setAttribute("aria-hidden", "true");
  });
}

/* setApiBadge neutralisieren, damit spätere Statuswechsel die Anzeige nicht zurückbringen. */
window.setApiBadge = function(){
  toniV82RemoveApiBadge();
};

window.addEventListener("DOMContentLoaded", () => {
  toniV82RemoveApiBadge();
  setTimeout(toniV82RemoveApiBadge, 300);
  setTimeout(toniV82RemoveApiBadge, 1200);
  setTimeout(toniV82RemoveApiBadge, 2500);

  const observer = new MutationObserver(() => {
    clearTimeout(window.TONI_V82_BADGE_TIMER);
    window.TONI_V82_BADGE_TIMER = setTimeout(toniV82RemoveApiBadge, 40);
  });

  observer.observe(document.body, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:["class","style"]
  });
});


/* =========================================================
   TONI V83 – Lade-Koordinator: Vorhang bleibt nach Login sichtbar,
   bis Profil, Lernreisen und Projekte geladen sind (oder Timeout).
   ========================================================= */
(function(){
  // Erwartete Quellen, auf die der Vorhang nach dem Login wartet.
  const EXPECTED = ["profile", "journeys", "projects"];
  // Hartes Sicherheitsnetz: Vorhang weicht spätestens nach dieser Zeit,
  // auch wenn eine Quelle nie „fertig" meldet (verhindert Einfrieren).
  const SAFETY_TIMEOUT_MS = 7000;
  // Mindestanzeigedauer, damit das GIF nicht aufblitzt.
  const MIN_VISIBLE_MS = 1200;

  const state = {
    active: false,
    startedAt: 0,
    done: {},          // welche Quellen schon fertig sind
    safetyTimer: null
  };

  function loaderEl(){
    // Der nach dem Login gezeigte Vorhang (V73), sonst der Start-Loader (V69).
    return document.getElementById("toni-loading-screen-v73")
        || document.getElementById("toni-loading-screen-v69");
  }

  function hideCurtain(){
    const loader = loaderEl();
    if(loader){
      loader.classList.add("hidden");
      setTimeout(() => { if(loader.isConnected) loader.remove(); }, 600);
    }
    state.active = false;
    if(state.safetyTimer){ clearTimeout(state.safetyTimer); state.safetyTimer = null; }
    window.TONI_V73_LOGIN_LOADER_ACTIVE = false;
  }

  function maybeHide(){
    if(!state.active) return;
    const allDone = EXPECTED.every(k => state.done[k]);
    if(!allDone) return;
    const elapsed = Date.now() - state.startedAt;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    setTimeout(hideCurtain, wait);
  }

  // Öffentliche API
  window.toniReady = {
    // Vorhang-Wartephase starten (von der Login-Logik aufgerufen).
    begin(){
      state.active = true;
      state.startedAt = Date.now();
      state.done = {};
      if(state.safetyTimer) clearTimeout(state.safetyTimer);
      state.safetyTimer = setTimeout(() => {
        console.warn("TONI V83: Sicherheits-Timeout – Vorhang wird ausgeblendet, obwohl nicht alle Quellen fertig gemeldet haben:", 
          EXPECTED.filter(k => !state.done[k]));
        hideCurtain();
      }, SAFETY_TIMEOUT_MS);
    },
    // Eine Quelle meldet sich fertig.
    done(key){
      if(!EXPECTED.includes(key)) return;
      state.done[key] = true;
      maybeHide();
    },
    // Status abfragen (für Debugging).
    status(){
      return { active: state.active, done: {...state.done} };
    }
  };
})();
