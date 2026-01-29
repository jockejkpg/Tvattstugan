export function mountPinGate({ mountId, pin, title, hint }) {
  const mount = document.getElementById(mountId);
  if (!mount) return;

  const key = `pin_unlocked_${title}`;
  if (sessionStorage.getItem(key) === "1") return;

  mount.innerHTML = `
    <div style="position:fixed; inset:0; background:rgba(0,0,0,.75); display:flex; align-items:center; justify-content:center; z-index:9999;">
      <div style="width:min(420px, 92vw); background:#fff; border:3px solid #000; border-radius:0; padding:14px;">
        <div style="font-weight:900; text-transform:uppercase; letter-spacing:.4px; font-size:18px;">${escapeHtml(title)}</div>
        <div style="margin-top:6px; font-weight:800; text-transform:uppercase; color:#1f1f1f; font-size:12px;">
          ${escapeHtml(hint)}
        </div>

        <div style="margin-top:12px; display:flex; gap:8px;">
          <input id="pinInput" inputmode="numeric" autocomplete="one-time-code" placeholder="PIN"
            style="flex:1; background:#f2f2f2; border:3px solid #000; padding:10px 12px; font-weight:900; text-transform:uppercase;" />
          <button id="pinBtn"
            style="background:#e10600; color:#fff; border:3px solid #000; padding:10px 12px; font-weight:900; text-transform:uppercase; cursor:pointer;">
            Öppna
          </button>
        </div>

        <div id="pinErr" style="margin-top:10px; color:#e10600; font-weight:900; text-transform:uppercase; display:none;">
          Fel PIN
        </div>
      </div>
    </div>
  `;

  const input = document.getElementById("pinInput");
  const btn = document.getElementById("pinBtn");
  const err = document.getElementById("pinErr");

  function attempt() {
    const v = (input.value || "").trim();
    if (v === pin) {
      sessionStorage.setItem(key, "1");
      mount.innerHTML = "";
    } else {
      err.style.display = "block";
      input.select();
    }
  }

  btn.addEventListener("click", attempt);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") attempt(); });
  input.focus();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}
