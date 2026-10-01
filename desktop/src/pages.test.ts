import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  COPIED,
  COPY_DETAILS,
  COPY_PATH,
  COULD_NOT_START,
  RETRY_PATH,
  SLOW,
  SLOW_AFTER_MS,
  STARTING,
  TRY_AGAIN,
  details,
  escapeHtml,
  statusPage,
} from "./pages";

describe("Starting Duly (point 23)", () => {
  const html = statusPage({ state: "starting" });

  it("says one line, on the canvas ground", () => {
    expect(STARTING).toBe("Starting Duly");
    expect(html).toContain(`<h1>${STARTING}</h1>`);
    expect(html).toContain("background:#F8F7F4");
    expect(html).not.toContain("<form");
  });

  it("adds the second line after 8 seconds", () => {
    expect(SLOW).toBe("This can take a little longer the first time.");
    expect(SLOW_AFTER_MS).toBe(8_000);
    expect(html).toContain(`<p class="slow">${SLOW}</p>`);
    expect(html).toMatch(/\.slow\{visibility:hidden;animation:appear 0s linear 8s forwards\}/);
  });

  it("draws a quiet progress mark, and none under reduced motion", () => {
    expect(html).toContain('<div class="mark" aria-hidden="true">');
    expect(html).toContain("@media (prefers-reduced-motion:reduce){.mark{display:none}}");
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
