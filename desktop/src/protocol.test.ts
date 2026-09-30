import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { EngineView } from "./pages";
import {
  SECURITY_HEADERS,
  TOKEN_HEADER,
  contentType,
  createAppHandler,
  engineRequestInit,
  engineUrl,
  inside,
  readInside,
  routeRequest,
  safeSegments,
} from "./protocol";

const CSP =
  "default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

const LEAVING = [
  "duly://app/../secret.txt",
  "duly://app/assets/../../secret.txt",
  "duly://app/%2e%2e/secret.txt",
  "duly://app/%2E%2E%2Fsecret.txt",
  "duly://app/assets%2F..%2F..%2Fsecret.txt",
  "duly://app/..%5Csecret.txt",
  "duly://app/%252e%252e%252fsecret.txt",
  "duly://app//etc/passwd",
  "duly://app/%2Fetc%2Fpasswd",
  "duly://app/%2F%2Fetc%2Fpasswd",
  "duly://app/C:%5CWindows%5Cwin.ini",
  "duly://app/index.html%00.png",
  "duly://app/%E0%A4%A",
];

describe("routing a request", () => {
  it("sends /api/ to the engine with its query", () => {
    expect(routeRequest("duly://app/api/v1/status")).toEqual({
      kind: "engine",
      path: "/v1/status",
    });
    expect(routeRequest("duly://app/api/v1/compute?x=1")).toEqual({
      kind: "engine",
      path: "/v1/compute?x=1",
    });
  });

  it("serves every other path from web/dist", () => {
    expect(routeRequest("duly://app/index.html")).toEqual({ kind: "file", relative: "index.html" });
    expect(routeRequest("duly://app/")).toEqual({ kind: "file", relative: "index.html" });
    expect(routeRequest("duly://app/assets/index-abc.js")).toEqual({
      kind: "file",
      relative: "assets/index-abc.js",
    });
    expect(routeRequest("duly://app/api")).toEqual({ kind: "file", relative: "api" });
  });

  it("refuses other hosts and schemes", () => {
    for (const address of [
      "duly://evil/index.html",
      "duly://app:81/index.html",
      "duly://user@app/index.html",
      "https://app/index.html",
      "file:///etc/passwd",
      "not an address",
    ]) {
      expect(routeRequest(address), address).toEqual({ kind: "refused" });
    }
  });

  it("refuses an engine path that climbs", () => {
    expect(routeRequest("duly://app/api/%2e%2e%2Fsecret")).toEqual({ kind: "refused" });
    expect(routeRequest("duly://app/api/v1%2F..%2F..%2Fx")).toEqual({ kind: "refused" });
  });

  it("never names a file outside web/dist", () => {
    for (const address of LEAVING) {
      const route = routeRequest(address);
      if (route.kind === "file") {
        expect(inside("/dist", join("/dist", route.relative)), address).toBe(true);
        expect(route.relative.includes(".."), address).toBe(false);
      }
    }
  });
});

describe("safe segments", () => {
  it("allows plain relative paths", () => {
    expect(safeSegments("assets/app.js")).toBe(true);
    expect(safeSegments("v1/")).toBe(true);
    expect(safeSegments("")).toBe(true);
  });

  it("refuses climbing, absolute and odd paths", () => {
    for (const path of [
      "..",
      "a/../b",
      "%2e%2e",
      "/etc",
      "%2Fetc",
      "a//b",
      "./a",
      "a\\b",
      "C:x",
      "a\0b",
      "%zz",
    ]) {
      expect(safeSegments(path), path).toBe(false);
    }
  });
});

describe("inside a folder", () => {
  it("knows inside from outside", () => {
    expect(inside("/dist", "/dist/a.js")).toBe(true);
    expect(inside("/dist", "/dist")).toBe(false);
    expect(inside("/dist", "/dister/a.js")).toBe(false);
    expect(inside("/dist", "/etc/passwd")).toBe(false);
    expect(inside("/dist", "/dist/../etc")).toBe(false);
  });
});

describe("the engine's address", () => {
  it("is always this machine", () => {
    expect(engineUrl(8123, "/v1/status")).toBe("http://127.0.0.1:8123/v1/status");
    expect(engineUrl(8123, "v1/status?a=b")).toBe("http://127.0.0.1:8123/v1/status?a=b");
    expect(engineUrl(8123, "//evil.com/x")).toBe("http://127.0.0.1:8123//evil.com/x");
    expect(engineUrl(8123, "/@evil.com")).toBe("http://127.0.0.1:8123/@evil.com");
  });

  it("refuses a port that is not one", () => {
    expect(() => engineUrl(0, "/")).toThrow();
    expect(() => engineUrl(70000, "/")).toThrow();
    expect(() => engineUrl(1.5, "/")).toThrow();
  });
});

describe("the request passed on", () => {
  it("carries the method, the body, the content type and the token, nothing else", () => {
    const body = new TextEncoder().encode("{}").buffer;
    const init = engineRequestInit("POST", "application/json", "tok", body);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(body);
    expect(init.headers).toEqual({ [TOKEN_HEADER]: "tok", "Content-Type": "application/json" });
    expect(init.redirect).toBe("manual");
  });

  it("sends no body with GET", () => {
    const init = engineRequestInit("GET", null, "tok", new ArrayBuffer(2));
    expect(init.body).toBeUndefined();
    expect(init.headers).toEqual({ [TOKEN_HEADER]: "tok" });
  });
});

describe("content types", () => {
  it("names the usual ones", () => {
    expect(contentType("index.html")).toBe("text/html; charset=utf-8");
    expect(contentType("assets/a.JS")).toBe("text/javascript; charset=utf-8");
    expect(contentType("a.woff2")).toBe("font/woff2");
    expect(contentType("a.unknown")).toBe("application/octet-stream");
  });
});

let root = "";
let dist = "";

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "duly-desktop-"));
  dist = join(root, "web", "dist");
  await mkdir(join(dist, "assets"), { recursive: true });
  await writeFile(join(dist, "index.html"), "<h1>screen</h1>");
  await writeFile(join(dist, "assets", "app.js"), "console.log(1)");
  await writeFile(join(root, "web", "secret.txt"), "secret");
  await writeFile(join(root, "secret.txt"), "secret");
  await symlink(join(root, "secret.txt"), join(dist, "linked.txt"));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("reading a file", () => {
  it("reads a file under the root", async () => {
    const bytes = await readInside(dist, "assets/app.js");
    expect(new TextDecoder().decode(bytes ?? new Uint8Array())).toBe("console.log(1)");
  });

  it("gives nothing for a missing file, a folder, a climb or a link out", async () => {
    expect(await readInside(dist, "missing.js")).toBeNull();
    expect(await readInside(dist, "assets")).toBeNull();
    expect(await readInside(dist, "../secret.txt")).toBeNull();
    expect(await readInside(dist, join(root, "secret.txt"))).toBeNull();
    expect(await readInside(dist, "linked.txt")).toBeNull();
  });
});

const READY: EngineView = { state: "ready", port: 8123, token: "tok" };

function handlerWith(view: EngineView, fetcher = vi.fn()) {
  return createAppHandler({
    webDist: dist,
    engine: () => view,
    fetch: fetcher,
    readFile: readInside,
  });
}

function expectSecurityHeaders(response: Response): void {
  expect(response.headers.get("Content-Security-Policy")).toBe(CSP);
  expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
}

describe("the app handler", () => {
  it("has the headers of the SPEC", () => {
    expect(SECURITY_HEADERS["Content-Security-Policy"]).toBe(CSP);
  });

  it("serves the built screen with the headers", async () => {
    const response = await handlerWith(READY)(new Request("duly://app/index.html"));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<h1>screen</h1>");
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expectSecurityHeaders(response);
  });

  it("refuses with 404 every path that would leave web/dist", async () => {
    const handler = handlerWith(READY);
    for (const address of [...LEAVING, "duly://app/linked.txt", "duly://evil/index.html"]) {
      const response = await handler(new Request(address));
      expect(response.status, address).toBe(404);
      expect(await response.text(), address).not.toContain("secret");
      expectSecurityHeaders(response);
    }
  });

  it("passes /api/ on to the engine with the token", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response('{"ok":true}', {
          status: 201,
          headers: { "Content-Type": "application/json", "Set-Cookie": "a=b" },
        }),
    );
    const handler = handlerWith(READY, fetcher);
    const response = await handler(
      new Request("duly://app/api/v1/compute?x=1", {
        method: "POST",
        body: '{"a":1}',
        headers: { "Content-Type": "application/json", Cookie: "c=d", [TOKEN_HEADER]: "forged" },
      }),
    );
    expect(response.status).toBe(201);
    expect(await response.text()).toBe('{"ok":true}');
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Set-Cookie")).toBeNull();
    expectSecurityHeaders(response);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [target, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(target).toBe("http://127.0.0.1:8123/v1/compute?x=1");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ [TOKEN_HEADER]: "tok", "Content-Type": "application/json" });
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe('{"a":1}');
  });

  it("says so when the engine cannot be reached", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("refused");
    });
    const response = await handlerWith(READY, fetcher)(new Request("duly://app/api/v1/status"));
    expect(response.status).toBe(502);
    expectSecurityHeaders(response);
  });

  it("never reaches a dead or missing engine", async () => {
    for (const view of [
      { state: "starting" },
      { state: "failed", lines: ["boom"] },
      { state: "ended", lines: [] },
    ] as EngineView[]) {
      const fetcher = vi.fn();
      const response = await handlerWith(view, fetcher)(new Request("duly://app/api/v1/status"));
      expect(response.status).toBe(503);
      expect(fetcher).not.toHaveBeenCalled();
      expectSecurityHeaders(response);
    }
  });

  it("shows the engine's page in place of the screen when it is not ready", async () => {
    const response = await handlerWith({ state: "failed", lines: ["Traceback <x>"] })(
      new Request("duly://app/index.html"),
    );
    const html = await response.text();
    expect(html).toContain("Duly could not start its engine on this Mac.");
    expect(html).toContain("Traceback &lt;x&gt;");
    expect(html).not.toContain("<h1>screen</h1>");
    expectSecurityHeaders(response);
  });

  it("returns no body for HEAD", async () => {
    const fetcher = vi.fn(async () => new Response("x", { status: 200 }));
    const response = await handlerWith(
      READY,
      fetcher,
    )(new Request("duly://app/api/health", { method: "HEAD" }));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });
});
