/**
 * The state bridge (SPEC-W2 point 18): the page reads, writes and clears the app's own state
 * through window.duly.state, and main keeps it in <userData>/state.bin, encrypted with the
 * keychain's key and written atomically, as the case bridge keeps case.bin. Main checks the
 * state against $defs/state of contracts/desktop_state_bridge.schema.json on every read and
 * every write. A bad file is refused and kept, never deleted.
 */
import { createFileBridge, mayUseCase, type CaseStoreDeps, type Reply } from "./casefile";

/** The channel the preload asks on. The preload holds its own copy; a test compares them. */
export const STATE_CHANNEL = "duly:state";

export const STATE_FILE = "state.bin";

export const STATE_BRIDGE_ID = "https://duly.local/contracts/desktop_state_bridge.schema.json";

/** The contracts the state bridge checks against: $defs/state refers to the other two. */
export const STATE_CONTRACTS = [
  "case.schema.json",
  "desktop_ask_bridge.schema.json",
  "desktop_state_bridge.schema.json",
] as const;

/** The same rule as the case bridge: only the app's own page, in the main frame. */
export function mayUseState(frameUrl: string | undefined, isMainFrame: boolean): boolean {
  return mayUseCase(frameUrl, isMainFrame);
}

export function createStateBridge(deps: CaseStoreDeps): (message: unknown) => Promise<Reply> {
  return createFileBridge(
    {
      name: "state",
      file: STATE_FILE,
      valueSchema: `${STATE_BRIDGE_ID}#/$defs/state`,
      bridgeSchema: STATE_BRIDGE_ID,
      shapeOnly: {},
    },
    deps,
  );
}
