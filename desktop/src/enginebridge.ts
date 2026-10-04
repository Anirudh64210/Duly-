/**
 * The engine bridge (SPEC-W2 point 5): the page asks the engine through window.duly.engine,
 * and main forwards each call to the bundled engine over the W1 socket with the token. Main
 * checks each call and each answer against contracts/desktop_engine_bridge.schema.json; the
 * page never names a socket, a path or a token, and never sees an answer outside the contract.
 */
import { mayUseCase, PROBLEM_LENGTH } from "./casefile";
import type { EngineView } from "./pages";
import { TOKEN_HEADER, type SocketFetch } from "./protocol";
import type { Checker } from "./schema";

/** The channel the preload asks on. The preload holds its own copy; a test compares them. */
export const ENGINE_CHANNEL = "duly:engine";

export const ENGINE_BRIDGE_ID = "https://duly.local/contracts/desktop_engine_bridge.schema.json";
const CASE_SCHEMA_ID = "https://duly.local/contracts/case.schema.json";

/** The contracts the engine bridge checks against: its own and every one it refers to. */
export const ENGINE_CONTRACTS = [
  "case.schema.json",
  "engine_output.schema.json",
  "schedule.schema.json",
  "update.schema.json",
  "desktop_engine_bridge.schema.json",
] as const;

type CallName = "engine.compute" | "engine.schedule" | "engine.updates";

export interface Refusal {
  version: "v1";
  call: CallName;
  ok: false;
  refused:
    "not_a_case" | "engine_unavailable" | "engine_refused" | "engine_failed" | "not_an_answer";
  first_problem?: string;
}

export type Reply =
  { version: "v1"; call: CallName; ok: true; [answer: string]: unknown } | Refusal;

/** How each call goes to the engine, and how its 200 body becomes the reply. */
const CALLS: Record<
  CallName,
  {
    shape: string;
    reply: string;
    path: string;
    body?: (message: Record<string, unknown>) => unknown;
    answer: (body: Record<string, unknown>) => Record<string, unknown>;
  }
> = {
  "engine.compute": {
    shape: "compute_call",
    reply: "compute_reply",
    path: "/v1/compute",
    body: (message) => message.case,
    answer: (body) => ({ output: body }),
  },
  "engine.schedule": {
    shape: "schedule_call",
    reply: "schedule_reply",
    path: "/v1/schedule",
    body: (message) => ({ case: message.case, requests: message.requests }),
    answer: (body) => ({ today: body.today, dates: body.dates }),
  },
  "engine.updates": {
    shape: "updates_call",
    reply: "updates_reply",
    path: "/v1/updates",
    answer: (body) => ({
      updates: Array.isArray(body.updates)
        ? body.updates.map((one: unknown) =>
            typeof one === "object" && one !== null ? (one as { update?: unknown }).update : one,
          )
        : body.updates,
    }),
  },
};

/** The least a case can be, put in the case's place while only the call's shape is checked. */
const SHAPE_ONLY = { categories: ["f1"], time_zone: "UTC", facts: {}, records: [], complete: {} };

/** The same rule as the case bridge: only the app's own page, in the main frame. */
export function mayUseEngine(frameUrl: string | undefined, isMainFrame: boolean): boolean {
  return mayUseCase(frameUrl, isMainFrame);
}

export interface EngineBridgeDeps {
  checker: Checker;
  /** The engine as it is now: only a ready engine has a socket and a token. */
  engine: () => EngineView;
  fetch: SocketFetch;
}

function refusal(call: CallName, refused: Refusal["refused"], problem?: string): Refusal {
  const reply: Refusal = { version: "v1", call, ok: false, refused };
  if (problem !== undefined) reply.first_problem = problem.slice(0, PROBLEM_LENGTH);
  return reply;
}

/**
 * Answers one call from the page. A message that is not one of the three calls is not
 * answered: the promise is rejected, and nothing is sent to the engine.
 */
export function createEngineBridge(deps: EngineBridgeDeps): (message: unknown) => Promise<Reply> {
  const { checker } = deps;

  const forward = async (call: CallName, message: Record<string, unknown>): Promise<Reply> => {
    const how = CALLS[call];
    if (call !== "engine.updates") {
      const problem = checker.problem(CASE_SCHEMA_ID, message.case);
      if (problem !== null) return refusal(call, "not_a_case", problem);
    }
    const view = deps.engine();
    if (view.state !== "ready") return refusal(call, "engine_unavailable");
    const headers: Record<string, string> = { [TOKEN_HEADER]: view.token };
    const init: RequestInit = { method: how.body === undefined ? "GET" : "POST", headers };
    if (how.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(how.body(message));
    }
    let status: number;
    let text: string;
    try {
      const response = await deps.fetch(view.socket, how.path, init);
      status = response.status;
      text = await response.text();
    } catch {
      return refusal(call, "engine_unavailable");
    }
    // The engine's own words are never passed on: a 422 echoes the case it refused.
    if (status === 422) return refusal(call, "engine_refused");
    if (status !== 200) return refusal(call, "engine_failed");
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return refusal(call, "not_an_answer", "/: JSON");
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return refusal(call, "not_an_answer", "/: type");
    }
    const reply = { version: "v1", call, ok: true, ...how.answer(body as Record<string, unknown>) };
    const problem = checker.problem(`${ENGINE_BRIDGE_ID}#/$defs/${how.reply}`, reply);
    if (problem !== null) return refusal(call, "not_an_answer", problem);
    return reply as Reply;
  };

  return (message: unknown) => {
    const isObject = typeof message === "object" && message !== null && !Array.isArray(message);
    const call = isObject ? (message as { call?: unknown }).call : undefined;
    if (typeof call !== "string" || !Object.hasOwn(CALLS, call)) {
      return Promise.reject(new Error("not an engine bridge call"));
    }
    const name = call as CallName;
    // The case is checked on its own, so a case that fails is refused as not_a_case. The rest
    // of the message must be the call exactly as the contract gives it.
    const fields = message as Record<string, unknown>;
    const hasCase = Object.hasOwn(fields, "case");
    const shape = hasCase ? { ...fields, case: SHAPE_ONLY } : fields;
    if (checker.problem(`${ENGINE_BRIDGE_ID}#/$defs/${CALLS[name].shape}`, shape) !== null) {
      return Promise.reject(new Error("not an engine bridge call"));
    }
    return forward(name, fields);
  };
}
