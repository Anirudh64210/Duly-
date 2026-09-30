import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import * as web from "../../web/src/lib/shots";
import { webDist } from "./engine";
import { createAppHandler, readInside } from "./protocol";
import {
  NO_ENGINE,
  LANDMARK_ATTRIBUTE,
  SHOTS_PAGE,
  SHOT_SCREENS,
  SHOT_SIZE,
  SHOT_THEMES,
  SHOT_WINDOWS,
  drawScript,
  fitsWindows,
  holdsLandmark,
  landmarkSelector,
  pageMarks,
  pageWidth,
  planShots,
  refusedInApp,
  sampleNames,
  screenName,
  shotFile,
  shotUrl,
  shotsExitCode,
  shotsFolder,
  shotsJson,
  webSamples,
  widthScript,
  type PageMark,
  type PageWidth,
  type ShotResult,
} from "./shots";

const ROOT = join(__dirname, "..", "..");
const WEB_SHOTS = readFileSync(join(ROOT, "web", "src", "lib", "shots.ts"), "utf8");

describe("shotsFolder", () => {
  it("is null when this is not a shots run", () => {
    expect(shotsFolder(["electron", "."])).toBeNull();
    expect(shotsFolder(["electron", ".", "--smoke", "/tmp/x"])).toBeNull();
  });

  it("takes the folder after --shots, as the Makefile passes it", () => {
    expect(shotsFolder(["electron", ".", "--shots", "/repo/.scratch/shots"])).toBe(
      "/repo/.scratch/shots",
    );
  });

  it("takes --shots=<folder>", () => {
    expect(shotsFolder(["electron", "--shots=/a/b"])).toBe("/a/b");
  });

  it("refuses --shots with no folder", () => {
    expect(() => shotsFolder(["electron", "--shots"])).toThrow("--shots needs a folder");
    expect(() => shotsFolder(["electron", "--shots", ""])).toThrow("--shots needs a folder");
    expect(() => shotsFolder(["electron", "--shots", "--smoke"])).toThrow("--shots needs a folder");
    expect(() => shotsFolder(["electron", "--shots="])).toThrow("--shots needs a folder");
  });
});

describe("the shots follow the web's shots page", () => {
  it("draws at the canvas size, 1280 by 832, as web/src/lib/shots.ts says", () => {
    expect(SHOT_SIZE).toEqual({ width: 1280, height: 832 });
    expect(WEB_SHOTS).toContain(
      `SHOT_SIZE = { width: ${String(SHOT_SIZE.width)}, height: ${String(SHOT_SIZE.height)} }`,
    );
  });

  it("lists the same screens as web/src/lib/shots.ts, in its order", () => {
    const block = /SHOT_SCREENS = \[([^\]]*)\]/.exec(WEB_SHOTS)?.[1] ?? "";
    const web = [...block.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
    expect(web.length).toBeGreaterThan(0);
    expect(SHOT_SCREENS).toEqual(web);
  });

  it("asks the page by screen and sample, the query shotAsked reads", () => {
    expect(WEB_SHOTS).toContain('query.get("screen")');
    expect(WEB_SHOTS).toContain('query.get("sample")');
    const url = new URL(shotUrl("/", "path-stem-next"));
    expect(url.protocol).toBe("duly:");
    expect(url.host).toBe("app");
    expect(url.pathname).toBe(`/${SHOTS_PAGE}`);
    expect(url.searchParams.get("screen")).toBe("/");
    expect(url.searchParams.get("sample")).toBe("path-stem-next");
  });
});

describe("sampleNames", () => {
  it("takes each output that sits beside its case", () => {
    expect(sampleNames(["b.json", "b.case.json", "a.json", "a.case.json", "README.md"])).toEqual([
      "a",
      "b",
    ]);
  });

  it("leaves out an output with no case and a case with no output", () => {
    expect(sampleNames(["alone.json", "orphan.case.json"])).toEqual([]);
  });

  it("leaves out names that would not make a plain file name", () => {
    expect(sampleNames(["../x.json", "../x.case.json", "A B.json", "A B.case.json"])).toEqual([]);
  });

  it("finds the samples in web/samples", () => {
    const files = readdirSync(webSamples(ROOT));
    const names = sampleNames(files);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(files).toContain(`${name}.case.json`);
  });
});

describe("planShots", () => {
  it("takes every screen, from every sample, in light and dark", () => {
    const shots = planShots(["one", "two"]);
    expect(shots).toHaveLength(SHOT_SCREENS.length * 2 * SHOT_THEMES.length);
    expect(SHOT_THEMES).toEqual(["light", "dark"]);
    for (const screen of SHOT_SCREENS) {
      for (const sample of ["one", "two"]) {
        for (const theme of SHOT_THEMES) {
          expect(shots).toContainEqual({
            screen,
            sample,
            theme,
            url: shotUrl(screen, sample),
            file: shotFile(screen, sample, theme),
          });
        }
      }
    }
  });

  it("gives every shot its own file", () => {
    const files = planShots(["one", "two"]).map((shot) => shot.file);
    expect(new Set(files).size).toBe(files.length);
  });

  it("plans nothing when there is no sample", () => {
    expect(planShots([])).toEqual([]);
  });
});

describe("file names", () => {
  it("names home for / and drops the slash elsewhere", () => {
    expect(screenName("/")).toBe("home");
    expect(screenName("/timeline")).toBe("timeline");
  });

  it("is screen, sample and theme", () => {
    expect(shotFile("/", "path-stem-next", "dark")).toBe("home-path-stem-next-dark.png");
    expect(shotFile("/case", "path-window-open", "light")).toBe("case-path-window-open-light.png");
  });

  it("never names a folder", () => {
    for (const shot of planShots(["path-stem-next"])) {
      expect(shot.file).not.toMatch(/[/\\]/);
    }
  });
});

describe("drawScript", () => {
  it("sets the theme on the page's root before it waits", () => {
    for (const theme of SHOT_THEMES) {
      const script = drawScript(theme);
      expect(script).toContain(`setAttribute("data-theme", "${theme}")`);
      expect(script.indexOf("data-theme")).toBeLessThan(script.indexOf("fonts.ready"));
    }
  });

  it("gives back each marked element under the root, not a verdict of its own", () => {
    const script = drawScript("light");
    expect(script).toContain('getElementById("root")');
    expect(script).toContain('querySelectorAll("[data-landmark]")');
    expect(script).toContain('getAttribute("data-landmark")');
    expect(script).not.toContain("textContent");
  });
});

describe("each screen's landmark (resolutions point 18)", () => {
  it("is the element marked data-landmark with the route the shot asks for", () => {
    expect(LANDMARK_ATTRIBUTE).toBe("data-landmark");
    expect(landmarkSelector("/timeline")).toBe('[data-landmark="/timeline"]');
    expect(landmarkSelector("/")).toBe('[data-landmark="/"]');
  });

  it("gives every built screen a landmark of its own", () => {
    const selectors = SHOT_SCREENS.map(landmarkSelector);
    expect(new Set(selectors).size).toBe(SHOT_SCREENS.length);
  });
});

describe("the web app's landmark table (resolutions point 20)", () => {
  // The table the web app writes into data-landmark, read from its own module, so the value the
  // app writes and the value the shot run looks for cannot differ.
  const webScreens: readonly string[] = web.SHOT_SCREENS;
  const webLandmarks: Readonly<Record<string, string>> = web.LANDMARKS;

  it("names each screen the shot run takes, and no other", () => {
    expect(Object.keys(webLandmarks).sort()).toEqual([...SHOT_SCREENS].sort());
    expect(webScreens).toEqual(SHOT_SCREENS);
  });

  it("marks each screen with its route", () => {
    for (const screen of SHOT_SCREENS) expect(webLandmarks[screen]).toBe(screen);
  });

  it("gives marks the shot run counts for their own screen and for no other", () => {
    for (const screen of SHOT_SCREENS) {
      const written = webLandmarks[screen] ?? "";
      expect(landmarkSelector(screen)).toBe(`[data-landmark=${JSON.stringify(written)}]`);
      const drawn = [mark(written)];
      for (const asked of SHOT_SCREENS) expect(holdsLandmark(drawn, asked)).toBe(asked === screen);
    }
  });
});

function mark(landmark: string, width = 300): PageMark {
  return { landmark, width, height: width === 0 ? 0 : 44 };
}

describe("holdsLandmark", () => {
  it("holds when a visible element is marked with the screen", () => {
    expect(holdsLandmark([mark("/timeline")], "/timeline")).toBe(true);
    expect(holdsLandmark([mark("/"), mark("/timeline")], "/timeline")).toBe(true);
    for (const screen of SHOT_SCREENS) {
      expect(holdsLandmark([mark(screen)], screen)).toBe(true);
    }
  });

  it("does not hold on another screen's landmark", () => {
    expect(holdsLandmark([mark("/updates")], "/checklists")).toBe(false);
    expect(holdsLandmark([mark("/")], "/welcome")).toBe(false);
  });

  it("does not hold on a mark that differs in any letter", () => {
    for (const drawn of ["timeline", "/Timeline", "/timeline ", "/timelines", ""]) {
      expect(holdsLandmark([mark(drawn)], "/timeline")).toBe(false);
    }
  });

  it("does not hold on an error screen, which carries no mark", () => {
    expect(holdsLandmark([], "/timeline")).toBe(false);
  });

  it("does not hold when the marked element has no box", () => {
    expect(holdsLandmark([mark("/timeline", 0)], "/timeline")).toBe(false);
    expect(holdsLandmark([{ landmark: "/timeline", width: 300, height: 0 }], "/timeline")).toBe(
      false,
    );
  });
});

describe("pageMarks", () => {
  it("takes a list of marks and refuses anything else", () => {
    const good = mark("/timeline");
    expect(pageMarks([good])).toEqual([good]);
    expect(pageMarks([])).toEqual([]);
    expect(pageMarks(true)).toBeNull();
    expect(pageMarks(null)).toBeNull();
    expect(pageMarks([{ ...good, width: "300" }])).toBeNull();
    expect(pageMarks([{ ...good, height: undefined }])).toBeNull();
    expect(pageMarks([{ ...good, landmark: undefined }])).toBeNull();
    expect(pageMarks([{ ...good, landmark: 1 }])).toBeNull();
    expect(pageMarks(["/timeline"])).toBeNull();
  });
});

describe("no screen is wider than its window (specs/ui-1/SPEC.md point 7)", () => {
  const wide: PageWidth = { window: 1280, inner: 1280, scroll: 1280 };
  const narrow: PageWidth = { window: 390, inner: 390, scroll: 390 };

  it("measures in the canvas frame and in a phone, 390 by 844", () => {
    expect(SHOT_WINDOWS).toEqual([
      { width: 1280, height: 832 },
      { width: 390, height: 844 },
    ]);
  });

  it("reads the document's scroll width and the window's inner width", () => {
    const script = widthScript();
    expect(script).toContain("document.documentElement.scrollWidth");
    expect(script).toContain("window.innerWidth");
  });

  it("takes the page's answer and refuses anything else", () => {
    expect(pageWidth({ inner: 390, scroll: 412 }, 390)).toEqual({
      window: 390,
      inner: 390,
      scroll: 412,
    });
    expect(pageWidth({ inner: 390 }, 390)).toBeNull();
    expect(pageWidth({ inner: "390", scroll: 390 }, 390)).toBeNull();
    expect(pageWidth([390, 390], 390)).toBeNull();
    expect(pageWidth(null, 390)).toBeNull();
  });

  it("fits when neither window scrolls sideways", () => {
    expect(fitsWindows([wide, narrow])).toBe(true);
  });

  it("does not fit when the page is wider than a window", () => {
    expect(fitsWindows([{ ...wide, scroll: 1281 }, narrow])).toBe(false);
    expect(fitsWindows([wide, { ...narrow, scroll: 391 }])).toBe(false);
  });

  it("does not fit when a window was not measured, or not at its width", () => {
    expect(fitsWindows([])).toBe(false);
    expect(fitsWindows([wide])).toBe(false);
    expect(fitsWindows([narrow])).toBe(false);
    expect(fitsWindows([wide, { ...narrow, inner: 1280, scroll: 1280 }])).toBe(false);
  });
});

describe("the shots report", () => {
  const fitting: PageWidth[] = [
    { window: 1280, inner: 1280, scroll: 1280 },
    { window: 390, inner: 390, scroll: 390 },
  ];
  const result = (drawn: boolean, widths: PageWidth[] = fitting): ShotResult => ({
    file: "home-a-light.png",
    screen: "/",
    sample: "a",
    theme: "light",
    landmark: '[data-landmark="/"]',
    drawn,
    widths,
  });

  it("writes the size, the windows, each shot, the landmark it looked for and its widths", () => {
    const tooWide = [fitting[0], { window: 390, inner: 390, scroll: 1280 }];
    expect(JSON.parse(shotsJson([result(true), result(true, tooWide)]))).toEqual({
      size: { width: 1280, height: 832 },
      windows: [
        { width: 1280, height: 832 },
        { width: 390, height: 844 },
      ],
      shots: [
        {
          file: "home-a-light.png",
          screen: "/",
          sample: "a",
          theme: "light",
          landmark: '[data-landmark="/"]',
          drawn: true,
          widths: [
            { window: 1280, inner: 1280, scroll: 1280 },
            { window: 390, inner: 390, scroll: 390 },
          ],
          fits: true,
        },
        {
          file: "home-a-light.png",
          screen: "/",
          sample: "a",
          theme: "light",
          landmark: '[data-landmark="/"]',
          drawn: true,
          widths: [
            { window: 1280, inner: 1280, scroll: 1280 },
            { window: 390, inner: 390, scroll: 1280 },
          ],
          fits: false,
        },
      ],
    });
    expect(shotsJson([])).toMatch(/\n$/);
  });

  it("exits 0 only when every shot drew and fits its windows", () => {
    expect(shotsExitCode([result(true), result(true)])).toBe(0);
    expect(shotsExitCode([result(true), result(false)])).toBe(1);
    expect(shotsExitCode([])).toBe(1);
  });

  it("exits 1 when a drawn shot scrolls sideways or was not measured", () => {
    const tooWide = [fitting[0], { window: 390, inner: 390, scroll: 391 }];
    expect(shotsExitCode([result(true), result(true, tooWide)])).toBe(1);
    expect(shotsExitCode([result(true, [])])).toBe(1);
  });
});

describe("the samples are served only in a shots run (SPEC 14.3)", () => {
  it("refuses the shots page in the app and nothing else", () => {
    expect(refusedInApp(SHOTS_PAGE)).toBe(true);
    expect(refusedInApp("index.html")).toBe(false);
    expect(refusedInApp("assets/shots.js")).toBe(false);
  });

  it("the app's handler answers 404 for the shots page", async () => {
    let read = false;
    const handler = createAppHandler({
      webDist: "/nowhere",
      engine: () => ({ state: "ready", port: 1, token: "t" }),
      fetch: () => Promise.reject(new Error("no fetch")),
      readFile: () => {
        read = true;
        return Promise.resolve(new Uint8Array(new ArrayBuffer(1)));
      },
      refuse: refusedInApp,
    });
    const answer = await handler(new Request(`duly://app/${SHOTS_PAGE}?screen=/&sample=a`));
    expect(answer.status).toBe(404);
    expect(read).toBe(false);
    expect((await handler(new Request("duly://app/app.js"))).status).toBe(200);
  });

  it("main.ts refuses it; the shots run starts no engine", () => {
    const main = readFileSync(join(__dirname, "main.ts"), "utf8");
    expect(main).toContain("refuse: refusedInApp");
    expect(main.match(/refuse: refusedInApp/g)).toHaveLength(1);
    expect(NO_ENGINE.state).not.toBe("ready");
  });

  it("the shots run's handler answers no engine request", async () => {
    const handler = createAppHandler({
      webDist: webDist(ROOT),
      engine: () => NO_ENGINE,
      fetch: () => Promise.reject(new Error("no fetch")),
      readFile: readInside,
    });
    expect((await handler(new Request("duly://app/api/v1/compute"))).status).toBe(503);
  });
});
