import { createSupabaseClient } from "./supabaseClient.js";

const STEPS = [
  { key: 1, name: "Normal tvätt 1" },
  { key: 2, name: "Normal tvätt 2" },
  { key: 3, name: "Normal tvätt 3" },
  { key: 4, name: "Normal tvätt 4" },
  { key: 5, name: "Normal tvätt 5" },
  { key: 6, name: "Impregnering" },
];

const sigEl = document.getElementById("signature");
const gridEl = document.getElementById("grid");
const instructionEl = document.getElementById("instruction");
const refreshBtn = document.getElementById("refresh");
const doNextBtn = document.getElementById("doNext");

const LS_SIG = "tvatt_sig_v1";

const supabase = createSupabaseClient();

let people = [];
let lastLogByPerson = new Map(); // person_id -> {done_at, done_by, step}

async function fetchPeople() {
  const { data, error } = await supabase
    .from("people")
    .select("id,next_step,updated_at")
    .order("id", { ascending: true });

  if (error) throw error;
  people = data ?? [];
}

async function fetchLastLogs() {
  // Hämta senaste log per person (enkel variant: hämta senaste 200 och ta senaste per person)
  const { data, error } = await supabase
    .from("wash_log")
    .select("person_id,step,done_by,done_at")
    .order("done_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  lastLogByPerson = new Map();
  for (const row of (data ?? [])) {
    if (!lastLogByPerson.has(row.person_id)) lastLogByPerson.set(row.person_id, row);
  }
}

function ensureSignatures() {
  // Signaturer baseras på people.id (du kan senare byta till egen signatur-tabell)
  const ids = people.map(p => p.id);
  sigEl.innerHTML = "";
  ids.forEach(id => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id;
    sigEl.appendChild(opt);
  });

  const saved = localStorage.getItem(LS_SIG);
  if (saved && ids.includes(saved)) sigEl.value = saved;
  if (!sigEl.value && ids.length) sigEl.value = ids[0];
}

function getNextJobForSignature(sig) {
  // Enkel: signaturen väljer vilken person den "ansvarar för" genom att vara samma id.
  // Om du vill att JE ansvarar för 25/27 osv: lägg en mapping-tabell senare.
  const person = people.find(p => p.id === sig);
  if (!person) return null;

  const step = STEPS.find(s => s.key === person.next_step);
  return { personId: person.id, label: person.id, stepKey: step.key, stepName: step.name };
}

function renderInstruction() {
  const sig = sigEl.value;
  if (!sig) {
    instructionEl.textContent = "Välj din signatur så får du instruktioner för nästa tvätt.";
    return;
  }
  const job = getNextJobForSignature(sig);
  if (!job) {
    instructionEl.textContent = `Inget objekt kopplat till signatur ${sig}.`;
    return;
  }
  instructionEl.innerHTML = `
    <div><strong>Nästa tvätt:</strong> <span class="mono">${job.label}</span> – ${job.stepName}</div>
    <div class="small">Tryck “Klar – gör föreslagen tvätt” när du har kört programmet.</div>
  `;
}

function fmtDate(s) {
  try {
    return new Date(s).toLocaleString("sv-SE");
  } catch {
    return "—";
  }
}

function renderGrid() {
  const sig = sigEl.value;
  const job = sig ? getNextJobForSignature(sig) : null;

  gridEl.innerHTML = "";
  people.forEach(person => {
    const card = document.createElement("div");
    card.className = "card";

    const head = document.createElement("div");
    head.className = "cardHead";
    head.innerHTML = `
      <span class="tag">${person.id}</span>
      <span class="small">Nästa: <span class="mono">${person.next_step}</span></span>
    `;

    const stack = document.createElement("div");
    stack.className = "stack";

    const last = lastLogByPerson.get(person.id);

    STEPS.forEach(step => {
      const cell = document.createElement("div");
      cell.className = "cell";

      const isDue = person.next_step === step.key;
      const isHighlight = job && job.personId === person.id && job.stepKey === step.key;
      if (isDue || isHighlight) cell.classList.add("due");

      const lastTxt = last
        ? `Senast: ${fmtDate(last.done_at)} (${last.done_by})`
        : "Ej körd";

      cell.innerHTML = `
        <span class="name">${step.name}</span>
        <span class="pill">${lastTxt}</span>
      `;
      stack.appendChild(cell);
    });

    const actions = document.createElement("div");
    actions.className = "cardActions";

    const btnDone = document.createElement("button");
    btnDone.className = "btn primary smallBtn";
    btnDone.textContent = "Klar för denna person";
    btnDone.onclick = async () => {
      await completeForPerson(person.id, sigEl.value || "?");
      await reload();
    };

    const btnUndo = document.createElement("button");
    btnUndo.className = "btn smallBtn";
    btnUndo.textContent = "Ångra senaste";
    btnUndo.onclick = async () => {
      await undoLast(person.id);
      await reload();
    };

    actions.appendChild(btnDone);
    actions.appendChild(btnUndo);

    card.appendChild(head);
    card.appendChild(stack);
    card.appendChild(actions);
    gridEl.appendChild(card);
  });
}

async function completeForPerson(personId, signature) {
  // 1) hämta aktuell step
  const { data: person, error: pErr } = await supabase
    .from("people")
    .select("id,next_step")
    .eq("id", personId)
    .single();

  if (pErr) throw pErr;

  const step = person.next_step;
  const next = step === 6 ? 1 : step + 1;

  // 2) logga
  const { error: lErr } = await supabase.from("wash_log").insert({
    person_id: personId,
    step,
    done_by: signature
  });
  if (lErr) throw lErr;

  // 3) uppdatera person
  const { error: uErr } = await supabase
    .from("people")
    .update({ next_step: next, updated_at: new Date().toISOString() })
    .eq("id", personId);

  if (uErr) throw uErr;
}

async function undoLast(personId) {
  // Ta bort senaste loggrad för personen och backa next_step ett steg.
  // (MVP-undo: enkel och snabb. Vid fler samtidiga användare kan det bli race.)
  const { data: lastRows, error: e1 } = await supabase
    .from("wash_log")
    .select("id,step,done_at")
    .eq("person_id", personId)
    .order("done_at", { ascending: false })
    .limit(1);

  if (e1) throw e1;
  if (!lastRows?.length) return;

  const last = lastRows[0];

  const { data: person, error: e2 } = await supabase
    .from("people")
    .select("next_step")
    .eq("id", personId)
    .single();
  if (e2) throw e2;

  const current = person.next_step;
  const prev = current === 1 ? 6 : current - 1;

  const { error: e3 } = await supabase
    .from("wash_log")
    .delete()
    .eq("id", last.id);
  if (e3) throw e3;

  const { error: e4 } = await supabase
    .from("people")
    .update({ next_step: prev, updated_at: new Date().toISOString() })
    .eq("id", personId);
  if (e4) throw e4;
}

async function reload() {
  try {
    await Promise.all([fetchPeople(), fetchLastLogs()]);
    ensureSignatures();
    renderInstruction();
    renderGrid();
  } catch (e) {
    console.error(e);
    instructionEl.textContent = "Fel vid laddning. Kontrollera Supabase URL/KEY samt RLS policies.";
  }
}

sigEl.addEventListener("change", () => {
  localStorage.setItem(LS_SIG, sigEl.value);
  renderInstruction();
  renderGrid();
});

refreshBtn.addEventListener("click", async () => {
  await reload();
});

doNextBtn.addEventListener("click", async () => {
  const sig = sigEl.value;
  if (!sig) return;
  const job = getNextJobForSignature(sig);
  if (!job) return;

  try {
    await completeForPerson(job.personId, sig);
    instructionEl.innerHTML = `<strong>Klart!</strong> Loggade: <span class="mono">${job.label}</span> – ${job.stepName}`;
  } catch (e) {
    console.error(e);
    instructionEl.textContent = "Kunde inte logga tvätten. Kontrollera policies/anslutning.";
  }
  await reload();
});

// Realtime: uppdatera UI när någon uppdaterar people eller wash_log
function setupRealtime() {
  // people
  supabase
    .channel("rt-people")
    .on("postgres_changes", { event: "*", schema: "public", table: "people" }, () => reload())
    .subscribe();

  // wash_log
  supabase
    .channel("rt-wash-log")
    .on("postgres_changes", { event: "*", schema: "public", table: "wash_log" }, () => reload())
    .subscribe();
}

await reload();
setupRealtime();
