// @vitest-environment jsdom
/**
 * The page script of the shots run, in a page (resolutions point 16): an error screen gives
 * back no text in the screen's landmark type, so the shot is not counted as drawn.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  designLandmarks,
  drawScript,
  holdsLandmark,
  pageTexts,
  screenLandmark,
  type PageText,
} from "./shots";

const LANDMARKS: unknown = JSON.parse(
  readFileSync(designLandmarks(join(__dirname, "..", "..")), "utf8"),
);

async function runPage(body: string): Promise<PageText[] | null> {
  document.body.innerHTML = body;
  const value: unknown = await (0, eval)(drawScript("dark"));
  return pageTexts(value);
}

describe("the page script", () => {
  beforeEach(() => {
    Object.defineProperty(document, "fonts", {
      value: { ready: Promise.resolve() },
      configurable: true,
    });
    Element.prototype.getBoundingClientRect = function box(): DOMRect {
      return {
        x: 0,
        y: 0,
        width: 400,
        height: 40,
        top: 0,
        left: 0,
        right: 400,
        bottom: 40,
      } as DOMRect;
    };
  });

  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-theme");
  });

  const shell =
    '<nav><div style="font-size: 17px; font-weight: 700">Duly</div>' +
    '<a style="font-size: 14px">Timeline</a></nav>';
  const heading =
    '<h1 style="font-size: 32px; font-weight: 600; letter-spacing: -0.64px">Timeline</h1>';

  it("counts the timeline as drawn when its heading is on the page", async () => {
    const texts = await runPage(`<div id="root">${shell}<main>${heading}</main></div>`);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(texts).not.toBeNull();
    expect(holdsLandmark(texts ?? [], screenLandmark(LANDMARKS, "/timeline"))).toBe(true);
  });

  it("never counts an error screen as drawn", async () => {
    const error = '<main><p style="font-size: 16px">Something went wrong.</p></main>';
    const texts = await runPage(`<div id="root">${shell}${error}</div>`);
    expect(texts?.length).toBe(3);
    expect(holdsLandmark(texts ?? [], screenLandmark(LANDMARKS, "/timeline"))).toBe(false);
  });

  it("gives back nothing when there is no root, and leaves out hidden text", async () => {
    expect(await runPage(heading)).toEqual([]);
    const hidden = heading.replace('style="', 'style="visibility: hidden; ');
    expect(await runPage(`<div id="root">${hidden}</div>`)).toEqual([]);
  });

  it("gives back each text as it reads, with the landmark's type", async () => {
    const texts = await runPage(`<div id="root">${shell}<main>${heading}</main></div>`);
    expect(texts?.map((drawn) => drawn.text)).toEqual(["Duly", "Timeline", "Timeline"]);
  });

  it("does not count a heading in the landmark's type that reads otherwise", async () => {
    const other = heading.replace(">Timeline<", ">Updates<");
    const texts = await runPage(`<div id="root">${shell}<main>${other}</main></div>`);
    expect(holdsLandmark(texts ?? [], screenLandmark(LANDMARKS, "/timeline"))).toBe(false);
  });

  it("does not count another screen's heading as this screen's landmark", async () => {
    const texts = await runPage(`<div id="root">${shell}<main>${heading}</main></div>`);
    expect(holdsLandmark(texts ?? [], screenLandmark(LANDMARKS, "/"))).toBe(false);
  });
});
