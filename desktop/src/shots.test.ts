import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { webDist } from "./engine";
import { createAppHandler, readInside } from "./protocol";
import {
  NO_ENGINE,
  SHOTS_PAGE,
  SHOT_CANVAS,
  SHOT_SCREENS,
  SHOT_SIZE,
  SHOT_THEMES,
  designLandmarks,
  drawScript,
  holdsLandmark,
  landmarkName,
  pageTexts,
  planShots,
  refusedInApp,
  sampleNames,
  screenLandmark,
  screenName,
  shotFile,
  shotUrl,
  shotsExitCode,
  shotsFolder,
  shotsJson,
  spacing,
  webSamples,
  type PageText,
  type ScreenLandmark,
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

  it("gives back the text and type of each text under the root, not a verdict of its own", () => {
    const script = drawScript("light");
    expect(script).toContain('getElementById("root")');
    expect(script).toContain("textContent");
    expect(script).toContain("getComputedStyle");
    expect(script).not.toContain("childElementCount");
  });
});

const LANDMARKS: unknown = JSON.parse(readFileSync(designLandmarks(ROOT), "utf8"));

describe("each screen's landmark (resolutions point 16)", () => {
  it("names only built screens, and only canvas screens landmarks.json holds", () => {
    const screens = (LANDMARKS as { screens: Record<string, unknown> }).screens;
    for (const [screen, canvas] of Object.entries(SHOT_CANVAS)) {
      expect(SHOT_SCREENS).toContain(screen);
      expect(Object.keys(screens)).toContain(canvas);
    }
  });

  it("is the heading of the screen's canvas, read from landmarks.json", () => {
    expect(screenLandmark(LANDMARKS, "/")).toEqual({
      canvas: "Main",
      index: 20,
      text: "Everything is in order.",
      fontSize: 40,
      fontWeight: "600",
      letterSpacing: expect.closeTo(-0.8, 5) as number,
    });
    expect(screenLandmark(LANDMARKS, "/timeline")).toMatchObject({
      canvas: "Timeline",
      index: 15,
      text: "Timeline",
      fontSize: 32,
    });
    for (const screen of Object.keys(SHOT_CANVAS)) {
      expect(screenLandmark(LANDMARKS, screen)).not.toBeNull();
    }
  });

  it("is missing for a screen with no canvas screen, which then never counts as drawn", () => {
    for (const screen of ["/case", "/settings", "/feedback"]) {
      expect(screenLandmark(LANDMARKS, screen)).toBeNull();
      expect(holdsLandmark([text("40px", "600", "-0.8px", "Your case")], null)).toBe(false);
    }
  });

  it("is missing when the file does not hold the screen or its type", () => {
    expect(screenLandmark(null, "/")).toBeNull();
    expect(screenLandmark({ screens: {} }, "/")).toBeNull();
    expect(screenLandmark({ screens: { Main: { landmarks: "no" } } }, "/")).toBeNull();
    expect(screenLandmark({ screens: { Main: { landmarks: [{ tag: "div" }] } } }, "/")).toBeNull();
    const odd = { label: "Heading", type: { "font-size": "2rem", "font-weight": "600" } };
    expect(screenLandmark({ screens: { Main: { landmarks: [odd] } } }, "/")).toBeNull();
  });

  it("is missing when the heading has no text to compare (resolutions point 17)", () => {
    const type = { "font-size": "30px", "font-weight": "600" };
    for (const label of [undefined, "", "  ", 7]) {
      const file = { screens: { Main: { landmarks: [{ label, type }] } } };
      expect(screenLandmark(file, "/")).toBeNull();
    }
  });

  it("takes each built screen's heading text from landmarks.json", () => {
    const labels = Object.fromEntries(
      Object.keys(SHOT_CANVAS).map((screen) => [screen, screenLandmark(LANDMARKS, screen)?.text]),
    );
    expect(labels).toEqual({
      "/welcome": "What kind of work do you do?",
      "/": "Everything is in order.",
      "/timeline": "Timeline",
      "/checklists": "STEM OPT extension",
      "/updates": "One thing worth knowing.",
    });
  });

  it("takes the first of the largest type", () => {
    const mark = (size: string, spacingValue?: string): unknown => ({
      label: ` Size\n ${size} `,
      type: { "font-size": size, "font-weight": "bold", "letter-spacing": spacingValue },
    });
    const file = {
      screens: { Main: { landmarks: [mark("14px"), mark("30px", "1px"), mark("30px")] } },
    };
    expect(screenLandmark(file, "/")).toEqual({
      canvas: "Main",
      index: 1,
      text: "Size 30px",
      fontSize: 30,
      fontWeight: "700",
      letterSpacing: 1,
    });
    expect(landmarkName(screenLandmark(file, "/"))).toBe("Main landmark 1");
    expect(landmarkName(null)).toBeNull();
  });
});

function text(
  fontSize: string,
  fontWeight: string,
  letterSpacing: string,
  drawn = "Timeline",
  width = 300,
): PageText {
  return { text: drawn, fontSize, fontWeight, letterSpacing, width, height: width === 0 ? 0 : 44 };
}

describe("holdsLandmark", () => {
  const heading: ScreenLandmark = {
    canvas: "Timeline",
    index: 15,
    text: "Timeline",
    fontSize: 32,
    fontWeight: "600",
    letterSpacing: -0.64,
  };
  const sidebar = [text("17px", "700", "-0.17px", "Duly."), text("14px", "400", "normal")];

  it("holds when a visible text reads as the heading, in the landmark's type", () => {
    expect(holdsLandmark([...sidebar, text("32px", "600", "-0.64px")], heading)).toBe(true);
    expect(holdsLandmark([text("32.02px", "600", "-0.62px")], heading)).toBe(true);
    expect(holdsLandmark([text("32px", "600", "-0.64px", "\n  Timeline ")], heading)).toBe(true);
  });

  it("does not hold on another screen's heading in the same type (resolutions point 17)", () => {
    const checklist: ScreenLandmark = {
      canvas: "Checklist",
      index: 22,
      text: "STEM OPT extension",
      fontSize: 30,
      fontWeight: "600",
      letterSpacing: -0.6,
    };
    const updates = text("30px", "600", "-0.6px", "One thing worth knowing.");
    expect(holdsLandmark([...sidebar, updates], checklist)).toBe(false);
    const own = text("30px", "600", "-0.6px", "STEM OPT extension");
    expect(holdsLandmark([...sidebar, own], checklist)).toBe(true);
  });

  it("does not hold when the heading text differs in any letter", () => {
    for (const drawn of ["timeline", "Timelines", "Time line", "", "Something went wrong."]) {
      expect(holdsLandmark([text("32px", "600", "-0.64px", drawn)], heading)).toBe(false);
    }
  });

  it("does not hold on an error screen: the shell and a message, but no heading", () => {
    expect(holdsLandmark([...sidebar, text("16px", "400", "normal")], heading)).toBe(false);
    expect(holdsLandmark([], heading)).toBe(false);
  });

  it("does not hold when size, weight or spacing differ, or the text has no box", () => {
    expect(holdsLandmark([text("30px", "600", "-0.6px")], heading)).toBe(false);
    expect(holdsLandmark([text("32px", "700", "-0.64px")], heading)).toBe(false);
    expect(holdsLandmark([text("32px", "600", "normal")], heading)).toBe(false);
    expect(holdsLandmark([text("32px", "600", "-0.64px", "Timeline", 0)], heading)).toBe(false);
    expect(holdsLandmark([text("2rem", "600", "-0.64px")], heading)).toBe(false);
    expect(holdsLandmark([text("32px", "600", "wide")], heading)).toBe(false);
  });

  it("reads letter spacing in em, px or normal", () => {
    expect(spacing("-0.02em", 32)).toBeCloseTo(-0.64, 5);
    expect(spacing(".5em", 10)).toBe(5);
    expect(spacing("1.5px", 32)).toBe(1.5);
    expect(spacing("normal", 32)).toBe(0);
    expect(spacing("wide", 32)).toBeNull();
  });
});

describe("pageTexts", () => {
  it("takes a list of texts and refuses anything else", () => {
    const good = text("32px", "600", "normal");
    expect(pageTexts([good])).toEqual([good]);
    expect(pageTexts([])).toEqual([]);
    expect(pageTexts(true)).toBeNull();
    expect(pageTexts(null)).toBeNull();
    expect(pageTexts([{ ...good, width: "300" }])).toBeNull();
    expect(pageTexts([{ ...good, fontSize: 32 }])).toBeNull();
    expect(pageTexts([{ ...good, text: undefined }])).toBeNull();
    expect(pageTexts([{ ...good, text: 1 }])).toBeNull();
    expect(pageTexts(["32px"])).toBeNull();
  });
});

describe("the shots report", () => {
  const result = (drawn: boolean): ShotResult => ({
    file: "home-a-light.png",
    screen: "/",
    sample: "a",
    theme: "light",
    landmark: "Main landmark 20",
    drawn,
  });

  it("writes the size, each shot and the landmark it looked for", () => {
    expect(JSON.parse(shotsJson([result(true)]))).toEqual({
      size: { width: 1280, height: 832 },
      shots: [
        {
          file: "home-a-light.png",
          screen: "/",
          sample: "a",
          theme: "light",
          landmark: "Main landmark 20",
          drawn: true,
        },
      ],
    });
    expect(shotsJson([])).toMatch(/\n$/);
  });

  it("exits 0 only when every shot drew", () => {
    expect(shotsExitCode([result(true), result(true)])).toBe(0);
    expect(shotsExitCode([result(true), result(false)])).toBe(1);
    expect(shotsExitCode([])).toBe(1);
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
