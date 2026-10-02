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

// jsdom has no layout and no Web Animations. These stand in for them so every path of the
// glide runs: each element may carry data-boxes, a JSON list of the text boxes it reports
// in turn (the last one repeats); animate() records its keyframes and finishes at once.
interface Box {
  left: number;
  top: number;
  height: number;
}

interface Recorded {
  element: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
}

function rect(box: Box): DOMRect {
  return {
    ...box,
    width: box.height * 2,
    x: box.left,
    y: box.top,
    right: box.left + box.height * 2,
    bottom: box.top + box.height,
    toJSON: () => box,
  } as DOMRect;
}

function fakeBrowser() {
  const calls: Recorded[] = [];
  const seen = new Map<Element, number>();
  const boxOf = (element: Element | null): DOMRect => {
    const raw = element?.getAttribute("data-boxes");
    if (element === null || raw === null || raw === undefined)
      return rect({ left: 0, top: 0, height: 0 });
    const boxes = JSON.parse(raw) as Box[];
    const n = seen.get(element) ?? 0;
    seen.set(element, n + 1);
    return rect(boxes[Math.min(n, boxes.length - 1)] as Box);
  };
  // jsdom's Range has no getBoundingClientRect at all, so it is set, then removed.
  Object.assign(Range.prototype, {
    getBoundingClientRect(this: Range): DOMRect {
      const node = this.startContainer;
      const owner = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
      return boxOf(owner);
    },
  });
  const spies = [
    vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (this: Element) {
      return (this.classList.contains("wordmark")
        ? [rect({ left: 0, top: 0, height: 1 })]
        : []) as unknown as DOMRectList;
    }),
  ];
  const animate = vi.fn(function (
    this: Element,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ) {
    calls.push({ element: this, keyframes, options });
    return { finished: Promise.resolve(), cancel: vi.fn() } as unknown as Animation;
  });
  Object.assign(Element.prototype, { animate, getAnimations: () => [] });
  return {
    calls,
    restore: () => {
      for (const spy of spies) spy.mockRestore();
      delete (Range.prototype as Partial<Range>).getBoundingClientRect;
      delete (Element.prototype as Partial<Element>).animate;
      delete (Element.prototype as Partial<Element>).getAnimations;
    },
  };
}

function drawFlash(line = true): void {
  document.head.insertAdjacentHTML(
    "beforeend",
    '<style id="launch-flash-style">html,body{background:#000}</style>',
  );
  document.body.insertAdjacentHTML(
    "afterbegin",
    '<div class="launch-flash" aria-hidden="true"><div></div>' +
      '<p data-boxes=\'[{"left":400,"top":300,"height":64}]\'>Duly<span>.</span></p>' +
      (line ? '<p class="launch-line">Your F-1 journey, duly kept.</p>' : "") +
      "</div>",
  );
}

function addLogo(boxes: Box[]): HTMLElement {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<header class="onb-header"><p class="wordmark" style="font-size:19px;color:rgb(250, 250, 250)" data-boxes='${JSON.stringify(boxes)}'>Duly<span class="dot" style="color:rgb(143, 168, 230)">.</span></p></header>`,
  );
  return document.querySelector<HTMLElement>(".wordmark") as HTMLElement;
}

function gone(): Promise<void> {
  return vi.waitFor(
    () => {
      expect(overlays()).toHaveLength(0);
      expect(document.getElementById("launch-flash-style")).toBeNull();
    },
    { timeout: 4_000, interval: 20 },
  );
}

describe("the glide to the logo", () => {
  let browser: ReturnType<typeof fakeBrowser> | undefined;
  afterEach(() => {
    browser?.restore();
    document.querySelector(".onb-header")?.remove();
    vi.unstubAllGlobals();
  });

  it("shrinks the word onto the logo, hands over to a copy at the logo's size, and clears the black", async () => {
    browser = fakeBrowser();
    drawFlash();
    const logo = addLogo([{ left: 120, top: 80, height: 19 }]);
    landFlash(window);
    // The screen changes under the overlay: the glide waits for it to settle (quiet).
    document.body.append(document.createElement("section"));
    await gone();
    const transforms = browser.calls.flatMap((c) =>
      c.keyframes.map((k) => String(k.transform ?? "")),
    );
    // 19px of 64px: the large word scales to 0.296875 and the copy starts at its inverse.
    expect(transforms.some((t) => t.includes("scale(0.296875)"))).toBe(true);
    expect(transforms.some((t) => /scale\(3\.368/.test(t))).toBe(true);
    // The line steps aside, the veil clears.
    const faded = browser.calls.filter((c) => c.keyframes.at(-1)?.opacity === 0);
    expect(faded.some((c) => (c.element as HTMLElement).classList.contains("launch-line"))).toBe(
      true,
    );
    expect(logo.style.visibility).toBe("");
  });

  it("follows the logo the last pixels when it moved during the glide", async () => {
    browser = fakeBrowser();
    drawFlash(false);
    addLogo([
      { left: 120, top: 80, height: 19 },
      { left: 125, top: 80, height: 19 },
    ]);
    landFlash(window);
    await gone();
    const nudges = browser.calls.flatMap((c) => c.keyframes.map((k) => String(k.transform ?? "")));
    expect(nudges).toContain("translate(5px, 0px)");
  });

  it("waits for the logo's own entrance animation before aiming at it", async () => {
    browser = fakeBrowser();
    drawFlash(false);
    const logo = addLogo([{ left: 120, top: 80, height: 19 }]);
    class FakeEffect {
      constructor(public target: Element | null) {}
    }
    vi.stubGlobal("KeyframeEffect", FakeEffect);
    let rest = (): void => undefined;
    const entrance = {
      effect: new FakeEffect(logo.parentElement),
      finished: new Promise<void>((r) => (rest = r)),
    };
    const other = {
      effect: new FakeEffect(document.createElement("div")),
      finished: new Promise<void>(() => undefined),
    };
    Object.assign(document, { getAnimations: () => [entrance, other] });
    landFlash(window);
    await new Promise((r) => setTimeout(r, 300));
    expect(overlays()).toHaveLength(1);
    expect(browser.calls.some((c) => c.element === document.querySelector(".launch-flash p"))).toBe(
      false,
    );
    rest();
    await gone();
    delete (document as Partial<Document>).getAnimations;
  });

  it("only fades out under reduced motion", async () => {
    browser = fakeBrowser();
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce") }));
    drawFlash(false);
    addLogo([{ left: 120, top: 80, height: 19 }]);
    landFlash(window);
    await gone();
    expect(browser.calls).toHaveLength(1);
    expect(browser.calls[0]?.options.duration).toBe(200);
  });

  it("fades out when the screen shows no logo to land on", async () => {
    browser = fakeBrowser();
    drawFlash(false);
    landFlash(window);
    await gone();
    expect(browser.calls).toHaveLength(1);
    expect(browser.calls[0]?.keyframes.at(-1)?.opacity).toBe(0);
  });

  it("builds its own overlay when the desktop drew none, and clears one it cannot read", async () => {
    browser = fakeBrowser();
    (window as Win).duly = {};
    landFlash(window);
    expect(overlays()).toHaveLength(1);
    await gone();
    sessionStorage.clear();
    document.body.insertAdjacentHTML("afterbegin", '<div class="launch-flash"></div>');
    landFlash(window);
    expect(overlays()).toHaveLength(0);
  });
});
