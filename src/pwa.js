export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
  } catch (e) {
    // Silent fail (offline/local dev often fine)
    console.warn("SW register failed", e);
  }
}
