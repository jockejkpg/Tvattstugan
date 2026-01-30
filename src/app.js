import { registerServiceWorker } from "./pwa.js";
import { createSupabaseClient } from "./supabaseClient.js";
const supabase = createSupabaseClient();

registerServiceWorker();

// Cykel: 1–4 VANLIGT, 5 IMPREGNERING
const STEPS = [
  { key: 1, label: "TVÄTTPROGRAM" },
  { key: 2, label: "TVÄTTPROGRAM" },
  { key: 3, label: "TVÄTTPROGRAM" },
  { key: 4, label: "TVÄTTPROGRAM" },
  { key: 5, label: "IMPREGNERING" },
];

const selEl = document.getElementById("signature"); // dropdown = vilket tvättkort som påverkas
const gridEl = document.getElementById("grid");
const instructionEl = document.getElementById("instruction");
const refreshBtn = document.getElementById("refresh");
const washBtn = document.getElementById("doNext");
const viewListBtn = document.getElementById("viewList");
const viewGridBtn = document.getElementById("viewGrid");

const LS_SELECTED = "tvatt_selected_person_v7";
const LS_VIEW = "tvatt_view_mode_v9"; // "grid" | "list"


let people = [];
let lastLogByPerson = new Map(); // person_id -> {done_at, done_by, step}

async function fetchPeople() {
  const { data, error } = await supabase.from("people").select("id,next_step,updated_at").order("id");
  if (error) throw error;
  people = data ?? [];
}

async function fetchLastLogs() {
  const { data, error } = await supabase
    .from("wash_log")
    .select("person_id,step,done_by,done_at")
    .order("done_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  lastLogByPerson = new Map();
  for (const row of (data ?? [])) {
    if (!lastLogByPerson.has(row.person_id)) lastLogByPerson.set(row.person_id, row);
  }
}

function stepLabel(stepKey) {
  return (STEPS.find(s => s.key === stepKey)?.label) ?? "—";
}

function renderSelect() {
  selEl.innerHTML = "";
  people.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.id;
    selEl.appendChild(opt);
  });

  const saved = localStorage.getItem(LS_SELECTED);
  if (saved && people.some(p => p.id === saved)) selEl.value = saved;
  if (!selEl.value && people.length) selEl.value = people[0].id;
}

function renderInstruction() {
  const personId = selEl.value;
  const person = people.find(p => p.id === personId);

  if (!person) {
    instructionEl.textContent = "Välj ett tvättkort i listan.";
    return;
  }

  instructionEl.innerHTML = `
    <div><strong>VALT TVÄTTKORT:</strong> <span class="mono">${person.id}</span></div>
    <div style="margin-top:6px;"><strong>PROGRAM:</strong> ${stepLabel(person.next_step)}</div>
    <div class="redText" style="margin-top:8px;">
      KÖR PROGRAM ENLIGT TVÄTTKORTETS REKOMENDATION. KLICKA FÖR MARKERA KORT, KLICKA IGEN FÖR ATT BEKRÄFTA.
    </div>
  `;
}

function fmtDate(s) {
  try { return new Date(s).toLocaleString("sv-SE"); } catch { return "—"; }
}

function showConfirm({ title, body, yesText="JA", noText="NEJ" }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modalTitle">${escapeHtml(title)}</div>
        <div class="modalBody">${escapeHtml(body)}</div>
        <div class="modalActions">
          <button class="btn primary" id="modalYes">${escapeHtml(yesText)}</button>
          <button class="btn" id="modalNo">${escapeHtml(noText)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    function cleanup(result){
      overlay.remove();
      resolve(result);
    }
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(false);
    });
    overlay.querySelector("#modalYes").addEventListener("click", () => cleanup(true));
    overlay.querySelector("#modalNo").addEventListener("click", () => cleanup(false));
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

async function washPerson(personId) {
  const person = people.find(p => p.id === personId);
  if (!person) return;

  const step = person.next_step;
  const next = step === 5 ? 1 : step + 1;

  const { error: lErr } = await supabase.from("wash_log").insert({
    person_id: personId,
    step,
    done_by: personId
  });
  if (lErr) throw lErr;

  const { error: uErr } = await supabase
    .from("people")
    .update({ next_step: next, updated_at: new Date().toISOString() })
    .eq("id", personId);
  if (uErr) throw uErr;
}

function renderGrid() {
  const selectedId = selEl.value;
  gridEl.innerHTML = "";

  people.forEach(person => {
    const card = document.createElement("div");
    card.className = "card" + (person.id === selectedId ? " selected" : "");
    card.dataset.personId = person.id;

    const last = lastLogByPerson.get(person.id);
    const lastText = last ? fmtDate(last.done_at) : "ALDRIG";

    card.innerHTML = `
      <div class="cardTitle">${person.id}</div>
      <div class="cardAdvice">SENAST TVÄTTAT: <span class="mono">${lastText}</span></div>
      <div class="metaLine">AKTUELLT STEG: <span class="mono">${person.next_step}</span> / 5</div>
    `;

    const stack = document.createElement("div");
    stack.className = "stack";

    STEPS.forEach(step => {
      const isActive = step.key === person.next_step;
      const row = document.createElement("div");
      row.className = "row" + (isActive ? " active" : "");
      row.innerHTML = `
        <div class="arrow">${isActive ? "➤" : ""}</div>
        <div class="rowText">${step.label}</div>
      `;
      stack.appendChild(row);
    });

    card.appendChild(stack);

    card.addEventListener("click", async () => {
      const currentlySelected = selEl.value;

      // 1st click: select
      if (navigator.vibrate) navigator.vibrate(30);
      if (currentlySelected !== person.id) {
        selEl.value = person.id;
        localStorage.setItem(LS_SELECTED, person.id);
        renderInstruction();
        renderGrid();
        return;
      }

      // 2nd click: confirm wash
      if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
      card.classList.add("confirm");
      const ok = await showConfirm({
        title: "TVÄTTA?",
        body: `TVÄTTA KORT ${person.id}?`
      });
      card.classList.remove("confirm");

      if (ok) {
        if (navigator.vibrate) navigator.vibrate(120);
        try {
          await washPerson(person.id);
        } catch (e) {
          console.error(e);
          instructionEl.textContent = "KUNDE INTE LOGGA TVÄTT. KONTROLLERA POLICIES/ANSLUTNING.";
        }
        await reload();
      }
    });

    gridEl.appendChild(card);
  });
}


function applyViewMode(mode){
  const m = (mode === "list") ? "list" : "grid";
  document.body.classList.toggle("listMode", m === "list");

  if (viewListBtn) viewListBtn.classList.toggle("active", m === "list");
  if (viewGridBtn) viewGridBtn.classList.toggle("active", m === "grid");

  localStorage.setItem(LS_VIEW, m);
}

function initViewMode(){
  const saved = localStorage.getItem(LS_VIEW) || "grid";
  applyViewMode(saved);
}

async function reload() {
  try {
    await Promise.all([fetchPeople(), fetchLastLogs()]);
    renderSelect();
    renderInstruction();
    renderGrid();
  } catch (e) {
    console.error(e);
    instructionEl.textContent = "FEL VID LADDNING. KONTROLLERA SUPABASE URL/KEY OCH TABELLER.";
  }
}

selEl.addEventListener("change", () => {
  localStorage.setItem(LS_SELECTED, selEl.value);
  renderInstruction();
  renderGrid();
});

refreshBtn.addEventListener("click", reload);

if (viewListBtn) viewListBtn.addEventListener("click", () => applyViewMode("list"));
if (viewGridBtn) viewGridBtn.addEventListener("click", () => applyViewMode("grid"));

initViewMode();

washBtn.addEventListener("click", async () => {
  const personId = selEl.value;
  if (!personId) return;

  try {
    await washPerson(personId);
  } catch (e) {
    console.error(e);
    instructionEl.textContent = "KUNDE INTE LOGGA TVÄTT. KONTROLLERA POLICIES/ANSLUTNING.";
  }
  await reload();
});

await reload();
