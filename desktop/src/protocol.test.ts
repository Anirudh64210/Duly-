import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { EventEmitter } from "node:events";
import type { ClientRequest, IncomingMessage, RequestOptions } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { COPIED, COPY_PATH, RETRY_PATH, type EngineView } from "./pages";
import {
  SECURITY_HEADERS,
  TOKEN_HEADER,
  contentType,
  createAppHandler,
  engineRequestInit,
  engineRequestOptions,
  socketFetch,
  type SendRequest,
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

describe("the engine's channel (point 10)", () => {
  it("carries the socket path and no host or port", () => {
    const options = engineRequestOptions("/run/engine.sock", "/v1/compute?x=1", {
      method: "POST",
      headers: { [TOKEN_HEADER]: "tok" },
    });
    expect(options).toEqual({
      socketPath: "/run/engine.sock",
      path: "/v1/compute?x=1",
      method: "POST",
      headers: { [TOKEN_HEADER]: "tok" },
    });
    expect(options).not.toHaveProperty("host");
    expect(options).not.toHaveProperty("hostname");
    expect(options).not.toHaveProperty("port");
    expect(engineRequestOptions("/s", "health", {}).path).toBe("/health");
    expect(engineRequestOptions("/s", "/health", {}).method).toBe("GET");
  });

  it("sends the request over the socket and reads the answer, never following a redirect", async () => {
    const sent: { options: RequestOptions; body: unknown }[] = [];
    const fake = (status: number, headers: Record<string, string>, body: string) =>
      ((options: RequestOptions, callback: (answer: IncomingMessage) => void) => {
        const request = new EventEmitter() as EventEmitter & { end(body?: unknown): void };
        request.end = (written) => {
          sent.push({ options, body: written });
          const answer = Object.assign(new PassThrough(), { statusCode: status, headers });
          callback(answer as unknown as IncomingMessage);
          answer.end(body);
        };
        return request as unknown as ClientRequest;
      }) satisfies SendRequest;

    const init = engineRequestInit(
      "POST",
      "application/json",
      "tok",
      new TextEncoder().encode('{"a":1}').buffer,
    );
    const answer = await socketFetch(
      fake(201, { "content-type": "application/json", "set-cookie": "a=b" }, '{"ok":true}'),
    )("/run/engine.sock", "/v1/compute", init);
    expect(answer.status).toBe(201);
    expect(answer.headers.get("Content-Type")).toBe("application/json");
    expect(answer.headers.get("Set-Cookie")).toBeNull();
    expect(await answer.text()).toBe('{"ok":true}');
    expect(sent[0]?.options.socketPath).toBe("/run/engine.sock");
    expect(String(sent[0]?.body)).toBe('{"a":1}');

    const get = engineRequestInit("GET", null, "tok", null);
    const moved = await socketFetch(fake(302, { location: "http://example.com/" }, ""))(
      "/s",
      "/moved",
      get,
    );
    expect(moved.status).toBe(302);
    expect(sent).toHaveLength(2);
    expect(sent[1]?.body).toBeUndefined();
    const empty = await socketFetch(fake(204, {}, ""))("/s", "/empty", get);
    expect(empty.status).toBe(204);
  });

  it("fails when the socket cannot be reached", async () => {
    const refused = (() => {
      const request = new EventEmitter() as EventEmitter & { end(): void };
      request.end = () => request.emit("error", new Error("connect ENOENT"));
      return request as unknown as ClientRequest;
    }) satisfies SendRequest;
    await expect(
      socketFetch(refused)("/s", "/health", engineRequestInit("GET", null, "t", null)),
    ).rejects.toThrow("ENOENT");
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

const READY: EngineView = { state: "ready", socket: "/run/engine.sock", token: "tok" };

function handlerWith(view: EngineView, fetcher = vi.fn(), more = {}) {
  return createAppHandler({
    webDist: dist,
    engine: () => view,
    fetch: fetcher,
    readFile: readInside,
    ...more,
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
    const [socket, target, init] = fetcher.mock.calls[0] as unknown as [
      string,
      string,
      RequestInit,
    ];
    expect(socket).toBe("/run/engine.sock");
    expect(target).toBe("/v1/compute?x=1");
    expect(init.redirect).toBe("manual");
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
    expect(html).toContain("Duly could not start.");
    expect(html).not.toContain("Traceback");
    expect(html).not.toContain("<h1>screen</h1>");
    expectSecurityHeaders(response);
  });

  it("starts the engine again on Try again (point 23)", async () => {
    let view: EngineView = { state: "failed", lines: ["boom"] };
    const retry = vi.fn(() => {
      view = { state: "starting" };
    });
    const handler = createAppHandler({
      webDist: dist,
      engine: () => view,
      fetch: vi.fn(),
      readFile: readInside,
      retry,
    });
    const response = await handler(new Request(`duly://app/${RETRY_PATH}`, { method: "POST" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(await response.text()).toContain("Starting Duly");
    expectSecurityHeaders(response);
  });

  it("puts the engine's last lines on the clipboard on Copy details (point 23)", async () => {
    const copy = vi.fn();
    const handler = handlerWith({ state: "ended", lines: ["one", "two"] }, vi.fn(), { copy });
    const response = await handler(new Request(`duly://app/${COPY_PATH}`, { method: "POST" }));
    expect(copy).toHaveBeenCalledWith("one\ntwo");
    expect(await response.text()).toContain(COPIED);
  });

  it("does neither by GET, nor while the engine is starting or ready", async () => {
    const retry = vi.fn();
    const copy = vi.fn();
    const failed = handlerWith({ state: "failed", lines: [] }, vi.fn(), { retry, copy });
    expect((await failed(new Request(`duly://app/${RETRY_PATH}`))).status).toBe(404);
    for (const view of [{ state: "starting" }, READY] as EngineView[]) {
      const handler = handlerWith(view, vi.fn(), { retry, copy });
      for (const path of [RETRY_PATH, COPY_PATH]) {
        const response = await handler(new Request(`duly://app/${path}`, { method: "POST" }));
        expect(response.status).toBe(200);
      }
    }
    expect(retry).not.toHaveBeenCalled();
    expect(copy).not.toHaveBeenCalled();
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
