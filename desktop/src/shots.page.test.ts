// @vitest-environment jsdom
/**
 * The page script of the shots run, in a page (resolutions point 18): a screen counts as
 * drawn when the page holds the element the app marks data-landmark="<screen>". An error
 * screen carries no mark, so it is never counted, whatever its text says.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { drawScript, holdsLandmark, pageMarks, type PageMark } from "./shots";

async function runPage(body: string): Promise<PageMark[] | null> {
  document.body.innerHTML = body;
  const value: unknown = await (0, eval)(drawScript("dark"));
  return pageMarks(value);
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

  const shell = '<nav><div>Duly</div><a href="/timeline">Timeline</a></nav>';
  const heading = '<h1 data-landmark="/timeline">Timeline</h1>';

  it("counts the timeline as drawn when its marked landmark is on the page", async () => {
    const marks = await runPage(`<div id="root">${shell}<main>${heading}</main></div>`);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(marks).toEqual([{ landmark: "/timeline", width: 400, height: 40 }]);
    expect(holdsLandmark(marks ?? [], "/timeline")).toBe(true);
  });

  it("does not compare text: the mark counts whatever the heading reads", async () => {
    const other = '<h1 data-landmark="/timeline">Everything is in order.</h1>';
    const marks = await runPage(`<div id="root">${shell}<main>${other}</main></div>`);
    expect(holdsLandmark(marks ?? [], "/timeline")).toBe(true);
  });

  it("never counts an error screen as drawn, even one that names the screen", async () => {
    const error = "<main><h1>Timeline</h1><p>Something went wrong.</p></main>";
    const marks = await runPage(`<div id="root">${shell}${error}</div>`);
    expect(marks).toEqual([]);
    expect(holdsLandmark(marks ?? [], "/timeline")).toBe(false);
  });

  it("does not count another screen's landmark as this screen's", async () => {
    const marks = await runPage(`<div id="root">${shell}<main>${heading}</main></div>`);
    expect(holdsLandmark(marks ?? [], "/")).toBe(false);
  });

  it("gives back nothing when there is no root, and leaves out a hidden mark", async () => {
    expect(await runPage(heading)).toEqual([]);
    const hidden = heading.replace("<h1 ", '<h1 style="visibility: hidden" ');
    expect(await runPage(`<div id="root">${hidden}</div>`)).toEqual([]);
    const clear = heading.replace("<h1 ", '<h1 style="opacity: 0" ');
    expect(await runPage(`<div id="root">${clear}</div>`)).toEqual([]);
  });
});
