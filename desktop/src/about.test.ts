import { describe, expect, it } from "vitest";

import { APP_NAME, APP_ORIGIN, insideTheApp } from "./about";

describe("the app's own addresses", () => {
  it("has a name", () => {
    expect(APP_NAME).toBe("Duly");
  });

  it("knows its own pages", () => {
    expect(insideTheApp(`${APP_ORIGIN}/index.html`)).toBe(true);
    expect(insideTheApp(`${APP_ORIGIN}/api/v1/status`)).toBe(true);
  });

  it("knows everything else is outside", () => {
    for (const address of [
      "https://example.com/",
      "http://127.0.0.1:8000/v1/status",
      "file:///etc/passwd",
      "duly://evil/index.html",
      "duly://app.evil.com/",
      "javascript:alert(1)",
      "not an address",
      "",
    ]) {
      expect(insideTheApp(address)).toBe(false);
    }
  });
});
