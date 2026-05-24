(() => {
  // Best-effort browser cache cleanup without deleting app data such as
  // login sessions and saved orders from localStorage.
  if (window.__siteCacheClearScheduled) return;
  window.__siteCacheClearScheduled = true;

  const delayMs = 120000;

  async function clearSiteData() {
    // Clear Cache Storage (used by service workers / app caches)
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {}

    // Unregister service workers (if any)
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      }
    } catch {}

    // Preserve site storage so authentication and order data remain available.
  }

  setTimeout(clearSiteData, delayMs);
})();
