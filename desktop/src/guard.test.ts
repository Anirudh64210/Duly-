import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  PRIMARY_HOSTS,
  WINDOW,
  decideFrameNavigation,
  decideNavigation,
  decideNewWindow,
  decidePermission,
  mayOpenOutside,
  webPreferences,
} from "./guard";

function hostsInVerify(): string[] {
  const text = readFileSync(join(__dirname, "..", "..", "tools", "sources", "verify.py"), "utf8");
  const block = /PRIMARY_HOSTS = \(([\s\S]*?)\)/.exec(text);
  expect(block).not.toBeNull();
  return [...(block?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? "");
}

describe("the list of primary sources", () => {
  it("is the same list as tools/sources/verify.py", () => {
    const theirs = hostsInVerify();
    expect(theirs.length).toBeGreaterThan(0);
    expect([...PRIMARY_HOSTS].sort()).toEqual([...theirs].sort());
  });
});

describe("links to outside pages", () => {
  it("opens a primary source over https", () => {
    expect(mayOpenOutside("https://www.ecfr.gov/current/title-8/section-214.2")).toBe(true);
    expect(mayOpenOutside("https://uscode.house.gov/view.xhtml?req=8")).toBe(true);
  });

  it("refuses every other link", () => {
    for (const address of [
      "http://www.ecfr.gov/current/title-8",
      "https://example.com/",
      "https://ecfr.gov/",
      "https://www.ecfr.gov.evil.com/",
      "https://evil.com/www.ecfr.gov",
      "https://www.ecfr.gov@evil.com/",
      "https://user:pass@www.ecfr.gov/",
      "https://www.ecfr.gov:8443/",
      "file:///etc/passwd",
      "javascript:alert(1)",
      "duly://app/index.html",
      "not an address",
      "",
    ]) {
      expect(mayOpenOutside(address), address).toBe(false);
    }
  });
});

describe("navigation", () => {
  it("stays inside the app", () => {
    expect(decideNavigation("duly://app/index.html")).toBe("stay");
  });

  it("sends a primary source to the person's browser", () => {
    expect(decideNavigation("https://www.uscis.gov/")).toBe("open_outside");
  });

  it("refuses everything else", () => {
    for (const address of [
      "https://example.com/",
      "http://127.0.0.1:8000/v1/status",
      "file:///etc/passwd",
      "duly://evil/index.html",
      "about:blank",
    ]) {
      expect(decideNavigation(address), address).toBe("refuse");
    }
  });
});

describe("frames inside the page", () => {
  it("load only pages of the app and never open the browser", () => {
    expect(decideFrameNavigation("duly://app/index.html")).toBe("stay");
    expect(decideFrameNavigation("https://www.ecfr.gov/")).toBe("refuse");
    expect(decideFrameNavigation("https://example.com/")).toBe("refuse");
  });
});

describe("new windows", () => {
  it("never opens one; a primary source goes to the browser", () => {
    expect(decideNewWindow("https://www.federalregister.gov/d/1")).toBe("open_outside");
    expect(decideNewWindow("duly://app/index.html")).toBe("refuse");
    expect(decideNewWindow("https://example.com/")).toBe("refuse");
  });
});

describe("permissions", () => {
  it("refuses every one", () => {
    for (const permission of ["media", "geolocation", "notifications", "clipboard-read", "hid"]) {
      expect(decidePermission(permission)).toBe(false);
    }
  });
});

describe("the window", () => {
  it("has the size and title of the SPEC", () => {
    expect(WINDOW).toEqual({
      title: "Duly",
      width: 1200,
      height: 860,
      minWidth: 900,
      minHeight: 600,
    });
  });

  it("runs the page isolated and sandboxed", () => {
    const prefs = webPreferences("/app/dist/preload.js", "1.2.3");
    expect(prefs.contextIsolation).toBe(true);
    expect(prefs.sandbox).toBe(true);
    expect(prefs.nodeIntegration).toBe(false);
    expect(prefs.webSecurity).toBe(true);
    expect(prefs.webviewTag).toBe(false);
    expect(prefs.preload).toBe("/app/dist/preload.js");
    expect(prefs.additionalArguments).toEqual(["--duly-version=1.2.3"]);
  });
});
