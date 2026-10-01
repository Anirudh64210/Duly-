/**
 * The few pages the shell draws itself, when the engine is not there to answer (SPEC-W1
 * point 23). Colours are the canvas tokens of design/canvas/DESIGN-SPEC.md. No script: the
 * two buttons are forms the app handler answers.
 */

export const STARTING = "Starting Duly";
export const SLOW = "This can take a little longer the first time.";
export const SLOW_AFTER_MS = 8_000;
export const COULD_NOT_START = "Duly could not start.";
export const TRY_AGAIN = "Try again";
export const COPY_DETAILS = "Copy details";
export const COPIED = "Details copied.";

/** The canvas ground, also the window's colour before its first page is drawn. */
export const GROUND = "#F8F7F4";

/** The two actions, posted to the app scheme. */
export const RETRY_PATH = "__duly/retry";
export const COPY_PATH = "__duly/copy";

/** How the engine stands, as far as the window needs to know. */
export type EngineView =
  | { state: "starting" }
  | { state: "ready"; socket: string; token: string }
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

const STYLE = [
  "html,body{height:100%;margin:0}",
  `body{background:${GROUND};color:#1A1917;display:flex;align-items:center;justify-content:center;`,
  "font:15px/1.5 -apple-system,system-ui,sans-serif}",
  "main{text-align:center;max-width:420px;padding:24px}",
  "h1{font-size:20px;font-weight:600;margin:0 0 16px}",
  "p{color:#6B6862;margin:16px 0 0}",
  ".mark{width:160px;height:2px;margin:0 auto;background:#E8E6E0;overflow:hidden}",
  ".mark i{display:block;width:40%;height:100%;background:#8FA6D9;",
  "animation:slide 2.4s ease-in-out infinite alternate}",
  "@keyframes slide{from{transform:translateX(-100%)}to{transform:translateX(250%)}}",
  `.slow{visibility:hidden;animation:appear 0s linear ${SLOW_AFTER_MS / 1000}s forwards}`,
  "@keyframes appear{to{visibility:visible}}",
  "@media (prefers-reduced-motion:reduce){.mark{display:none}}",
  "form{display:inline-block;margin:0 6px}",
  "button{font:inherit;border-radius:8px;padding:8px 16px;cursor:pointer;",
  "border:1px solid #ECEAE4;background:#FFFFFF;color:#1A1917}",
  "button.go{background:#2B4EA2;border-color:#2B4EA2;color:#FFFFFF}",
  ".actions{margin-top:24px}",
].join("");

function page(body: string): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    '<head><meta charset="utf-8"><title>Duly</title>',
    `<style>${STYLE}</style></head>`,
    `<body><main>${body}</main></body>`,
    "</html>",
  ].join("\n");
}

function button(path: string, words: string, go: boolean): string {
  const kind = go ? ' class="go"' : "";
  return `<form method="post" action="/${path}"><button type="submit"${kind}>${escapeHtml(words)}</button></form>`;
}

export interface PageNote {
  copied?: boolean;
}

/**
 * The page the window shows in place of the screen while the engine is not ready.
 * A verdict from a dead engine is not shown: this page takes the place of the screen. The
 * engine's last lines are not on its face; Copy details puts them on the clipboard.
 */
export function statusPage(
  view: Exclude<EngineView, { state: "ready" }>,
  note: PageNote = {},
): string {
  if (view.state === "starting") {
    return page(
      [
        `<h1>${escapeHtml(STARTING)}</h1>`,
        '<div class="mark" aria-hidden="true"><i></i></div>',
        `<p class="slow">${escapeHtml(SLOW)}</p>`,
      ].join(""),
    );
  }
  return page(
    [
      `<h1>${escapeHtml(COULD_NOT_START)}</h1>`,
      '<div class="actions">',
      button(RETRY_PATH, TRY_AGAIN, true),
      button(COPY_PATH, COPY_DETAILS, false),
      "</div>",
      note.copied === true ? `<p role="status">${escapeHtml(COPIED)}</p>` : "",
    ].join(""),
  );
}

/** What Copy details puts on the clipboard: the engine's last lines, as printed. */
export function details(view: EngineView): string {
  return view.state === "failed" || view.state === "ended" ? view.lines.join("\n") : "";
}
