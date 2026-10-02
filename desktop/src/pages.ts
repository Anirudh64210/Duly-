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

/** The canvas ground of the web screen, light and dark (web/src/design/tokens.css). */
export const GROUND = "#F8F7F4";
export const GROUND_DARK = "#161513";

/**
 * The flash: white "Duly" on black, the accent dot, in the screen's own font. The screen picks
 * up this exact frame and carries the wordmark to its own (web/src/app/launchFlash.ts keeps
 * the same numbers).
 */
export const FLASH_GROUND = "#000000";
export const FLASH_INK = "#FFFFFF";
export const FLASH_DOT = "#8FA8E6";
export const FLASH_SIZE_PX = 64;
const LINE_INK = "rgba(255,255,255,.72)";
const LINE_FONT = "15px/1.5 -apple-system,system-ui,sans-serif";
/** The line hangs this far below the centre, on the flash page and in the first frame. */
const LINE_BELOW_PX = 56;

/** Said under the wordmark on every launch, until the wordmark leaves for the corner. */
export const LINE = "Your F-1 journey, duly kept.";

/**
 * The intro plays whole before the screen takes over: the word rises, the dot drops and
 * settles, the line comes in and has time to be read. Starting the engine takes most of
 * this anyway.
 */
export const FLASH_MS = 2_000;

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
  /** The screen's wordmark font (Instrument Sans 700), as a data URL. */
  font?: string | undefined;
}

const FLASH_STYLE = [
  "html,body{height:100%;margin:0}",
  `body{background:${FLASH_GROUND};color:${FLASH_INK};overflow:hidden;`,
  `font:${LINE_FONT};-webkit-font-smoothing:antialiased;`,
  "-webkit-user-select:none;cursor:default}",
  // The word sits at the exact centre; everything else hangs below it, out of the layout.
  ".stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}",
  ".h{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}",
  `.word{position:relative;margin:0;font:700 ${FLASH_SIZE_PX}px/1 var(--wordmark);letter-spacing:-0.01em;`,
  "opacity:0;transform:translateY(14px);animation:rise .8s cubic-bezier(.16,1,.3,1) .1s forwards}",
  `.dot{display:inline-block;color:${FLASH_DOT};opacity:0;transform:translateY(-1.1em);`,
  "animation:drop .85s linear .55s forwards}",
  `.under{position:absolute;left:50%;top:calc(50% + ${LINE_BELOW_PX}px);transform:translateX(-50%);`,
  "text-align:center;white-space:nowrap}",
  `.line{margin:0;color:${LINE_INK};opacity:0;transform:translateY(4px);animation:say .6s ease .95s forwards}`,
  ".mark{width:120px;height:2px;margin:18px auto 0;border-radius:1px;background:rgba(255,255,255,.16);",
  "overflow:hidden;opacity:0;animation:fade .3s ease-out 2.8s forwards}",
  ".mark i{display:block;width:40%;height:100%;background:rgba(255,255,255,.7);",
  "animation:slide 1.6s ease-in-out infinite alternate}",
  ".slow{margin:14px 0 0;color:rgba(255,255,255,.6);visibility:hidden;",
  `animation:appear 0s linear ${SLOW_AFTER_MS / 1000}s forwards}`,
  "@keyframes rise{to{opacity:1;transform:none}}",
  // A drop that lands, rebounds twice and settles, eased per leg like a ball.
  "@keyframes drop{0%{opacity:0;transform:translateY(-1.1em);animation-timing-function:cubic-bezier(.5,0,1,1)}",
  "48%{opacity:1;transform:none;animation-timing-function:cubic-bezier(0,0,.5,1)}",
  "64%{transform:translateY(-.22em);animation-timing-function:cubic-bezier(.5,0,1,1)}",
  "80%{transform:none;animation-timing-function:cubic-bezier(0,0,.5,1)}",
  "90%{transform:translateY(-.06em);animation-timing-function:cubic-bezier(.5,0,1,1)}",
  "100%{opacity:1;transform:none}}",
  "@keyframes say{to{opacity:1;transform:none}}",
  "@keyframes fade{to{opacity:1}}",
  "@keyframes slide{from{transform:translateX(-100%)}to{transform:translateX(250%)}}",
  "@keyframes appear{to{visibility:visible}}",
  "@media (prefers-reduced-motion:reduce){.word,.dot{animation:none;opacity:1;transform:none}",
  ".line{animation:none;opacity:1;transform:none}.mark{display:none}}",
].join("");

/**
 * The wordmark's face. A data URL, so the word is never drawn in a stand-in font for a
 * frame, on the flash page or on the screen's first frame.
 */
const FLASH_FAMILY = '"Duly Flash",-apple-system,system-ui,sans-serif';

function fontFace(font: string | undefined): string {
  return font === undefined
    ? ""
    : `@font-face{font-family:"Duly Flash";font-weight:700;font-display:block;src:url("${escapeHtml(font)}")}`;
}

/**
 * The flash's last frame, drawn into the screen's own page the first time it is served, so
 * the page's first paint is already that frame and there is no blink between the two. The
 * screen (web/src/app/launchFlash.ts) carries it to the logo and removes it.
 */
export function withFlash(index: string, font: string | undefined): string {
  const style = `<style id="launch-flash-style">${fontFace(font)}html,body{background:${FLASH_GROUND}}</style>`;
  const overlay = [
    '<div class="launch-flash" aria-hidden="true" style="position:fixed;inset:0;',
    'z-index:2147483647;display:flex;align-items:center;justify-content:center;pointer-events:none">',
    `<div style="position:absolute;inset:0;background:${FLASH_GROUND};will-change:opacity"></div>`,
    `<p style="position:relative;margin:0;font:700 ${FLASH_SIZE_PX}px/1 ${FLASH_FAMILY.replaceAll('"', "'")};`,
    `letter-spacing:-0.01em;color:${FLASH_INK};white-space:nowrap;-webkit-font-smoothing:antialiased">`,
    `Duly<span style="display:inline-block;color:${FLASH_DOT}">.</span></p>`,
    `<p class="launch-line" style="position:absolute;left:50%;top:calc(50% + ${LINE_BELOW_PX}px);`,
    `transform:translateX(-50%);margin:0;white-space:nowrap;font:${LINE_FONT};color:${LINE_INK};`,
    `-webkit-font-smoothing:antialiased">${escapeHtml(LINE)}</p></div>`,
  ].join("");
  return index.replace(/<head>/i, `<head>${style}`).replace(/<body>/i, `<body>${overlay}`);
}

/** The brand flash, shown while the engine starts, on every launch. */
function flashPage(font: string | undefined): string {
  const face = `${fontFace(font)}:root{--wordmark:${FLASH_FAMILY}}`;
  return [
    "<!doctype html>",
    '<html lang="en">',
    '<head><meta charset="utf-8"><title>Duly</title>',
    `<style>${face}${FLASH_STYLE}</style></head>`,
    '<body><div class="stage">',
    `<h1 class="h">${escapeHtml(STARTING)}</h1>`,
    '<p class="word" aria-hidden="true">Duly<span class="dot">.</span></p>',
    '<div class="under">',
    `<p class="line">${escapeHtml(LINE)}</p>`,
    '<div class="mark" aria-hidden="true"><i></i></div>',
    `<p class="slow">${escapeHtml(SLOW)}</p>`,
    "</div>",
    "</div></body>",
    "</html>",
  ].join("\n");
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
  if (view.state === "starting") return flashPage(note.font);
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
