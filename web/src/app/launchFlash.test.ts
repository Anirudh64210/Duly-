import { afterEach, describe, expect, it, vi } from "vitest";

import { SHOWN_KEY, landFlash } from "./launchFlash";

type Win = Window & { duly?: unknown };

function overlays(): Element[] {
  return [...document.querySelectorAll(".launch-flash")];
}

afterEach(() => {
  for (const found of overlays()) found.remove();
  sessionStorage.clear();
  delete (window as Win).duly;
});

describe("the desktop flash hand-off", () => {
  it("does nothing in a browser, where there is no desktop bridge", () => {
    landFlash(window);
    expect(overlays()).toHaveLength(0);
  });

  it("opens on the flash's own frame: Duly and the dot, on black, hidden from screen readers", () => {
    (window as Win).duly = {};
    landFlash(window);
    const [overlay] = overlays();
    expect(overlay?.getAttribute("aria-hidden")).toBe("true");
    expect(overlay?.textContent).toBe("Duly.");
    expect((overlay?.firstElementChild as HTMLElement).style.background).toBe("rgb(0, 0, 0)");
  });

  it("shows once per window, so a reload after an engine restart opens on the screen", () => {
    (window as Win).duly = {};
    landFlash(window);
    landFlash(window);
    expect(overlays()).toHaveLength(1);
    expect(sessionStorage.getItem(SHOWN_KEY)).toBe("1");
  });

  it("carries on the overlay the desktop drew into the first frame, and clears its black ground", async () => {
    document.head.insertAdjacentHTML(
      "beforeend",
      '<style id="launch-flash-style">html,body{background:#000}</style>',
    );
    document.body.insertAdjacentHTML(
      "afterbegin",
      '<div class="launch-flash" aria-hidden="true"><div></div><p>Duly<span>.</span></p></div>',
    );
    landFlash(window);
    expect(overlays()).toHaveLength(1);
    expect(sessionStorage.getItem(SHOWN_KEY)).toBe("1");
    // jsdom draws no logo and cannot animate: after looking for the logo, the hand-off ends
    // with the overlay and the black ground gone.
    await vi.waitFor(
      () => {
        expect(overlays()).toHaveLength(0);
        expect(document.getElementById("launch-flash-style")).toBeNull();
      },
      { timeout: 4_000, interval: 50 },
    );
  });
});
