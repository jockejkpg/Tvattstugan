import { createSupabaseClient } from "./supabaseClient.js";
const supabase = createSupabaseClient();

const STEPS = [
  { key: 1, label: "VANLIGT TVÄTPROGRAM" },
  { key: 2, label: "VANLIGT TVÄTPROGRAM" },
  { key: 3, label: "VANLIGT TVÄTPROGRAM" },
  { key: 4, label: "VANLIGT TVÄTPROGRAM" },
  { key: 5, label: "IMPREGNERING" },
];

const sigEl = document.getElementById("signature");
const gridEl = document.getElementById("grid");
const instructionEl = document.getElementById("instruction");
const refreshBtn = document.getElementById("refresh");
const doNextBtn = document.getElementById("doNext");
const LS_SIG = "tvatt_sig_v2";

let users = [];
let people = [];

async function fetchUsers() {
  const { data, error } = await supabase.from("users").select("code,name").order("code");
  if (error) throw error;
  users = data ?? [];
}

async function fetchPeople() {
  const { data, error } = await supabase.from("people").select("id,next_step,updated_at").order("id");
  if (error) throw error;
  people = data ?? [];
}

function renderSignatureSelect() {
  sigEl.innerHTML = "";
  users.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.code;
    opt.textContent = u.name ? `${u.code} (${u.name})` : u.code;
    sigEl.appendChild(opt);
  });
  const saved = localStorage.getItem(LS_SIG);
  if (saved && users.some(u => u.code === saved)) sigEl.value = saved;
  if (!sigEl.value && users.length) sigEl.value = users[0].code;
}

function getNextJobForSignature(sigCode) {
  // Enkel station-kö: ta kortet som är mest "due"
  const items = [...people].map(p => ({ p, t: p.updated_at ? Date.parse(p.updated_at) : 0 }));
  items.sort((a,b) => (a.p.next_step - b.p.next_step) || (a.t - b.t));
  const pick = items[0]?.p;
  if (!pick) return null;
  const step = STEPS.find(s => s.key === pick.next_step);
  return { personId: pick.id, label: pick.id, stepKey: step.key, stepName: step.label, doneBy: sigCode };
}

function renderInstruction() {
  const sig = sigEl.value;
  if (!sig) { instructionEl.textContent = "Välj din signatur så får du instruktioner."; return; }
  const job = getNextJobForSignature(sig);
  if (!job) { instructionEl.textContent = "Inga kort hittades i databasen."; return; }
  instructionEl.innerHTML = `<div><strong>NÄSTA:</strong> <span class="mono">${job.label}</span> – ${job.stepName}</div>
  <div style="margin-top:6px;">TRYCK <strong>KLAR</strong> NÄR DU HAR KÖRT DETTA.</div>`;
}

function renderGrid() {
  gridEl.innerHTML = "";
  people.forEach(person => {
    const card = document.createElement("div");
    card.className = "card";
    const currentLabel = STEPS.find(s => s.key === person.next_step)?.label ?? "—";
    card.innerHTML = `
      <div class="cardTitle">${person.id}</div>
      <div class="cardAdvice">${currentLabel}</div>
      <div class="metaLine">AKTUELLT STEG: <span class="mono">${person.next_step}</span> / 5</div>
    `;
    const stack = document.createElement("div");
    stack.className = "stack";
    STEPS.forEach(step => {
      const row = document.createElement("div");
      row.className = "row" + (step.key === person.next_step ? " active" : "");
      row.innerHTML = `<div class="arrow">${step.key === person.next_step ? "➤" : ""}</div>
                       <div class="rowText">${step.label}</div>`;
      stack.appendChild(row);
    });
    card.appendChild(stack);
    gridEl.appendChild(card);
  });
}

async function completeForPerson(personId, signature) {
  const { data: person, error: pErr } = await supabase.from("people").select("id,next_step").eq("id", personId).single();
  if (pErr) throw pErr;
  const step = person.next_step;
  const next = step === 5 ? 1 : step + 1;

  const { error: lErr } = await supabase.from("wash_log").insert({ person_id: personId, step, done_by: signature });
  if (lErr) throw lErr;

  const { error: uErr } = await supabase.from("people")
    .update({ next_step: next, updated_at: new Date().toISOString() })
    .eq("id", personId);
  if (uErr) throw uErr;
}

async function reload() {
  try {
    await Promise.all([fetchUsers(), fetchPeople()]);
    renderSignatureSelect();
    renderInstruction();
    renderGrid();
  } catch (e) {
    console.error(e);
    instructionEl.textContent = "FEL VID LADDNING. KONTROLLERA SUPABASE URL/KEY OCH TABELLER.";
  }
}

sigEl.addEventListener("change", () => {
  localStorage.setItem(LS_SIG, sigEl.value);
  renderInstruction();
});
refreshBtn.addEventListener("click", reload);

doNextBtn.addEventListener("click", async () => {
  const sig = sigEl.value;
  if (!sig) return;
  const job = getNextJobForSignature(sig);
  if (!job) return;
  try {
    await completeForPerson(job.personId, sig);
    instructionEl.innerHTML = `<strong>KLART!</strong> LOGGADE <span class="mono">${job.label}</span> – ${job.stepName}`;
  } catch (e) {
    console.error(e);
    instructionEl.textContent = "KUNDE INTE LOGGA TVÄTT. KONTROLLERA POLICIES/ANSLUTNING.";
  }
  await reload();
});

await reload();
