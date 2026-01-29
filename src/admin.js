import { registerServiceWorker } from "./pwa.js";
import { createSupabaseClient } from "./supabaseClient.js";
const supabase = createSupabaseClient();

document.getElementById("hardRefresh").addEventListener("click", () => location.reload());

const userForm = document.getElementById("userForm");
const uCode = document.getElementById("uCode");
const uName = document.getElementById("uName");
const usersList = document.getElementById("usersList");

const peopleForm = document.getElementById("peopleForm");
const pId = document.getElementById("pId");
const pStep = document.getElementById("pStep");
const peopleList = document.getElementById("peopleList");

const logList = document.getElementById("logList");

function fmt(s){ try{ return new Date(s).toLocaleString("sv-SE"); }catch{ return "—"; } }
function stepName(step){ return step === 5 ? "IMPREGNERING" : "VANLIGT TVÄTTPROGRAM"; }

async function fetchUsers(){
  const { data, error } = await supabase.from("users").select("code,name,created_at").order("code");
  if (error) throw error;
  return data ?? [];
}
async function fetchPeople(){
  const { data, error } = await supabase.from("people").select("id,next_step,updated_at").order("id");
  if (error) throw error;
  return data ?? [];
}
async function fetchLogs(){
  const { data, error } = await supabase.from("wash_log").select("person_id,step,done_by,done_at")
    .order("done_at", { ascending:false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

function renderUsers(users){
  usersList.innerHTML = "";
  users.forEach(u => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="left">
        <div><span class="mono">${u.code}</span>${u.name ? " – " + u.name : ""}</div>
        <div class="sub">SKAPAD: ${fmt(u.created_at)}</div>
      </div>
      <div class="actions">
        <button class="btn small" data-del="${u.code}">TA BORT</button>
      </div>`;
    usersList.appendChild(el);
  });
  usersList.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await supabase.from("users").delete().eq("code", btn.getAttribute("data-del"));
      registerServiceWorker();

await reload();
    });
  });
}

function renderPeople(people){
  peopleList.innerHTML = "";
  people.forEach(p => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="left">
        <div><span class="mono">${p.id}</span></div>
        <div class="sub">NÄSTA: ${p.next_step} / 5 • SENAST: ${fmt(p.updated_at)}</div>
      </div>
      <div class="actions">
        <button class="btn small" data-prev="${p.id}">-</button>
        <button class="btn small" data-next="${p.id}">+</button>
        <button class="btn small" data-del="${p.id}">TA BORT</button>
      </div>`;
    peopleList.appendChild(el);
  });

  peopleList.querySelectorAll("button[data-prev]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-prev");
      const { data } = await supabase.from("people").select("next_step").eq("id", id).single();
      const cur = data?.next_step ?? 1;
      const prev = cur === 1 ? 5 : cur - 1;
      await supabase.from("people").update({ next_step: prev, updated_at: new Date().toISOString() }).eq("id", id);
      registerServiceWorker();

await reload();
    });
  });

  peopleList.querySelectorAll("button[data-next]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-next");
      const { data } = await supabase.from("people").select("next_step").eq("id", id).single();
      const cur = data?.next_step ?? 1;
      const next = cur === 5 ? 1 : cur + 1;
      await supabase.from("people").update({ next_step: next, updated_at: new Date().toISOString() }).eq("id", id);
      registerServiceWorker();

await reload();
    });
  });

  peopleList.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await supabase.from("people").delete().eq("id", btn.getAttribute("data-del"));
      registerServiceWorker();

await reload();
    });
  });
}

function renderLogs(logs){
  logList.innerHTML = "";
  logs.forEach(l => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="left">
        <div><span class="mono">${l.person_id}</span> – ${stepName(l.step)}</div>
        <div class="sub">${fmt(l.done_at)} • AV: <span class="mono">${l.done_by}</span> • STEG: ${l.step}</div>
      </div>`;
    logList.appendChild(el);
  });
}

userForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = (uCode.value || "").trim().toUpperCase();
  const name = (uName.value || "").trim();
  if (!code) return;
  await supabase.from("users").insert({ code, name: name || null });
  uCode.value = ""; uName.value = "";
  registerServiceWorker();

await reload();
});

peopleForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = (pId.value || "").trim().toUpperCase();
  const step = Math.max(1, Math.min(5, parseInt(pStep.value || "1", 10)));
  if (!id) return;
  await supabase.from("people").insert({ id, next_step: step, updated_at: new Date().toISOString() });
  pId.value = ""; pStep.value = "1";
  registerServiceWorker();

await reload();
});

async function reload(){
  try{
    const [u,p,l] = await Promise.all([fetchUsers(), fetchPeople(), fetchLogs()]);
    renderUsers(u); renderPeople(p); renderLogs(l);
  }catch(e){
    console.error(e);
    logList.innerHTML = "<div class='item'><div class='left'>FEL VID LADDNING. KONTROLLERA TABELLER/POLICIES.</div></div>";
  }
}

registerServiceWorker();

await reload();
