import { createRoot } from "react-dom/client";
import { i18nReady } from "./app/i18n";
import App from "./app/App.tsx";
import "./styles/index.css";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isChunkLoadError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === "ChunkLoadError" ||
      error.message.includes("Failed to fetch dynamically imported module") ||
      error.message.includes("Importing a module script failed") ||
      error.message.includes("error loading dynamically imported module")
    );
  }
  return false;
}

function reloadOnceForChunkError(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  const KEY = "chunk-reload-attempted";
  if (sessionStorage.getItem(KEY)) return false; // prevent infinite loop
  sessionStorage.setItem(KEY, "1");
  window.location.reload();
  return true;
}

function showBootError(title: string, error: unknown) {
  const root = document.getElementById("root");
  if (!root) return;

  const details =
    error instanceof Error
      ? error.stack || error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);

  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0B021C;color:#fff;padding:24px;font-family:ui-sans-serif,system-ui;">
      <div style="max-width:900px;width:100%;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:20px;background:rgba(255,255,255,0.04);">
        <div style="font-weight:800;font-size:18px;margin-bottom:10px;">${escapeHtml(title)}</div>
        <pre style="white-space:pre-wrap;word-break:break-word;line-height:1.5;margin:0;color:rgba(255,255,255,0.85);">${escapeHtml(details)}</pre>
      </div>
    </div>
  `;
}

window.addEventListener("error", (event) => {
  showBootError(`Uncaught error: ${event.message}`, event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  if (reloadOnceForChunkError(event.reason)) return;
  showBootError("Unhandled promise rejection", event.reason);
});

try {
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("#root element not found");

  void i18nReady
    .then(() => {
      createRoot(rootEl).render(<App />);
    })
    .catch((error) => {
      if (reloadOnceForChunkError(error)) return;
      showBootError("App failed to start", error);
    });
} catch (error) {
  showBootError("App failed to start", error);
}
