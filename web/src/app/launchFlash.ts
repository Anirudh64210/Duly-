/**
 * Desktop only. While its engine starts, the app shows a flash (desktop/src/pages.ts): white
 * "Duly" on black, centred, the accent dot. The screen opens on that same frame, carries the
 * wordmark to its own logo in the corner and lets the black go. Once per window: a reload
 * after an engine restart opens straight on the screen.
 */

// The flash's numbers, as desktop/src/pages.ts draws it.
const GROUND = "#000000";
const INK = "#FFFFFF";
const DOT = "#8FA8E6";
const SIZE_PX = 64;

const FLY_MS = 900;
// The word rises to the logo's height first, then glides left into place, so its path
// stays above whatever sits under the logo (the setup screen's progress row).
const RISE_MS = 680;
const RISE_EASE = "cubic-bezier(.45,0,.15,1)";
// Out of the centre gently, a glide, a landing with no crawl at the end.
const GLIDE_EASE = "cubic-bezier(.65,0,.25,1)";
// The large word hands over to one drawn at the logo's size, mid-flight.
const HANDOVER_FROM = 0.3;
const HANDOVER_TO = 0.6;
// The screen shows through only as the word lands, never under it mid-flight.
const CLEAR_MS = 480;
const CLEAR_AFTER_MS = 420;
const LINE_OUT_MS = 260;
const FIND_FOR_MS = 1_500;
// The glide waits for the screen to stop changing (its first data), at most this long.
const QUIET_MS = 120;
const QUIET_FOR_MS = 900;
// At most this long for the logo to come to rest.
const STILL_FOR_MS = 1_200;
// A last nudge, only if the logo moved during the glide.
const SETTLE_MS = 160;
export const SHOWN_KEY = "duly.flash.shown";

interface DesktopWindow extends Window {
  duly?: unknown;
}

/** True the first time in this window. Storage that throws counts as the first time. */
function firstTime(win: Window): boolean {
  try {
    if (win.sessionStorage.getItem(SHOWN_KEY) !== null) return false;
    win.sessionStorage.setItem(SHOWN_KEY, "1");
  } catch {
    // Shown anyway: the flash is drawn once more at worst.
  }
  return true;
}

interface Parts {
  overlay: HTMLElement;
  veil: HTMLElement;
  word: HTMLElement;
  dot: HTMLElement;
}

function build(doc: Document): Parts {
  const overlay = doc.createElement("div");
  overlay.className = "launch-flash";
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;" +
    "justify-content:center;pointer-events:none";
  // The black is its own layer, so clearing it is a fade the compositor runs alone.
  const veil = doc.createElement("div");
  veil.style.cssText = `position:absolute;inset:0;background:${GROUND};will-change:opacity`;
  const word = doc.createElement("p");
  word.style.cssText =
    `position:relative;margin:0;font:700 ${SIZE_PX}px/1 var(--font-ui);letter-spacing:-0.01em;` +
    `color:${INK};white-space:nowrap;-webkit-font-smoothing:antialiased`;
  const dot = doc.createElement("span");
  dot.textContent = ".";
  dot.style.cssText = `display:inline-block;color:${DOT}`;
  word.append("Duly", dot);
  overlay.append(veil, word);
  return { overlay, veil, word, dot };
}

/** The screen's own wordmark, the one on show (the sidebar's or the top bar's). */
function findWordmark(doc: Document, overlay: HTMLElement): HTMLElement | null {
  for (const found of doc.querySelectorAll<HTMLElement>(".wordmark")) {
    if (!overlay.contains(found) && found.getClientRects().length > 0) return found;
  }
  return null;
}

/** The box of the word "Duly" itself, padding and line height left out. */
function textBox(element: HTMLElement): DOMRect | null {
  const text = [...element.childNodes].find(
    (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "",
  );
  if (text === undefined) return null;
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(text);
  const box = range.getBoundingClientRect();
  return box.height > 0 ? box : null;
}

async function settle(animations: Animation[]): Promise<void> {
  await Promise.all(animations.map((a) => a.finished)).catch(() => undefined);
}

function frames(win: Window, count: number): Promise<void> {
  return new Promise((done) => {
    const next = (left: number) => {
      if (left === 0) done();
      else win.requestAnimationFrame(() => next(left - 1));
    };
    next(count);
  });
}

/** Resolves once the screen under the overlay has not changed for QUIET_MS. */
function quiet(win: Window, overlay: HTMLElement): Promise<void> {
  return new Promise((done) => {
    let timer = 0;
    const end = () => {
      watch.disconnect();
      win.clearTimeout(timer);
      win.clearTimeout(cap);
      done();
    };
    const watch = new MutationObserver((records) => {
      if (records.every((record) => overlay.contains(record.target))) return;
      win.clearTimeout(timer);
      timer = win.setTimeout(end, QUIET_MS);
    });
    const cap = win.setTimeout(end, QUIET_FOR_MS);
    timer = win.setTimeout(end, QUIET_MS);
    watch.observe(win.document.body, { childList: true, subtree: true, characterData: true });
  });
}

function wait(win: Window, ms: number): Promise<void> {
  return new Promise((done) => win.setTimeout(done, ms));
}

/**
 * Resolves when nothing moves the logo any more: the screen's own entrance animations on the
 * logo or a box around it (the setup header rises 12px as it appears) have finished. The
 * glide aims at where the logo rests, not where it is mid-entrance.
 */
async function still(win: Window, target: HTMLElement): Promise<void> {
  const chain = new Set<Element>();
  for (let at: Element | null = target; at !== null; at = at.parentElement) chain.add(at);
  const moving = (win.document.getAnimations?.() ?? []).filter((animation) => {
    const effect = animation.effect;
    return effect instanceof KeyframeEffect && effect.target !== null && chain.has(effect.target);
  });
  if (moving.length === 0) return;
  await Promise.race([
    Promise.all(moving.map((animation) => animation.finished.catch(() => undefined))),
    wait(win, STILL_FOR_MS),
  ]);
}

/** A fixed layer for one copy of the word: the outer box rises, the inner one glides. */
function layer(doc: Document, overlay: HTMLElement, word: HTMLElement, left: number, top: number) {
  const outer = doc.createElement("div");
  outer.style.cssText =
    "position:fixed;left:0;top:0;width:0;height:0;will-change:transform,opacity";
  word.style.position = "absolute";
  word.style.left = `${left}px`;
  word.style.top = `${top}px`;
  word.style.transformOrigin = "0 0";
  word.style.willChange = "transform";
  outer.append(word);
  overlay.append(outer);
  return outer;
}

async function land(win: Window, parts: Parts, target: HTMLElement | null): Promise<void> {
  const { overlay, veil, word } = parts;
  const doc = win.document;
  if (typeof overlay.animate !== "function") {
    finish(doc, overlay);
    return;
  }
  const reduce = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  await doc.fonts?.ready.catch(() => undefined);
  await quiet(win, overlay);
  if (target !== null) await still(win, target);
  await frames(win, 1);
  const from = textBox(word);
  const to = target === null ? null : textBox(target);
  if (reduce || target === null || from === null || to === null) {
    await settle([
      overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: reduce ? 200 : CLEAR_MS,
        easing: "ease-out",
        fill: "forwards",
      }),
    ]);
    finish(doc, overlay);
    return;
  }
  // Only transform and opacity move, so the compositor runs the glide on its own and the
  // screen's work underneath cannot stall it. The large word shrinks and fades as a copy
  // drawn at the logo's own size grows into place; that copy lands exactly on the logo.
  const box = word.getBoundingClientRect();
  const size = Number.parseFloat(win.getComputedStyle(target).fontSize) || SIZE_PX;
  const k = size / SIZE_PX;
  const endLeft = to.left - (from.left - box.left) * k;
  const endTop = to.top - (from.top - box.top) * k;
  const dx = endLeft - box.left;
  const dy = endTop - box.top;

  const big = layer(doc, overlay, word, box.left, box.top);
  const small = doc.createElement("p");
  small.style.cssText =
    `margin:0;font:700 ${size}px/1 var(--font-ui);letter-spacing:-0.01em;white-space:nowrap;` +
    `color:${win.getComputedStyle(target).color};-webkit-font-smoothing:antialiased`;
  const smallDot = doc.createElement("span");
  smallDot.textContent = ".";
  smallDot.style.cssText = `display:inline-block;color:${
    win.getComputedStyle(target.querySelector(".dot") ?? target).color
  }`;
  small.append("Duly", smallDot);
  const landing = layer(doc, overlay, small, endLeft, endTop);
  target.style.visibility = "hidden";

  const rise = { duration: RISE_MS, easing: RISE_EASE, fill: "forwards" } as const;
  const glide = { duration: FLY_MS, easing: GLIDE_EASE, fill: "forwards" } as const;
  const fade = { duration: FLY_MS, fill: "forwards" } as const;
  const [a, b] = [HANDOVER_FROM, HANDOVER_TO];
  // The line under the word (desktop/src/pages.ts) steps aside as the word leaves.
  const line = overlay.querySelector<HTMLElement>(".launch-line");
  const lineOut =
    line === null
      ? []
      : [
          line.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: LINE_OUT_MS,
            easing: "ease-out",
            fill: "forwards",
          }),
        ];
  await settle([
    ...lineOut,
    big.animate([{ transform: "none" }, { transform: `translateY(${dy}px)` }], rise),
    word.animate([{ transform: "none" }, { transform: `translateX(${dx}px) scale(${k})` }], glide),
    big.animate(
      [
        { opacity: 1, offset: 0 },
        { opacity: 1, offset: a },
        { opacity: 0, offset: b },
        { opacity: 0, offset: 1 },
      ],
      fade,
    ),
    landing.animate([{ transform: `translateY(${-dy}px)` }, { transform: "none" }], rise),
    small.animate(
      [{ transform: `translateX(${-dx}px) scale(${1 / k})` }, { transform: "none" }],
      glide,
    ),
    landing.animate(
      [
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: a },
        { opacity: 1, offset: b },
        { opacity: 1, offset: 1 },
      ],
      fade,
    ),
    veil.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: CLEAR_MS,
      delay: CLEAR_AFTER_MS,
      easing: "cubic-bezier(.4,0,.2,1)",
      fill: "forwards",
    }),
  ]);
  // While it moved, the copy was a scaled picture of text. Drawn as plain text again, at rest,
  // it is pixel for pixel what the logo draws, so the swap below cannot show.
  for (const element of [landing, small]) {
    element.style.transform = "none";
    element.style.willChange = "auto";
    for (const animation of element.getAnimations()) animation.cancel();
  }
  landing.style.opacity = "1";
  await frames(win, 2);
  // The copy is now exactly on the logo. Should the logo have moved during the glide, the
  // copy follows it the last pixels before the logo takes its place.
  const now = textBox(target);
  if (now !== null) {
    const nx = now.left - to.left;
    const ny = now.top - to.top;
    if (Math.abs(nx) > 0.25 || Math.abs(ny) > 0.25) {
      await settle([
        landing.animate([{ transform: "none" }, { transform: `translate(${nx}px, ${ny}px)` }], {
          duration: SETTLE_MS,
          easing: "ease-out",
          fill: "forwards",
        }),
      ]);
    }
  }
  target.style.visibility = "";
  finish(doc, overlay);
}

/** Removes the overlay and the black page ground the desktop set for the first frame. */
function finish(doc: Document, overlay: HTMLElement): void {
  overlay.remove();
  doc.getElementById("launch-flash-style")?.remove();
}

/** The overlay the desktop drew into this page's first frame (desktop/src/pages.ts withFlash). */
function adopt(overlay: HTMLElement): Parts | null {
  const veil = overlay.firstElementChild;
  const word = overlay.querySelector("p");
  const dot = word?.querySelector("span");
  if (!(veil instanceof HTMLElement) || word === null || dot == null) return null;
  return { overlay, veil, word, dot };
}

/** Called once, before the screen's first render. */
export function landFlash(win: DesktopWindow = window): void {
  const doc = win.document;
  const drawn = doc.querySelector<HTMLElement>(".launch-flash");
  if (drawn !== null) {
    firstTime(win);
    const parts = adopt(drawn);
    if (parts === null) {
      finish(doc, drawn);
      return;
    }
    follow(win, parts);
    return;
  }
  if (win.duly === undefined || !firstTime(win)) return;
  const parts = build(doc);
  doc.body.append(parts.overlay);
  follow(win, parts);
}

function follow(win: Window, parts: Parts): void {
  const doc = win.document;
  const started = win.performance.now();
  const look = () => {
    const target = findWordmark(doc, parts.overlay);
    if (target === null && win.performance.now() - started < FIND_FOR_MS) {
      win.requestAnimationFrame(look);
      return;
    }
    void land(win, parts, target);
  };
  win.requestAnimationFrame(look);
}
