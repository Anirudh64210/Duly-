import { readFileSync } from "node:fs";
import { join } from "node:path";

import { FuseState, FuseV1Options, FuseVersion } from "@electron/fuses";
import { describe, expect, it } from "vitest";

import config, { CONTRACTS, TARGET, bundleId, leftOut } from "../forge.config";
import { FUSES, differences } from "../scripts/read-fuses.mjs";
import { ENGINE_CONTRACTS } from "./enginebridge";
import { STATE_CONTRACTS } from "./statefile";

const DESKTOP = join(__dirname, "..");

/** SPEC-W1 point 20, as the table reads. */
const TABLE: [keyof typeof FuseV1Options, boolean][] = [
  ["RunAsNode", false],
  ["EnableNodeOptionsEnvironmentVariable", false],
  ["EnableNodeCliInspectArguments", false],
  ["GrantFileProtocolExtraPrivileges", false],
  ["EnableEmbeddedAsarIntegrityValidation", true],
  ["OnlyLoadAppFromAsar", true],
  ["EnableCookieEncryption", true],
];

describe("the Forge config (point 18)", () => {
  const packager = config.packagerConfig ?? {};

  it("names the app Duly, with the bundle id from app.json, in an asar", () => {
    expect(packager.name).toBe("Duly");
    expect(packager.executableName).toBe("Duly");
    expect(packager.appBundleId).toBe(bundleId());
    expect(bundleId()).toBe(
      (JSON.parse(readFileSync(join(DESKTOP, "app.json"), "utf8")) as { appId: string }).appId,
    );
    expect(packager.asar).toBe(true);
  });

  it("keeps the runtime, the engine and the manifest outside the asar", () => {
    expect(packager.extraResource).toEqual([
      join(DESKTOP, "build", "python"),
      join(DESKTOP, "build", "engine-root"),
      join(DESKTOP, "build", "python-manifest.json"),
    ]);
  });

  it("makes a DMG and a ZIP, for darwin arm64 only", () => {
    const makers = (config.makers ?? []) as { name: string; platforms: string[] }[];
    expect(makers.map((m) => m.name)).toEqual(["dmg", "zip"]);
    for (const maker of makers) expect(maker.platforms).toEqual(["darwin"]);
    expect(TARGET).toEqual({ platform: "darwin", arch: "arm64" });
  });

  it("refuses to package for another platform or arch, or before the bundle id is chosen", async () => {
    const prePackage = config.hooks?.prePackage;
    expect(prePackage).toBeDefined();
    const resolved = {} as Parameters<NonNullable<typeof prePackage>>[0];
    await expect(prePackage?.(resolved, "win32", "x64")).rejects.toThrow(/darwin arm64/);
    await expect(prePackage?.(resolved, "darwin", "x64")).rejects.toThrow(/darwin arm64/);
    const chosen = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/.test(bundleId());
    const asked = prePackage?.(resolved, "darwin", "arm64");
    if (chosen) await expect(asked).resolves.toBeUndefined();
    else await expect(asked).rejects.toThrow(/bundle id/);
  });

  it("puts only the compiled app and package.json from this folder into the asar", () => {
    for (const kept of ["", "/package.json", "/dist", "/dist/main.js"]) {
      expect(leftOut(kept), kept).toBe(false);
    }
    for (const left of [
      "/src",
      "/src/main.ts",
      "/scripts",
      "/build",
      "/python",
      "/out",
      "/node_modules",
      "/distx",
      "/app.json",
    ]) {
      expect(leftOut(left), left).toBe(true);
    }
    // Every schema a bridge reads in main, and no other.
    const read = ["case.schema.json", "desktop_case_bridge.schema.json"];
    expect([...CONTRACTS].sort()).toEqual(
      [...new Set([...read, ...ENGINE_CONTRACTS, ...STATE_CONTRACTS])].sort(),
    );
  });
});

describe("the fuses (point 20)", () => {
  it("are exactly the SPEC's table, set through the Forge fuses plugin", () => {
    expect(Object.entries(FUSES)).toEqual(TABLE);
    const plugins = (config.plugins ?? []) as {
      name: string;
      fusesConfig?: Record<string, unknown>;
    }[];
    expect(plugins.map((p) => p.name)).toEqual(["fuses"]);
    const wanted: Record<string, unknown> = {
      version: FuseVersion.V1,
      resetAdHocDarwinSignature: true,
    };
    for (const [name, on] of TABLE) wanted[String(FuseV1Options[name])] = on;
    expect(plugins[0]?.fusesConfig).toEqual(wanted);
  });

  it("read back as set pass, and one fuse wrong fails (read-fuses.mjs)", () => {
    const wire: Record<number, FuseState> = {};
    for (const [name, on] of TABLE) {
      wire[FuseV1Options[name]] = on ? FuseState.ENABLE : FuseState.DISABLE;
    }
    expect(differences(wire, FuseV1Options, FuseState)).toEqual([]);
    expect(
      differences(
        { ...wire, [FuseV1Options.RunAsNode]: FuseState.ENABLE },
        FuseV1Options,
        FuseState,
      ),
    ).toEqual(["RunAsNode: wanted off, read on"]);
    const removed = Object.fromEntries(
      Object.entries(wire).filter(([index]) => Number(index) !== FuseV1Options.OnlyLoadAppFromAsar),
    );
    expect(differences(removed, FuseV1Options, FuseState)).toEqual([
      "OnlyLoadAppFromAsar: wanted on, read nothing",
    ]);
  });
});
