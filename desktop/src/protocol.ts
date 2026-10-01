import { promises as fs } from "node:fs";
import {
  request as httpRequest,
  type ClientRequest,
  type IncomingMessage,
  type RequestOptions,
} from "node:http";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";

import { insideTheApp } from "./about";
import { COPY_PATH, RETRY_PATH, details, statusPage, type EngineView } from "./pages";

/** Sent with every answer the app scheme gives, from a file, from the engine or refused. */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Content-Security-Policy":
    "default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; " +
    "img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; " +
    "form-action 'self'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

/** The header that carries this launch's token to the engine. */
export const TOKEN_HEADER = "X-Duly-Local";

export const API_PREFIX = "/api/";

export type Route =
  { kind: "engine"; path: string } | { kind: "file"; relative: string } | { kind: "refused" };

const REFUSED: Route = { kind: "refused" };

/**
 * Where does a request to the app scheme go? `/api/<path>` goes to the engine; every
 * other path is a file under web/dist. A path that could leave web/dist, in plain or
 * encoded form, is refused.
 */
export function routeRequest(address: string): Route {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return REFUSED;
  }
  if (!insideTheApp(address) || url.username !== "" || url.password !== "") return REFUSED;
  const raw = url.pathname;
  if (raw.startsWith(API_PREFIX)) {
    const rest = raw.slice(API_PREFIX.length);
    if (!safeSegments(rest)) return REFUSED;
    return { kind: "engine", path: `/${rest}${url.search}` };
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return REFUSED;
  }
  if (decoded === "/" || decoded === "") return { kind: "file", relative: "index.html" };
  if (!decoded.startsWith("/")) return REFUSED;
  const inner = decoded.slice(1);
  if (!safeSegments(inner)) return REFUSED;
  return { kind: "file", relative: inner };
}

/**
 * A path under a folder is safe when it is relative, has no empty, `.` or `..` segment,
 * no backslash, no NUL and no drive letter. It is checked after decoding.
 */
export function safeSegments(path: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return false;
  }
  for (const candidate of [path, decoded]) {
    if (candidate.includes("\\") || candidate.includes("\0")) return false;
    if (candidate.startsWith("/") || /^[a-zA-Z]:/.test(candidate)) return false;
    if (isAbsolute(candidate)) return false;
    const segments = candidate.split("/");
    for (const [index, segment] of segments.entries()) {
      if (segment === "." || segment === "..") return false;
      if (segment === "" && index < segments.length - 1) return false;
    }
  }
  return true;
}

/** Is this path inside the folder, once both are resolved? */
export function inside(root: string, path: string): boolean {
  const between = relative(resolve(root), resolve(path));
  return (
    between !== "" && !between.startsWith(`..${sep}`) && between !== ".." && !isAbsolute(between)
  );
}

/** A request to the engine, over its socket, with no host and no port (SPEC-W1 point 10). */
export function engineRequestOptions(
  socket: string,
  path: string,
  init: RequestInit,
): RequestOptions {
  const options: RequestOptions = {
    socketPath: socket,
    path: path.startsWith("/") ? path : `/${path}`,
    method: init.method ?? "GET",
    headers: { ...(init.headers as Record<string, string> | undefined) },
  };
  if (init.signal) options.signal = init.signal;
  return options;
}

/** Sends a request to the engine and answers with what it said. */
export type SocketFetch = (socket: string, path: string, init: RequestInit) => Promise<Response>;

const NO_BODY = new Set([101, 204, 205, 304]);

export type SendRequest = (
  options: RequestOptions,
  callback: (answer: IncomingMessage) => void,
) => ClientRequest;

/** The engine's answer over the socket. Node's http never follows a redirect. */
export function socketFetch(send: SendRequest = httpRequest): SocketFetch {
  return (socket, path, init) =>
    new Promise((done, fail) => {
      const sent = send(engineRequestOptions(socket, path, init), (answer) => {
        const chunks: Buffer[] = [];
        answer.on("data", (chunk: Buffer) => chunks.push(chunk));
        answer.on("error", fail);
        answer.on("end", () => {
          const status = answer.statusCode ?? 502;
          const type = answer.headers["content-type"];
          done(
            new Response(NO_BODY.has(status) ? null : Buffer.concat(chunks), {
              status,
              headers: type === undefined ? {} : { "Content-Type": type },
            }),
          );
        });
      });
      sent.on("error", fail);
      const body = init.body;
      sent.end(body instanceof ArrayBuffer ? Buffer.from(body) : undefined);
    });
}

export const fetchOverSocket: SocketFetch = socketFetch();

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

export function contentType(path: string): string {
  return CONTENT_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
}

/** Headers for an answer: the security headers, and the content type when there is one. */
export function responseHeaders(type: string | null): Record<string, string> {
  return type === null ? { ...SECURITY_HEADERS } : { ...SECURITY_HEADERS, "Content-Type": type };
}

/** The request passed on to the engine: method, body, content type and token, nothing else. */
export function engineRequestInit(
  method: string,
  type: string | null,
  token: string,
  body: ArrayBuffer | null,
): RequestInit {
  const headers: Record<string, string> = { [TOKEN_HEADER]: token };
  if (type !== null) headers["Content-Type"] = type;
  const init: RequestInit = { method, headers, redirect: "manual" };
  if (body !== null && method !== "GET" && method !== "HEAD") init.body = body;
  return init;
}

/** Reads a file under the root, or null when it is missing or its real path leaves the root. */
export async function readInside(
  root: string,
  relativePath: string,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const wanted = resolve(root, relativePath);
  if (!inside(root, wanted)) return null;
  try {
    const [realRoot, realFile] = await Promise.all([fs.realpath(root), fs.realpath(wanted)]);
    if (!inside(realRoot, realFile)) return null;
    const stat = await fs.stat(realFile);
    if (!stat.isFile()) return null;
    return new Uint8Array(await fs.readFile(realFile));
  } catch {
    return null;
  }
}

export interface AppDeps {
  webDist: string;
  engine: () => EngineView;
  fetch: SocketFetch;
  readFile: (root: string, relativePath: string) => Promise<Uint8Array<ArrayBuffer> | null>;
  /** Files under web/dist this handler never serves. */
  refuse?: (relativePath: string) => boolean;
  /** Try again, on the page shown when the engine could not start. */
  retry?: () => void;
  /** Copy details: puts the engine's last lines on the clipboard. */
  copy?: (text: string) => void;
}

function html(page: string): Response {
  return new Response(page, { status: 200, headers: responseHeaders("text/html; charset=utf-8") });
}

/** After an action, when the engine is ready: back to the screen, with no script. */
const REFRESH = '<!doctype html><meta http-equiv="refresh" content="0;url=/index.html">';

function plain(status: number, sentence: string): Response {
  return new Response(sentence, {
    status,
    headers: responseHeaders("text/plain; charset=utf-8"),
  });
}

/** The handler for the app scheme. It takes a request and gives an answer; nothing else. */
export function createAppHandler(deps: AppDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    const route = routeRequest(request.url);
    if (route.kind === "refused") return plain(404, "Not found.");
    if (route.kind === "file" && deps.refuse?.(route.relative) === true) {
      return plain(404, "Not found.");
    }
    const view = deps.engine();
    if (route.kind === "file" && (route.relative === RETRY_PATH || route.relative === COPY_PATH)) {
      if (request.method !== "POST") return plain(404, "Not found.");
      if (view.state === "failed" || view.state === "ended") {
        if (route.relative === RETRY_PATH && deps.retry !== undefined) {
          deps.retry();
        } else if (route.relative === COPY_PATH && deps.copy !== undefined) {
          deps.copy(details(view));
          return html(statusPage(view, { copied: true }));
        }
      }
      const now = deps.engine();
      return now.state === "ready" ? html(REFRESH) : html(statusPage(now));
    }
    if (route.kind === "engine") {
      if (view.state !== "ready") return plain(503, "Duly's engine is not running.");
      const body =
        request.method === "GET" || request.method === "HEAD" ? null : await request.arrayBuffer();
      const init = engineRequestInit(
        request.method,
        request.headers.get("Content-Type"),
        view.token,
        body,
      );
      let answer: Response;
      try {
        answer = await deps.fetch(view.socket, route.path, init);
      } catch {
        return plain(502, "Duly could not reach its engine.");
      }
      const payload = await answer.arrayBuffer();
      return new Response(
        request.method === "HEAD" || answer.status === 204 || answer.status === 304
          ? null
          : payload,
        { status: answer.status, headers: responseHeaders(answer.headers.get("Content-Type")) },
      );
    }
    if (route.relative === "index.html" && view.state !== "ready") return html(statusPage(view));
    const bytes = await deps.readFile(deps.webDist, route.relative);
    if (bytes === null) return plain(404, "Not found.");
    return new Response(bytes, {
      status: 200,
      headers: responseHeaders(contentType(route.relative)),
    });
  };
}
