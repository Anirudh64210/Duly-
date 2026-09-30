/** The few pages the shell draws itself, when the engine is not there to answer. */

export const COULD_NOT_START = "Duly could not start its engine on this Mac.";
export const ENGINE_STOPPED = "Duly's engine stopped. Close Duly and open it again.";
export const STARTING = "Duly is starting its engine.";

/** How the engine stands, as far as the window needs to know. */
export type EngineView =
  | { state: "starting" }
  | { state: "ready"; port: number; token: string }
  | { state: "failed"; lines: readonly string[] }
  | { state: "ended"; lines: readonly string[] };

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function page(sentence: string, lines: readonly string[]): string {
  const printed =
    lines.length > 0 ? `\n<pre>${lines.map((line) => escapeHtml(line)).join("\n")}</pre>` : "";
  return [
    "<!doctype html>",
    '<html lang="en">',
    '<head><meta charset="utf-8"><title>Duly</title>',
    "<style>body{font:16px/1.5 -apple-system,system-ui,sans-serif;margin:48px;color:#1a1a1a}",
    "pre{font:12px/1.4 ui-monospace,monospace;white-space:pre-wrap;color:#444}</style></head>",
    `<body><main><h1>${escapeHtml(sentence)}</h1>${printed}</main></body>`,
    "</html>",
  ].join("\n");
}

/**
 * The page the window shows in place of the screen while the engine is not ready.
 * A verdict from a dead engine is not shown: this page takes the place of the screen.
 */
export function statusPage(view: Exclude<EngineView, { state: "ready" }>): string {
  switch (view.state) {
    case "starting":
      return page(STARTING, []);
    case "failed":
      return page(COULD_NOT_START, view.lines);
    case "ended":
      return page(ENGINE_STOPPED, view.lines);
  }
}
