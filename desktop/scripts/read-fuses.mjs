// Reads the fuses back from the packaged Duly binary and fails on any difference from the table
// of SPEC-W1 point 20. forge.config.ts sets the fuses from the same table. Called by
// make desktop-verify from the repository root.
//
//   node desktop/scripts/read-fuses.mjs [path to Duly.app]
import { join } from "node:path";
import process from "node:process";
import { URL, fileURLToPath, pathToFileURL } from "node:url";

/** SPEC-W1 point 20, by the names @electron/fuses gives them. */
export const FUSES = {
  RunAsNode: false,
  EnableNodeOptionsEnvironmentVariable: false,
  EnableNodeCliInspectArguments: false,
  GrantFileProtocolExtraPrivileges: false,
  EnableEmbeddedAsarIntegrityValidation: true,
  OnlyLoadAppFromAsar: true,
  EnableCookieEncryption: true,
};

export const DEFAULT_APP = fileURLToPath(
  new URL("../out/Duly-darwin-arm64/Duly.app", import.meta.url),
);

/**
 * The differences between a read-out and the table. `wire` is what getCurrentFuseWire gives:
 * fuse index to a state, and `options` maps each name to its index (FuseV1Options).
 */
export function differences(wire, options, states) {
  const found = [];
  for (const [name, wanted] of Object.entries(FUSES)) {
    const index = options[name];
    const state = index === undefined ? undefined : wire[index];
    const want = wanted ? states.ENABLE : states.DISABLE;
    if (state !== want) {
      found.push(`${name}: wanted ${wanted ? "on" : "off"}, read ${describe(state, states)}`);
    }
  }
  return found;
}

function describe(state, states) {
  if (state === states.ENABLE) return "on";
  if (state === states.DISABLE) return "off";
  return "nothing";
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { FuseState, FuseV1Options, getCurrentFuseWire } = await import("@electron/fuses");
  const app = process.argv[2] ?? DEFAULT_APP;
  const wire = await getCurrentFuseWire(join(app, "Contents", "MacOS", "Duly"));
  const found = differences(wire, FuseV1Options, FuseState);
  for (const line of found) process.stderr.write(`read-fuses: ${line}\n`);
  if (found.length > 0) process.exit(1);
  process.stdout.write(`read-fuses: the ${Object.keys(FUSES).length} fuses are as set\n`);
}
