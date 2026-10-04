// specs/step-w/SPEC-W2.md point 52, the L-tests line for W2-P4: the engine bridge (point 5), the
// state bridge (point 18) and local notifications for planned reminders (point 22), against
// contracts/desktop_engine_bridge.schema.json and contracts/desktop_state_bridge.schema.json.
// Written before the modules exist: these cannot pass yet.
//
// What L-desktop builds for these tests, beside casefile.ts and named like it:
// - desktop/src/enginebridge.ts: ENGINE_CHANNEL; mayUseEngine(frameUrl, isMainFrame);
//   createEngineBridge({ checker, engine, fetch }) answering one message, where engine() is the
//   engine's current EngineView (pages.ts) and fetch is protocol.ts's SocketFetch.
// - desktop/src/statefile.ts: STATE_CHANNEL; mayUseState(frameUrl, isMainFrame);
//   createStateBridge({ folder, cipher, checker, disk? }), as createCaseBridge.
// - desktop/src/reminders.ts: createReminders() with set(reminders), the reminders part of a
//   saved state, and tick({ date, time }), this Mac's local day and HH:MM, given by main. Given
//   { folder, cipher } (main's userData and safeStorage, as state.bin), it keeps the record of
//   shown reminders there, readable only with the keychain (the second W2-P4 review, below).
// - the preload: window.duly.engine and window.duly.state, on those channels.
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Cipher, Disk } from "../../desktop/src/casefile";
import type { EngineView } from "../../desktop/src/pages";
import type { SocketFetch } from "../../desktop/src/protocol";
import type { Checker } from "../../desktop/src/schema";
import {
  ENGINE_BRIDGE,
  ROOT,
  SRC,
  STATE_BRIDGE,
  contractChecker,
  fakeKeychain,
  filesUnder,
  load,
} from "./support";

const exposed = vi.hoisted(() => [] as [string, unknown][]);
const asked = vi.hoisted(() => [] as unknown[][]);
const shown = vi.hoisted(() => [] as { options: unknown; shows: number }[]);

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld: (key: string, value: unknown) => exposed.push([key, value]),
  },
  ipcRenderer: {
    invoke: (...args: unknown[]) => {
      asked.push(args);
      return Promise.resolve({ ok: true });
    },
  },
  webUtils: { getPathForFile: () => "" },
  // Electron's Notification: each one made is kept with how often it was shown.
  Notification: class {
    private readonly seen: { options: unknown; shows: number };
    constructor(options: unknown) {
      this.seen = { options, shows: 0 };
      shown.push(this.seen);
    }
    show(): void {
      this.seen.shows += 1;
    }
    static isSupported(): boolean {
      return true;
    }
  },
}));

type Bridge = (message: unknown) => Promise<unknown>;
type MayUse = (frameUrl: string | undefined, isMainFrame: boolean) => boolean;

interface EngineBridgeModule {
  ENGINE_CHANNEL: string;
  mayUseEngine: MayUse;
  createEngineBridge(deps: {
    checker: Checker;
    engine: () => EngineView;
    fetch: SocketFetch;
  }): Bridge;
}

interface StateFileModule {
  STATE_CHANNEL: string;
  mayUseState: MayUse;
  createStateBridge(deps: {
    folder: string;
    cipher: Cipher;
    checker: Checker;
    disk?: Disk;
  }): Bridge;
}

interface RemindersModule {
  createReminders(): {
    set(reminders: unknown): void;
    tick(now: { date: string; time: string }): void;
  };
}

/** createReminders given main's userData folder and safeStorage, to keep what it has shown. */
interface KeptReminders {
  createReminders(deps: { folder: string; cipher: Cipher }): {
    set(reminders: unknown): void;
    tick(now: { date: string; time: string }): void | Promise<void>;
  };
}

// The same case desktop/src/casefile.test.ts saves: it follows contracts/case.schema.json.
const A_CASE = {
  categories: ["f1"],
  time_zone: "America/New_York",
  facts: { status: "f1", program_end: "2027-02-09" },
  records: [
    {
      id: "a1",
      kind: "authorization",
      fields: {
        type: "post_completion_opt",
        periods: [{ start: "2026-02-10", end: "2027-02-09" }],
      },
    },
  ],
  complete: { authorization: { on: "2026-09-29" } },
};

// An engine output that follows contracts/engine_output.schema.json (checked with jsonschema
// when this file was written): the web sample the screen tests use.
const OUTPUT = JSON.parse(
  readFileSync(join(ROOT, "web", "src", "lib", "samples", "complete-by.json"), "utf8"),
) as unknown;

// One update that follows contracts/update.schema.json and that publish_blockers passes:
// PASSING of tests/unit/api/test_local_routes_w2.py, as GET /v1/updates serves it.
const UPDATE = {
  id: "review-w2p3-passing",
  headline: "A court order on the rule",
  legal_status: "enjoined",
  status_as_of: "2026-09-14",
  claims: [
    {
      text: "A court blocked the rule nationwide.",
      quote: "is hereby enjoined",
      source_url: "https://www.courtlistener.com/docket/1/",
      source_kind: "primary",
      snapshot_sha256: "a".repeat(64),
      quote_found: true,
    },
  ],
  categories: ["f1"],
  stages: ["opt"],
  checks: { independent_check_passed: true, refutation_survived: true },
  approval: { approved: true, approved_by: "founder", approved_at: "2026-09-15T10:00:00Z" },
  history: [],
};

// One timer from today. The engine dates it, not this test: the fake engine below answers as
// the real one would on 2026-10-03 in America/New_York. Working: 2026-10-03 plus 3 calendar
// days is 2026-10-06 (October has 31 days, so no month is crossed), 3 days away.
const REQUESTS = [{ id: "loop.a.reminder", from: { today: true }, add: { days: 3 }, sign: 1 }];
const SCHEDULED = {
  today: { date: "2026-10-03", time_zone: "America/New_York" },
  dates: [{ id: "loop.a.reminder", date: "2026-10-06", days_away: 3 }],
};

const SOCKET = "/Users/someone/Library/Application Support/Duly/run/engine.sock";
const TOKEN = "ab".repeat(32);
const READY: EngineView = { state: "ready", socket: SOCKET, token: TOKEN };

const compute = (value: unknown) => ({ version: "v1", call: "engine.compute", case: value });
const schedule = (value: unknown, requests: unknown) => ({
  version: "v1",
  call: "engine.schedule",
  case: value,
  requests,
});
const updates = { version: "v1", call: "engine.updates" };

interface Sent {
  socket: string;
  path: string;
  method: string;
  token: string | null;
  body: unknown;
}

/** A fake engine on the socket: answers each path with the status and body given. */
function fakeEngine(answers: Record<string, { status: number; body: unknown }>) {
  const sent: Sent[] = [];
  const fetch: SocketFetch = (socket, path, init) => {
    sent.push({
      socket,
      path,
      method: (init.method ?? "GET").toUpperCase(),
      token: new Headers(init.headers).get("X-Duly-Local"),
      body: init.body === undefined || init.body === null ? null : JSON.parse(String(init.body)),
    });
    const answer = answers[path] ?? { status: 404, body: { detail: "Not Found" } };
    return Promise.resolve(
      new Response(JSON.stringify(answer.body), {
        status: answer.status,
        headers: { "content-type": "application/json" },
      }),
    );
  };
  return { fetch, sent };
}

const ENGINE_ANSWERS = {
  "/v1/compute": { status: 200, body: OUTPUT },
  "/v1/schedule": { status: 200, body: SCHEDULED },
  "/v1/updates": {
    status: 200,
    body: { matching: 1, updates: [{ update: UPDATE, matched: { stages: ["opt"], fields: [] } }] },
  },
};

let engineModule: EngineBridgeModule;
let stateModule: StateFileModule;
let checker: Checker;
let folder: string;

beforeEach(async () => {
  folder = mkdtempSync(join(tmpdir(), "duly-bridges-"));
  checker = contractChecker([
    "case",
    "engine_output",
    "schedule",
    "update",
    "desktop_ask_bridge",
    "desktop_engine_bridge",
    "desktop_state_bridge",
  ]);
  engineModule = await load<EngineBridgeModule>("enginebridge");
  stateModule = await load<StateFileModule>("statefile");
});
afterEach(() => rmSync(folder, { recursive: true, force: true }));

describe("the engine bridge (SPEC-W2 point 5)", () => {
  const bridge = (engine: ReturnType<typeof fakeEngine>, view: EngineView = READY) =>
    engineModule.createEngineBridge({ checker, engine: () => view, fetch: engine.fetch });

  it("forwards compute to POST /v1/compute over the socket with the token", async () => {
    // Point 5: "Main forwards each to the engine over the W1 socket with the token." Fails if
    // the case is changed on the way, another socket or path is used, or the token is missing.
    const engine = fakeEngine(ENGINE_ANSWERS);
    const reply = await bridge(engine)(compute(A_CASE));
    expect(engine.sent).toEqual([
      { socket: SOCKET, path: "/v1/compute", method: "POST", token: TOKEN, body: A_CASE },
    ]);
    expect(reply).toEqual({ version: "v1", call: "engine.compute", ok: true, output: OUTPUT });
    expect(checker.problem(`${ENGINE_BRIDGE}#/$defs/compute_reply`, reply)).toBeNull();
  });

  it("forwards schedule as {case, requests} and gives the engine's dates back", async () => {
    // Contract schedule_call: "Main forwards {case, requests} as the body of POST
    // /v1/schedule". The reply is the 200 body with version, call and ok.
    const engine = fakeEngine(ENGINE_ANSWERS);
    const reply = await bridge(engine)(schedule(A_CASE, REQUESTS));
    expect(engine.sent).toEqual([
      {
        socket: SOCKET,
        path: "/v1/schedule",
        method: "POST",
        token: TOKEN,
        body: { case: A_CASE, requests: REQUESTS },
      },
    ]);
    expect(reply).toEqual({ version: "v1", call: "engine.schedule", ok: true, ...SCHEDULED });
    expect(checker.problem(`${ENGINE_BRIDGE}#/$defs/schedule_reply`, reply)).toBeNull();
  });

  it("forwards updates to GET /v1/updates with no query, and gives the updates only", async () => {
    // Contract updates_call: "as GET /v1/updates gives them with no query ... nothing about
    // the case is sent". The reply's updates are the update.schema.json objects of the body.
    const engine = fakeEngine(ENGINE_ANSWERS);
    const reply = await bridge(engine)(updates);
    expect(engine.sent).toEqual([
      { socket: SOCKET, path: "/v1/updates", method: "GET", token: TOKEN, body: null },
    ]);
    expect(reply).toEqual({ version: "v1", call: "engine.updates", ok: true, updates: [UPDATE] });
    expect(checker.problem(`${ENGINE_BRIDGE}#/$defs/updates_reply`, reply)).toBeNull();
  });

  it("refuses a call outside the contract, and sends nothing to the engine", async () => {
    // Point 5: "a call outside the schema is refused", as the case bridge rejects one. Each
    // message is outside desktop_engine_bridge.schema.json; fails if any reaches the engine.
    const engine = fakeEngine(ENGINE_ANSWERS);
    const outside = [
      { ...updates, path: "/v1/admin" },
      { ...updates, socket: "/tmp/other.sock" },
      { ...updates, token: TOKEN },
      { ...updates, categories: ["f1"] },
      { ...compute(A_CASE), requests: REQUESTS },
      { version: "v1", call: "engine.compute" },
      { version: "v1", call: "engine.schedule", case: A_CASE },
      schedule(
        A_CASE,
        Array.from({ length: 1001 }, (_, n) => ({ ...REQUESTS[0], id: `t${n}` })),
      ),
      schedule(A_CASE, [{ ...REQUESTS[0], add: { days: 36526 } }]),
      { version: "v2", call: "engine.updates" },
      { version: "v1", call: "engine.fetch", path: "/v1/compute" },
      { version: "v1", call: "engine.compute", ok: true, output: OUTPUT },
      "engine.updates",
      null,
      [updates],
    ];
    for (const message of outside) {
      for (const call of ["compute_call", "schedule_call", "updates_call"]) {
        const problem = checker.problem(`${ENGINE_BRIDGE}#/$defs/${call}`, message);
        expect(problem, JSON.stringify(message).slice(0, 80)).not.toBeNull();
      }
      await expect(bridge(engine)(message)).rejects.toThrow();
    }
    expect(engine.sent).toEqual([]);
  });

  it("refuses a case that fails case.schema.json as not_a_case, and forwards nothing", async () => {
    // Contract refusal: "not_a_case: the case sent does not match case.schema.json, so nothing
    // is forwarded." first_problem names the place, never the value.
    const engine = fakeEngine(ENGINE_ANSWERS);
    const bad = { ...A_CASE, time_zone: 3, "1990-01-01 A12345678": "x" };
    for (const message of [compute(bad), schedule(bad, REQUESTS)]) {
      const reply = await bridge(engine)(message);
      expect(reply).toMatchObject({ version: "v1", ok: false, refused: "not_a_case" });
      expect(JSON.stringify(reply)).not.toContain("A12345678");
      expect(checker.problem(ENGINE_BRIDGE, reply)).toBeNull();
    }
    expect(engine.sent).toEqual([]);
  });

  it("says engine_unavailable while the engine is not ready", async () => {
    // Contract: "engine_unavailable: the engine is not running". Fails if a call is sent
    // with no socket and token, or a reply is made up.
    const engine = fakeEngine(ENGINE_ANSWERS);
    for (const view of [
      { state: "starting" },
      { state: "failed", lines: ["gone"] },
      { state: "ended", lines: [] },
    ] as EngineView[]) {
      const reply = await bridge(engine, view)(updates);
      expect(reply).toEqual({
        version: "v1",
        call: "engine.updates",
        ok: false,
        refused: "engine_unavailable",
      });
    }
    expect(engine.sent).toEqual([]);
  });

  it("names the engine's own refusal and failure, and never passes either on", async () => {
    // Contract: engine_refused (the engine refused the call, a 422), engine_failed (an
    // error), not_an_answer (an answer outside the contract, which the page never sees).
    const cases: [number, unknown, string][] = [
      // A 422 echoes the value it refused as input; that value is the case's, never the page's.
      [422, { detail: [{ loc: ["body", "facts"], input: "secret-detail" }] }, "engine_refused"],
      [500, { detail: "secret-detail" }, "engine_failed"],
      [200, { verdict: "secret-detail" }, "not_an_answer"],
    ];
    for (const [status, body, refused] of cases) {
      const engine = fakeEngine({ "/v1/compute": { status, body } });
      const reply = await bridge(engine)(compute(A_CASE));
      expect(reply).toMatchObject({ version: "v1", call: "engine.compute", ok: false, refused });
      expect(JSON.stringify(reply)).not.toContain("secret-detail");
      expect(checker.problem(`${ENGINE_BRIDGE}#/$defs/compute_reply`, reply)).toBeNull();
    }
  });

  it("checks the schedule answer too: a date the engine did not give in shape is refused", async () => {
    // Every reply is checked against the contract before the page sees it. Fails if an
    // answer missing days_away, or with a date that is not a real day, reaches the page.
    for (const dates of [
      [{ id: "loop.a.reminder", date: "2026-10-06" }],
      [{ id: "loop.a.reminder", date: "2026-02-30", days_away: 3 }],
    ]) {
      const engine = fakeEngine({ "/v1/schedule": { status: 200, body: { ...SCHEDULED, dates } } });
      const reply = await bridge(engine)(schedule(A_CASE, REQUESTS));
      expect(reply).toMatchObject({ ok: false, refused: "not_an_answer" });
    }
  });

  it("never puts the socket or the token in a reply", async () => {
    const engine = fakeEngine(ENGINE_ANSWERS);
    const replies = [
      await bridge(engine)(compute(A_CASE)),
      await bridge(engine)(schedule(A_CASE, REQUESTS)),
      await bridge(engine)(updates),
    ];
    for (const reply of replies) {
      expect(JSON.stringify(reply)).not.toContain(TOKEN);
      expect(JSON.stringify(reply)).not.toContain("engine.sock");
    }
  });

  it("lets only the app's own page, in the main frame, use the bridge", () => {
    // Point 5: "a call from a frame that is not the main frame of duly://app is refused, as
    // the case bridge does today" (casefile.ts mayUseCase).
    const may = engineModule.mayUseEngine;
    expect(may("duly://app/index.html", true)).toBe(true);
    expect(may("duly://app/index.html", false)).toBe(false);
    expect(may("duly://other/index.html", true)).toBe(false);
    expect(may("https://www.uscis.gov/", true)).toBe(false);
    expect(may("file:///etc/passwd", true)).toBe(false);
    expect(may(undefined, true)).toBe(false);
  });

  it("is wired in main behind the frame check", () => {
    // The frame check lives in main's ipcMain handler; this reads main.ts as casefile.test.ts
    // does for the case bridge. Fails if the handler is added without mayUseEngine.
    const main = readFileSync(join(SRC, "main.ts"), "utf8");
    expect(main).toContain("ipcMain.handle(ENGINE_CHANNEL");
    expect(main).toContain("mayUseEngine(");
    expect(main).toContain("createEngineBridge(");
  });
});

// A state that follows $defs/state: a loop, a tick and one planned reminder.
const A_STATE = {
  slot: "own",
  loops: [
    {
      id: "loop.a",
      playbook: "job-ends",
      playbook_version: "1.0.0",
      state: "planned",
      step: "report",
      history: [{ on: "2026-10-03", event: "started", step: "start" }],
    },
  ],
  ticks: { "task.read_i20": { on: "2026-10-02" } },
  reminders: {
    on: true,
    time_of_day: "09:00",
    planned: [
      {
        id: "loop.a.reminder",
        on: "2026-10-06",
        title: "Report the end of your job",
        body: "Reminder set on this Mac",
      },
    ],
  },
};

const stateRead = { version: "v1", call: "state.read" };
const stateClear = { version: "v1", call: "state.clear" };
const stateWrite = (value: unknown) => ({ version: "v1", call: "state.write", state: value });

describe("the state bridge (SPEC-W2 point 18)", () => {
  const bridge = (cipher: Cipher = fakeKeychain().cipher, disk?: Disk) =>
    stateModule.createStateBridge({ folder, cipher, checker, ...(disk ? { disk } : {}) });

  it("writes a state, reads it back, and clears it, in state.bin only", async () => {
    // Point 18: "saves <userData>/state.bin with safeStorage like case.bin". Fails if the
    // state is changed on the way, kept under another name, or clear leaves the file.
    const state = bridge();
    expect(await state(stateRead)).toEqual({ ...stateRead, ok: true, state: null });
    expect(await state(stateWrite(A_STATE))).toEqual({
      version: "v1",
      call: "state.write",
      ok: true,
    });
    expect(readdirSync(folder)).toEqual(["state.bin"]);
    expect(await state(stateRead)).toEqual({ ...stateRead, ok: true, state: A_STATE });
    expect(await state(stateClear)).toEqual({ ...stateClear, ok: true });
    expect(readdirSync(folder)).toEqual([]);
    expect(await state(stateRead)).toEqual({ ...stateRead, ok: true, state: null });
  });

  it("encrypts with the keychain's key: no word or date of the state is on disk", async () => {
    const keychain = fakeKeychain();
    await bridge(keychain.cipher)(stateWrite(A_STATE));
    const text = readFileSync(join(folder, "state.bin")).toString("latin1");
    expect(text).not.toContain("Report the end of your job");
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(keychain.wrapped).toHaveLength(1);
    expect(JSON.parse(keychain.wrapped[0] ?? "null")).toEqual(A_STATE);
  });

  it("checks every write against $defs/state and keeps the saved state on a refusal", async () => {
    // Contract: "checks it against $defs/state on every read and every write". Each value
    // below breaks $defs/state; fails if any is written.
    const state = bridge();
    await state(stateWrite(A_STATE));
    const before = readFileSync(join(folder, "state.bin"));
    const outside = [
      { ...A_STATE, path: "/Users/someone" },
      { ...A_STATE, slot: "theirs" },
      { ...A_STATE, reminders: { ...A_STATE.reminders, time_of_day: "25:00" } },
      { ...A_STATE, ticks: { "task.x": { on: "2026-13-01" } } },
      { ...A_STATE, loops: [{ ...A_STATE.loops[0], state: "done" }] },
      [],
      "state",
      null,
    ];
    for (const value of outside) {
      const reply = await state(stateWrite(value));
      expect(reply).toMatchObject({ call: "state.write", ok: false, refused: "not_a_state" });
      expect(checker.problem(`${STATE_BRIDGE}#/$defs/write_reply`, reply)).toBeNull();
    }
    expect(readFileSync(join(folder, "state.bin"))).toEqual(before);
  });

  it("refuses a bad state file on read and keeps it, never deleting it", async () => {
    // Point 18 and the plan: "refuses and keeps a bad state file, never deleting it". Three
    // bad files: one outside $defs/state, one not JSON, one the keychain's key cannot open.
    const keychain = fakeKeychain();
    const state = bridge(keychain.cipher);
    const files: [Buffer, string][] = [
      [keychain.cipher.encrypt(JSON.stringify({ ...A_STATE, slot: 1 })), "not_a_state"],
      [keychain.cipher.encrypt("not json"), "not_a_state"],
      [fakeKeychain().cipher.encrypt(JSON.stringify(A_STATE)), "cannot_decrypt"],
    ];
    for (const [bytes, refused] of files) {
      writeFileSync(join(folder, "state.bin"), bytes);
      const reply = await state(stateRead);
      expect(reply).toMatchObject({ call: "state.read", ok: false, refused });
      expect(checker.problem(`${STATE_BRIDGE}#/$defs/read_reply`, reply)).toBeNull();
      expect(readFileSync(join(folder, "state.bin"))).toEqual(bytes);
    }
  });

  it("writes atomically: a write that fails leaves the old state whole", async () => {
    // "written atomically like case.bin": the file is the old state or the new one, never
    // half. With a disk whose write fails, the reply is cannot_store and the old state reads.
    const keychain = fakeKeychain();
    await bridge(keychain.cipher)(stateWrite(A_STATE));
    const failing: Disk = {
      read: async (path) => (existsSync(path) ? readFileSync(path) : null),
      write: () => Promise.reject(new Error("full")),
      remove: () => Promise.reject(new Error("busy")),
    };
    const reply = await bridge(keychain.cipher, failing)(stateWrite({ slot: "sample" }));
    expect(reply).toMatchObject({ ok: false, refused: "cannot_store" });
    expect(await bridge(keychain.cipher)(stateRead)).toMatchObject({ ok: true, state: A_STATE });
    expect(readdirSync(folder)).toEqual(["state.bin"]);
  });

  it("writes nothing when the keychain cannot encrypt", async () => {
    const cipher = { ...fakeKeychain().cipher, available: () => false };
    const reply = await bridge(cipher)(stateWrite(A_STATE));
    expect(reply).toMatchObject({ ok: false, refused: "keychain_unavailable" });
    expect(readdirSync(folder)).toEqual([]);
  });

  it("refuses a call outside the contract, as the case bridge does", async () => {
    const outside = [
      { ...stateRead, path: "/etc/passwd" },
      { ...stateClear, file: "../case.bin" },
      { ...stateWrite(A_STATE), folder: "/tmp" },
      { version: "v1", call: "state.write" },
      { version: "v2", call: "state.read" },
      { version: "v1", call: "state.move", to: "/tmp" },
      "state.read",
      null,
    ];
    for (const message of outside) {
      await expect(bridge()(message)).rejects.toThrow();
    }
    expect(readdirSync(folder)).toEqual([]);
  });

  it("gives every reply in the contract's shape", async () => {
    const state = bridge();
    for (const message of [stateWrite(A_STATE), stateRead, stateClear, stateRead]) {
      expect(checker.problem(STATE_BRIDGE, message)).toBeNull();
      expect(checker.problem(STATE_BRIDGE, await state(message))).toBeNull();
    }
  });

  it("lets only the app's own page, in the main frame, use the bridge", () => {
    const may = stateModule.mayUseState;
    expect(may("duly://app/index.html", true)).toBe(true);
    expect(may("duly://app/index.html", false)).toBe(false);
    expect(may("https://www.uscis.gov/", true)).toBe(false);
    expect(may(undefined, true)).toBe(false);
    const main = readFileSync(join(SRC, "main.ts"), "utf8");
    expect(main).toContain("ipcMain.handle(STATE_CHANNEL");
    expect(main).toContain("mayUseState(");
  });
});

describe("the preload's engine and state calls", () => {
  interface Exposed {
    engine: Record<string, (...args: unknown[]) => Promise<unknown>>;
    state: Record<string, (...args: unknown[]) => Promise<unknown>>;
  }

  it("sends only the contract's calls on the bridges' own channels", async () => {
    // Points 5 and 18: the page names no socket, path, token or file. Whatever else the page
    // passes is dropped. Fails if an extra argument reaches main, or a channel differs.
    const preload = await load<Record<string, unknown>>("preload");
    expect(preload.ENGINE_CHANNEL).toBe(engineModule.ENGINE_CHANNEL);
    expect(preload.STATE_CHANNEL).toBe(stateModule.STATE_CHANNEL);
    const duly = (exposed.find(([key]) => key === "duly") ?? ["", null])[1] as Exposed;
    expect(Object.keys(duly.engine).sort()).toEqual(["compute", "schedule", "updates"]);
    expect(Object.keys(duly.state).sort()).toEqual(["clear", "read", "write"]);
    expect(Object.isFrozen(duly.engine) && Object.isFrozen(duly.state)).toBe(true);
    asked.length = 0;
    await duly.engine.compute?.(A_CASE, "/tmp/engine.sock");
    await duly.engine.schedule?.(A_CASE, REQUESTS, TOKEN);
    await duly.engine.updates?.({ categories: ["f1"] });
    await duly.state.read?.("/etc/passwd");
    await duly.state.write?.(A_STATE, "../state.bin");
    await duly.state.clear?.("../case.bin");
    const engineChannel = engineModule.ENGINE_CHANNEL;
    const stateChannel = stateModule.STATE_CHANNEL;
    expect(asked).toEqual([
      [engineChannel, compute(A_CASE)],
      [engineChannel, schedule(A_CASE, REQUESTS)],
      [engineChannel, updates],
      [stateChannel, stateRead],
      [stateChannel, stateWrite(A_STATE)],
      [stateChannel, stateClear],
    ]);
  });
});

describe("a planned reminder becomes one Notification (SPEC-W2 point 22)", () => {
  // Point 22: "Main shows local notifications through Electron's Notification at the planned
  // times while Duly runs"; $defs/planned_reminder: "One local notification main shows at the
  // reminder time of day on this date ... with these words." The clock is given to tick.
  const reminders = A_STATE.reminders;
  const words = { title: "Report the end of your job", body: "Reminder set on this Mac" };

  beforeEach(() => {
    shown.length = 0;
  });

  it("shows it once, at the time of day on its date, with exactly its words", async () => {
    // Dated 2026-10-06 at 09:00. Before: 10-05 at 09:00 (a day early) and 10-06 at 08:59
    // (a minute early). At 10-06 09:00 one Notification. Later ticks the same day and the next
    // day show nothing more. Fails on a second Notification, a changed word, or a wrong time.
    const { createReminders } = await load<RemindersModule>("reminders");
    const planner = createReminders();
    planner.set(reminders);
    planner.tick({ date: "2026-10-05", time: "09:00" });
    planner.tick({ date: "2026-10-06", time: "08:59" });
    expect(shown).toEqual([]);
    planner.tick({ date: "2026-10-06", time: "09:00" });
    planner.tick({ date: "2026-10-06", time: "09:01" });
    planner.tick({ date: "2026-10-07", time: "09:00" });
    expect(shown).toHaveLength(1);
    expect(shown[0]?.shows).toBe(1);
    expect(shown[0]?.options).toMatchObject(words);
    const options = shown[0]?.options as { title: string; body: string };
    expect([options.title, options.body]).toEqual([words.title, words.body]);
  });

  it("does not show it again when the same plan is saved again", async () => {
    // A state write sends the plan again; the reminder with the same id stays shown once.
    const { createReminders } = await load<RemindersModule>("reminders");
    const planner = createReminders();
    planner.set(reminders);
    planner.tick({ date: "2026-10-06", time: "09:00" });
    planner.set(reminders);
    planner.tick({ date: "2026-10-06", time: "09:05" });
    expect(shown).toHaveLength(1);
  });

  it("shows each reminder of the day with its own words, and none while reminders are off", async () => {
    const { createReminders } = await load<RemindersModule>("reminders");
    const second = { id: "loop.b.reminder", on: "2026-10-06", title: "Check in", body: "" };
    const planner = createReminders();
    planner.set({ ...reminders, on: false, planned: [...reminders.planned, second] });
    planner.tick({ date: "2026-10-06", time: "09:00" });
    expect(shown).toEqual([]);
    planner.set({ ...reminders, planned: [...reminders.planned, second] });
    planner.tick({ date: "2026-10-06", time: "09:00" });
    const titles = shown.map((one) => (one.options as { title: string }).title).sort();
    expect(titles).toEqual(["Check in", "Report the end of your job"]);
    expect(shown.every((one) => one.shows === 1)).toBe(true);
  });

  it("review_w2p4_3: a reminder shown at 09:00 is not shown again by a second main at 09:40", async () => {
    // reviews/w2-p4.md finding 3: the shown set lived only in memory, so Duly quit and opened
    // again at 09:40 the same day showed the 09:00 reminder a second time (P5 printed 2).
    // DECISIONS.md D96: "A planned reminder is shown once across relaunches, the shown ids
    // kept in main's own file." So createReminders is given the userData folder. Two mains
    // over one folder: one Notification. A main over another, empty folder shows it, so the
    // first is not kept from showing for some other reason. Fails while shown is memory only.
    // Each main is given this Mac's keychain too, which the record needs since the second
    // review (finding 2, below).
    const { createReminders } = await load<KeptReminders>("reminders");
    const { cipher } = fakeKeychain();
    const first = createReminders({ folder, cipher });
    first.set(reminders);
    await first.tick({ date: "2026-10-06", time: "09:00" });
    expect(shown).toHaveLength(1);

    const second = createReminders({ folder, cipher });
    second.set(reminders);
    await second.tick({ date: "2026-10-06", time: "09:40" });
    expect(shown).toHaveLength(1);
    expect(shown[0]?.shows).toBe(1);

    const elsewhere = mkdtempSync(join(tmpdir(), "duly-other-"));
    try {
      const other = createReminders({ folder: elsewhere, cipher });
      other.set(reminders);
      await other.tick({ date: "2026-10-06", time: "09:40" });
      expect(shown).toHaveLength(2);
    } finally {
      rmSync(elsewhere, { recursive: true, force: true });
    }
  });

  // The second W2-P4 review (reviews/w2-p4.md, run l-review-5f14d86b05), finding 2: the record
  // of shown reminders held unsalted sha256("<id> <date>") in plain text, so a copy of the data
  // folder without the Mac login gave back "loop.b 2026-10-07" from 3 ids and 4 years of dates
  // in a millisecond (S2), and it outlasted state.clear (N5). Point 18 keeps reminders in
  // state.bin under safeStorage; security/threat-model.md names a copy of the data folder.

  /** Every form of the reminder a reader without the keychain could find or match. */
  function readableForms(id: string, on: string): Buffer[] {
    const texts = [id, on, on.replaceAll("-", ""), `${id} ${on}`, `${id}${on}`, `${id}|${on}`];
    texts.push(`${id}:${on}`, `${id}\n${on}`, `${on} ${id}`, JSON.stringify([id, on]));
    texts.push(JSON.stringify({ id, on }));
    const forms = texts.map((text) => Buffer.from(text));
    for (const text of texts) {
      for (const algorithm of ["md5", "sha1", "sha256", "sha512"]) {
        const digest = createHash(algorithm).update(text).digest();
        forms.push(digest, Buffer.from(digest.toString("hex")));
        forms.push(Buffer.from(digest.toString("hex").toUpperCase()));
        forms.push(Buffer.from(digest.toString("base64")));
      }
    }
    return forms;
  }

  it("review2_w2p4_2: the record of shown reminders cannot be read or matched without the keychain", async () => {
    // A reminder loop.b.reminder on 2026-10-07, shown. Every file in the folder is then
    // searched for the id, the date, and md5, sha1, sha256 and sha512 of each way of joining
    // them, in raw bytes, hex and base64: none may be there. A second main with this Mac's
    // keychain does not show it again (the record still works); a main over the same folder
    // with another keychain cannot match it, so it shows it. Fails on today's unsalted sha256
    // in plain text, and on a record kept in the clear.
    const { createReminders } = await load<KeptReminders>("reminders");
    const reminder = { id: "loop.b.reminder", on: "2026-10-07", title: "Check in", body: "" };
    const plan = { ...reminders, planned: [reminder] };
    const keychain = fakeKeychain();
    const first = createReminders({ folder, cipher: keychain.cipher });
    first.set(plan);
    await first.tick({ date: "2026-10-07", time: "09:00" });
    expect(shown).toHaveLength(1);

    const onDisk = [...filesUnder(folder).values()];
    expect(onDisk.length).toBeGreaterThan(0);
    for (const form of readableForms(reminder.id, reminder.on)) {
      for (const bytes of onDisk) expect(bytes.includes(form)).toBe(false);
    }

    const again = createReminders({ folder, cipher: keychain.cipher });
    again.set(plan);
    await again.tick({ date: "2026-10-07", time: "09:30" });
    expect(shown).toHaveLength(1);

    const stranger = createReminders({ folder, cipher: fakeKeychain().cipher });
    stranger.set(plan);
    await stranger.tick({ date: "2026-10-07", time: "09:30" });
    expect(shown).toHaveLength(2);
  });

  it("review2_w2p4_2: state.clear removes the record of shown reminders", async () => {
    // Finding 2, N5: after state.clear the record was still there. Point 18: state.clear is
    // "Delete everything" for the state. A state is saved and a reminder shown, so the folder
    // holds state.bin and the record; after state.clear it holds nothing. Fails while the
    // record outlasts state.clear.
    const { createReminders } = await load<KeptReminders>("reminders");
    const keychain = fakeKeychain();
    const state = stateModule.createStateBridge({ folder, cipher: keychain.cipher, checker });
    await state(stateWrite(A_STATE));
    const planner = createReminders({ folder, cipher: keychain.cipher });
    planner.set(reminders);
    await planner.tick({ date: "2026-10-06", time: "09:00" });
    expect(shown).toHaveLength(1);
    expect(readdirSync(folder).length).toBeGreaterThan(1);

    expect(await state(stateClear)).toEqual({ ...stateClear, ok: true });
    expect(readdirSync(folder)).toEqual([]);
  });

  it("review2_w2p4_2: documents.clear removes the record of shown reminders", async () => {
    // Finding 2: "It is not among the files Delete everything removes." The documents store's
    // clear is the other half of Delete everything (contract clear_call). One document stored
    // and a reminder shown; after clear the folder holds nothing. Fails while the record stays.
    interface Cleared {
      openStore(deps: {
        folder: string;
        cipher: Cipher;
        checker: Checker;
        today: () => string;
      }): Promise<{
        add(paths: readonly string[]): Promise<{ ok: boolean }>;
        clear(): Promise<unknown>;
      }>;
    }
    const { createReminders } = await load<KeptReminders>("reminders");
    const { openStore } = await load<Cleared>("docstore");
    const keychain = fakeKeychain();
    const student = mkdtempSync(join(tmpdir(), "duly-student-"));
    try {
      const file = join(student, "i20.pdf");
      writeFileSync(file, "a scan of the I-20");
      const opened = await openStore({
        folder,
        cipher: keychain.cipher,
        checker: contractChecker(["case", "desktop_documents_bridge"]),
        today: () => "2026-10-06",
      });
      expect(await opened.add([file])).toMatchObject({ ok: true });
      const planner = createReminders({ folder, cipher: keychain.cipher });
      planner.set(reminders);
      await planner.tick({ date: "2026-10-06", time: "09:00" });
      expect(shown).toHaveLength(1);

      expect(await opened.clear()).toEqual({ ok: true });
      expect(readdirSync(folder)).toEqual([]);
    } finally {
      rmSync(student, { recursive: true, force: true });
    }
  });
});
