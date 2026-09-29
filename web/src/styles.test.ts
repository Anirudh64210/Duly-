import { describe, expect, it } from "vitest";
import css from "./styles.css?raw";

// design/canvas/DESIGN-SPEC.md: motion is additive, so with animations off the design is complete.

function reducedMotionBlocks(text: string): string[] {
  const blocks: string[] = [];
  const marker = "@media (prefers-reduced-motion: reduce)";
  let at = text.indexOf(marker);
  while (at !== -1) {
    let depth = 0;
    let end = text.indexOf("{", at);
    for (; end < text.length; end += 1) {
      if (text[end] === "{") depth += 1;
      if (text[end] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    blocks.push(text.slice(at, end + 1));
    at = text.indexOf(marker, end);
  }
  return blocks;
}

function keyframes(text: string, name: string): string {
  const start = text.indexOf(`@keyframes ${name}`);
  const end = text.indexOf("\n}\n", start);
  return text.slice(start, end);
}

describe("motion in styles.css", () => {
  const reduced = reducedMotionBlocks(css).join("\n");

  it("opens a disclosure over 0.28s with the entrance curve", () => {
    expect(css).toMatch(
      /\.working \{\s*animation: drop-in 0\.28s cubic-bezier\(0\.2, 0\.7, 0\.2, 1\)/,
    );
  });

  it("moves a disclosure by transform only, so the content is there without the animation", () => {
    const drop = keyframes(css, "drop-in");
    expect(drop).toContain("transform");
    expect(drop).not.toContain("opacity");
    expect(drop).not.toContain("height");
  });

  it("presses a button to 0.97 and eases a row's background over 0.16s", () => {
    expect(css).toContain("transform: scale(0.97)");
    expect(css).toMatch(/background-color 0\.16s/);
  });

  it("turns off every transition and animation when the person asks for less motion", () => {
    for (const selector of ["button", ".item-row", ".working", ".verdict::before"]) {
      expect(reduced).toContain(selector);
    }
    expect(reduced).toContain("transition: none !important");
    expect(reduced).toContain("animation: none !important");
  });

  it("holds no amber, which is kept for the AI star", () => {
    expect(css.toLowerCase()).not.toContain("#b45309");
  });
});
