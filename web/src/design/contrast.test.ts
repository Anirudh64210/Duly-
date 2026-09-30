import { describe, expect, it } from "vitest";

import app from "../app/app.css?raw";
import css from "./tokens.css?raw";

// design-1 sections 3.2, 3.7 and 14.1: every text pair and every mark pair, light and dark.

/** The tokens of the first block for a selector that sets --ground. */
function block(selector: string): Record<string, string> {
  let start = css.indexOf(`${selector} {`);
  while (start >= 0 && !css.slice(start, css.indexOf("}", start)).includes("--ground")) {
    start = css.indexOf(`${selector} {`, start + 1);
  }
  const body = css.slice(start, css.indexOf("}", start));
  const found: Record<string, string> = {};
  for (const match of body.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{6})/g)) {
    found[match[1] ?? ""] = match[2] ?? "";
  }
  return found;
}

const light = block(":root");
const dark = { ...light, ...block(':root[data-theme="dark"]') };

function luminance(hex: string): number {
  const channel = (at: number) => {
    const value = parseInt(hex.slice(at, at + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = ["--ink", "--ink-body", "--ink-2", "--accent", "--caution"];
const GROUNDS = ["--ground", "--surface", "--row-hover", "--option-hover"];
const MARKS: [string, string][] = [
  ["--accent", "--ground"],
  ["--accent", "--surface"],
  ["--accent", "--row-hover"],
  ["--accent", "--track"],
  ["--on-accent", "--accent"],
  ["--ink-2", "--ground"],
  ["--ink-3", "--ground"],
  ["--ink-3", "--surface"],
  ["--ink-3", "--row-hover"],
  ["--ring-next", "--ground"],
  ["--ring-next", "--row-hover"],
];

describe.each([
  ["light", light],
  ["dark", dark],
])("contrast in %s", (_theme, tokens) => {
  const hex = (name: string) => {
    const value = tokens[name];
    if (value === undefined) throw new Error(`no ${name}`);
    return value;
  };
  for (const text of TEXT) {
    for (const ground of GROUNDS) {
      // design-1 section 3.7 keeps a caution line off the row hover.
      if (text === "--caution" && ground === "--row-hover") continue;
      it(`${text} on ${ground} is at least 4.5:1`, () => {
        expect(ratio(hex(text), hex(ground))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
  for (const ground of ["--accent", "--button-hover"]) {
    it(`--on-accent on ${ground} is at least 4.5:1`, () => {
      expect(ratio(hex("--on-accent"), hex(ground))).toBeGreaterThanOrEqual(4.5);
    });
  }
  for (const [mark, ground] of MARKS) {
    it(`${mark} on ${ground} is at least 3:1`, () => {
      expect(ratio(hex(mark), hex(ground))).toBeGreaterThanOrEqual(3);
    });
  }
});

describe("tokens (design-1 section 14.1)", () => {
  it("holds no --faint token and no ink-3, ring or track in a color property", () => {
    expect(css).not.toMatch(/--faint/);
    expect(app).not.toMatch(/(^|[^-])color:\s*var\(--(ink-3|ring-next|track)\)/m);
  });

  it("imports only the four Instrument Sans weights and uses no mono font", () => {
    const weights = [...app.matchAll(/@fontsource\/instrument-sans\/(\d+)\.css/g)].map((m) => m[1]);
    expect(weights).toEqual(["400", "500", "600", "700"]);
    expect(app).not.toMatch(/--font-mono/);
  });

  it("follows the system appearance and sets color-scheme", () => {
    expect(css).toMatch(/prefers-color-scheme: dark/);
    expect(css).toMatch(/color-scheme: light dark/);
  });

  it("turns every animation and transition off under reduced motion", () => {
    expect(app).toMatch(
      /prefers-reduced-motion: reduce\)\s*{[^}]*animation: none !important;\s*transition: none !important;/,
    );
  });
});
