import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  COPIED,
  COPY_DETAILS,
  COPY_PATH,
  COULD_NOT_START,
  FLASH_MS,
  LINE,
  RETRY_PATH,
  SLOW,
  SLOW_AFTER_MS,
  STARTING,
  TRY_AGAIN,
  details,
  escapeHtml,
  statusPage,
  withFlash,
} from "./pages";

describe("Starting Duly: the brand flash (point 23)", () => {
  const html = statusPage({ state: "starting" });

  it("shows white Duly and the accent dot on black, and names itself to a screen reader", () => {
    expect(STARTING).toBe("Starting Duly");
    expect(html).toContain(`<h1 class="h">${STARTING}</h1>`);
    expect(html).toContain('<p class="word" aria-hidden="true">Duly<span class="dot">.</span></p>');
    expect(html).toContain("background:#000000;color:#FFFFFF");
    expect(html).toContain("color:#8FA8E6");
    expect(html).not.toContain("<form");
  });

  it("falls back to the system font when the screen's font is missing", () => {
    expect(html).toContain('--wordmark:"Duly Flash",-apple-system');
    expect(html).not.toContain("@font-face");
  });

  it("says the line on every launch, in time to be read before the hand-off", () => {
    expect(LINE).toBe("Your F-1 journey, duly kept.");
    expect(html).toContain(`<p class="line">${LINE}</p>`);
    expect(FLASH_MS).toBe(2_000);
    // In at .95s, settled by 1.55s: read for about half a second before the hand-off.
    expect(html).toContain("animation:say .6s ease .95s forwards");
  });

  it("ends its intro inside the hold, and holds still under reduced motion", () => {
    // The dot, the last to move, ends at .55s + .85s = 1.4s.
    expect(html).toContain("animation:drop .85s linear .55s forwards");
    expect(html).toContain("@media (prefers-reduced-motion:reduce){.word,.dot{animation:none;");
  });

  it("adds the second line after 8 seconds", () => {
    expect(SLOW).toBe("This can take a little longer the first time.");
    expect(SLOW_AFTER_MS).toBe(8_000);
    expect(html).toContain(`<p class="slow">${SLOW}</p>`);
    expect(html).toMatch(/visibility:hidden;animation:appear 0s linear 8s forwards\}/);
  });

  it("draws a quiet progress mark only after 2.8 seconds, and none under reduced motion", () => {
    expect(html).toContain('<div class="mark" aria-hidden="true">');
    expect(html).toContain("animation:fade .3s ease-out 2.8s forwards");
    expect(html).toContain(".mark{display:none}}");
  });

  it("runs no script", () => {
    expect(html).not.toContain("<script");
  });
});

describe("Duly could not start (point 23)", () => {
  const lines = ["Traceback (most recent call last):", "<script>x</script>"];

  it("says so, for a failed and for an ended engine, with Try again and Copy details", () => {
    for (const state of ["failed", "ended"] as const) {
      const html = statusPage({ state, lines });
      expect(COULD_NOT_START).toBe("Duly could not start.");
      expect(html).toContain(`<h1>${COULD_NOT_START}</h1>`);
      expect(html).toContain(
        `<form method="post" action="/${RETRY_PATH}"><button type="submit" class="go">${TRY_AGAIN}</button></form>`,
      );
      expect(html).toContain(
        `<form method="post" action="/${COPY_PATH}"><button type="submit">${COPY_DETAILS}</button></form>`,
      );
      expect(TRY_AGAIN).toBe("Try again");
      expect(COPY_DETAILS).toBe("Copy details");
    }
  });

  it("shows no stack trace on its face", () => {
    const html = statusPage({ state: "failed", lines });
    expect(html).not.toContain("Traceback");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<pre");
  });

  it("says when the details were copied, and Copy details takes the last lines", () => {
    expect(statusPage({ state: "failed", lines }, { copied: true })).toContain(COPIED);
    expect(statusPage({ state: "failed", lines })).not.toContain(COPIED);
    expect(details({ state: "ended", lines })).toBe(lines.join("\n"));
    expect(details({ state: "starting" })).toBe("");
  });
});

describe("the pages' words", () => {
  it("escapes what it prints", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });

  it("hold no long dash, no emoji and no word the copy lint forbids", () => {
    const text = readFileSync(join(__dirname, "pages.ts"), "utf8");
    const lint = readFileSync(join(__dirname, "..", "..", "tools", "copy_lint", "lint.py"), "utf8");
    const block = /FORBIDDEN_PHRASES[^=]*= \(([\s\S]*?)\n\)/.exec(lint)?.[1] ?? "";
    const words = [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? "");
    expect(words.length).toBeGreaterThan(20);
    for (const word of words) {
      const pattern = new RegExp(
        `(?<![\\w-])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`,
        "i",
      );
      expect(pattern.test(text), word).toBe(false);
    }
    expect(new RegExp("[\\u2012-\\u2015]").test(text)).toBe(false);
    expect(new RegExp("[\\u{1F000}-\\u{1FAFF}\\u2600-\\u27BF]", "u").test(text)).toBe(false);
    expect(text.includes(String.fromCharCode(0xfe0f))).toBe(false);
  });
});

describe("the flash's last frame in the screen's page", () => {
  const index =
    '<!doctype html><html><head><title>Duly</title></head><body><div id="root"></div></body></html>';
  const page = withFlash(index, "data:font/woff2;base64,AAAA");

  it("paints black with the wordmark at the centre before any script runs", () => {
    expect(page).toContain('<head><style id="launch-flash-style">');
    expect(page).toContain("html,body{background:#000000}");
    expect(page).toContain('<body><div class="launch-flash" aria-hidden="true"');
    expect(page).toContain('Duly<span style="display:inline-block;color:#8FA8E6">.</span>');
    expect(page.indexOf("launch-flash")).toBeLessThan(page.indexOf('id="root"'));
    // The line too, where the flash page has it, so the hand-off frame is the same.
    expect(page).toContain(`>${LINE}</p></div>`);
    expect(page).toContain("top:calc(50% + 56px)");
    expect(statusPage({ state: "starting" })).toContain("top:calc(50% + 56px)");
  });

  it("draws the word in the inlined font, as the flash page does", () => {
    expect(page).toContain('src:url("data:font/woff2;base64,AAAA")');
    expect(statusPage({ state: "starting" }, { font: "data:font/woff2;base64,AAAA" })).toContain(
      'src:url("data:font/woff2;base64,AAAA")',
    );
  });
});
