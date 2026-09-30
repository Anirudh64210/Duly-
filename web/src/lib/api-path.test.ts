import { describe, expect, it } from "vitest";

import config from "../../vite.config";
import { apiPath } from "./api-path";

describe("apiPath", () => {
  it("is relative to the page", () => {
    expect(apiPath("/v1/status")).toBe("api/v1/status");
    expect(apiPath("/v1/compute/f1")).toBe("api/v1/compute/f1");
  });

  it("reaches the engine through the app scheme", () => {
    const url = new URL(apiPath("/v1/status"), "duly://app/index.html");
    expect(url.href).toBe("duly://app/api/v1/status");
  });

  it("reaches the dev proxy from the local stack", () => {
    const url = new URL(apiPath("/v1/compute/f1"), "http://localhost:5173/");
    expect(url.href).toBe("http://localhost:5173/api/v1/compute/f1");
  });
});

describe("the build", () => {
  it("uses a relative base so assets load from the app scheme", () => {
    expect(config.base).toBe("./");
  });

  it("keeps the dev proxy for the local stack", () => {
    const proxy = config.server?.proxy?.["/api"];
    expect(proxy).toBeTypeOf("object");
    if (typeof proxy !== "object") return;
    expect(proxy.target).toBe("http://localhost:8000");
    expect(proxy.rewrite?.("/api/v1/status")).toBe("/v1/status");
  });
});
