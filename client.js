function parseBootPayload() {
  const node = document.getElementById("autochain-boot");
  if (!node?.textContent) return null;
  try {
    return JSON.parse(node.textContent);
  } catch {
    return null;
  }
}

window.__AUTOCHAIN_BOOT__ = window.__AUTOCHAIN_BOOT__ || parseBootPayload();
window.__AUTOCHAIN_PUBLIC_WRITES__ = false;
