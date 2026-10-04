/**
 * Packaging with Electron Forge (SPEC-W1 points 18 to 21). make desktop-package runs
 * `electron-forge make` from this folder, after make desktop-python has filled build/.
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerZIP } from "@electron-forge/maker-zip";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import type { ForgeConfig } from "@electron-forge/shared-types";

import { FUSES } from "./scripts/read-fuses.mjs";

const HERE = __dirname;
const ROOT = join(HERE, "..");

/** W1 builds for the founder's Mac only: Apple silicon. */
export const TARGET = { platform: "darwin", arch: "arm64" } as const;

/**
 * The schemas the bridges read (casefile.ts, enginebridge.ts, statefile.ts), copied into
 * app.asar beside the screen.
 */
export const CONTRACTS = [
  "case.schema.json",
  "desktop_case_bridge.schema.json",
  "engine_output.schema.json",
  "schedule.schema.json",
  "update.schema.json",
  "desktop_engine_bridge.schema.json",
  "desktop_ask_bridge.schema.json",
  "desktop_state_bridge.schema.json",
] as const;

/** The bundle id, from desktop/app.json (point 31). */
export function bundleId(path: string = join(HERE, "app.json")): string {
  return (JSON.parse(readFileSync(path, "utf8")) as { appId: string }).appId;
}

/** Only the compiled main and preload, and package.json, go into app.asar from this folder. */
export function leftOut(path: string): boolean {
  return !(
    path === "" ||
    path === "/package.json" ||
    path === "/dist" ||
    path.startsWith("/dist/")
  );
}

const fuses = Object.fromEntries(
  Object.entries(FUSES).map(([name, on]) => [
    FuseV1Options[name as keyof typeof FuseV1Options],
    on,
  ]),
);

const config: ForgeConfig = {
  packagerConfig: {
    name: "Duly",
    executableName: "Duly",
    appBundleId: bundleId(),
    asar: true,
    ignore: leftOut,
    // Outside app.asar, because a spawned binary cannot live in it.
    extraResource: [
      join(HERE, "build", "python"),
      join(HERE, "build", "engine-root"),
      join(HERE, "build", "python-manifest.json"),
    ],
  },
  makers: [new MakerDMG({}, [TARGET.platform]), new MakerZIP({}, [TARGET.platform])],
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      resetAdHocDarwinSignature: true,
      ...fuses,
    }),
  ],
  hooks: {
    prePackage: async (_config, platform, arch) => {
      if (platform !== TARGET.platform || arch !== TARGET.arch) {
        throw new Error(`W1 packages for darwin arm64 only, not ${platform} ${arch}`);
      }
      if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/.test(bundleId())) {
        throw new Error("Choose the bundle id in desktop/app.json first (SPEC-W1 point 31)");
      }
    },
    // The screen and the bridges' schemas, inside app.asar (point 18).
    packageAfterCopy: async (_config, buildPath) => {
      cpSync(join(ROOT, "web", "dist"), join(buildPath, "web"), { recursive: true });
      mkdirSync(join(buildPath, "contracts"), { recursive: true });
      for (const name of CONTRACTS) {
        cpSync(join(ROOT, "contracts", name), join(buildPath, "contracts", name));
      }
    },
    // Signed after the fuses are set and before the DMG is made (point 21).
    postPackage: async (_config, result) => {
      for (const folder of result.outputPaths) {
        execFileSync("bash", [join(HERE, "scripts", "sign-adhoc.sh"), join(folder, "Duly.app")], {
          stdio: "inherit",
        });
      }
    },
  },
};

export default config;
