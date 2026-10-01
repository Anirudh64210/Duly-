import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SCRIPT = join(__dirname, "..", "scripts", "sign-adhoc.sh");
const MACHO = Buffer.from([0xcf, 0xfa, 0xed, 0xfe, 0, 0, 0, 0]);

let app: string;
let out: string;

function put(rel: string, body: Buffer | string = MACHO): void {
  const path = join(app, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
}

const PY = "Contents/Resources/python";
const FW = "Contents/Frameworks";
const SO = [
  `${PY}/lib/python3.12/lib-dynload/_ssl.cpython-312-darwin.so`,
  `${PY}/site/pydantic_core/_pydantic_core.cpython-312-darwin.so`,
  `${PY}/lib/libpython3.12.dylib`,
];

beforeAll(() => {
  app = join(mkdtempSync(join(tmpdir(), "duly-sign-")), "Duly.app");
  for (const rel of SO) put(rel);
  put(`${PY}/bin/python3.12`);
  put(`${PY}/bin/pip3`, "#!/bin/sh\n");
  put(`${PY}/lib/python3.12/os.py`, "import abc\n");
  put("Contents/Resources/python-manifest.json", "{}");
  put(`${FW}/Electron Framework.framework/Versions/A/Electron Framework`);
  put(`${FW}/Electron Framework.framework/Versions/A/Libraries/libffmpeg.dylib`);
  put(`${FW}/Electron Framework.framework/Versions/A/Resources/en.lproj/locale.pak`, "pak");
  put(`${FW}/Duly Helper (GPU).app/Contents/MacOS/Duly Helper (GPU)`);
  put(`${FW}/Duly Helper.app/Contents/MacOS/Duly Helper`);
  put("Contents/MacOS/Duly");
  const run = spawnSync("bash", [SCRIPT, "--dry-run", app], { encoding: "utf8" });
  expect(run.status, run.stderr).toBe(0);
  out = run.stdout;
});

afterAll(() => rmSync(dirname(app), { recursive: true, force: true }));

/** The signed paths, in order, relative to Duly.app ("" for the app itself). */
function signed(): string[] {
  return out
    .split("\n")
    .filter((line) => line.startsWith("+ codesign --force"))
    .map((line) => {
      const at = line.indexOf(app);
      return line.slice(at + app.length).replace(/^\//, "");
    });
}

describe("sign-adhoc.sh --dry-run (point 21)", () => {
  it("signs ad hoc, hardened, with no timestamp", () => {
    for (const line of out.split("\n").filter((l) => l.startsWith("+ codesign --force"))) {
      expect(line).toContain("--sign - --options runtime --timestamp=none");
    }
  });

  it("lists every .so and .dylib under python once, before the python3 binary", () => {
    const order = signed();
    for (const rel of SO) expect(order.filter((p) => p === rel)).toHaveLength(1);
    const python = order.indexOf(`${PY}/bin/python3.12`);
    expect(python).toBeGreaterThan(-1);
    for (const rel of SO) expect(order.indexOf(rel)).toBeLessThan(python);
  });

  it("signs no script or text file", () => {
    const order = signed();
    expect(order).not.toContain(`${PY}/bin/pip3`);
    expect(order).not.toContain(`${PY}/lib/python3.12/os.py`);
    expect(order.some((p) => p.endsWith(".pak"))).toBe(false);
  });

  it("writes the manifest again after the runtime and before Electron", () => {
    const manifest = out.indexOf("manifest.mjs");
    expect(manifest).toBeGreaterThan(out.indexOf(`${PY}/bin/python3.12`));
    expect(manifest).toBeLessThan(out.indexOf("Electron Framework"));
  });

  it("signs inner before outer, then Duly.app, then verifies", () => {
    const order = signed();
    const at = (rel: string) => order.indexOf(rel);
    const framework = `${FW}/Electron Framework.framework`;
    expect(at(`${framework}/Versions/A/Libraries/libffmpeg.dylib`)).toBeLessThan(at(framework));
    expect(at(`${framework}/Versions/A/Electron Framework`)).toBeLessThan(at(framework));
    const helper = `${FW}/Duly Helper.app`;
    expect(at(`${helper}/Contents/MacOS/Duly Helper`)).toBeLessThan(at(helper));
    expect(at(`${FW}/Duly Helper (GPU).app`)).toBeGreaterThan(-1);
    expect(order[order.length - 1]).toBe("");
    for (const rel of order) expect(order.filter((p) => p === rel)).toHaveLength(1);
    expect(out.trimEnd().split("\n").slice(-2)[0]).toBe(
      `+ codesign --verify --deep --strict --verbose=1 ${app}`,
    );
  });

  it("gives the entitlements to the app bundles only", () => {
    for (const line of out.split("\n").filter((l) => l.startsWith("+ codesign --force"))) {
      const bundle = line.endsWith(".app") || line.endsWith("Duly.app");
      expect(line.includes("--entitlements"), line).toBe(bundle);
    }
  });

  it("takes a signing identity from DULY_SIGN_IDENTITY", () => {
    const run = spawnSync("bash", [SCRIPT, "--dry-run", app], {
      encoding: "utf8",
      env: { ...process.env, DULY_SIGN_IDENTITY: "Duly Local" },
    });
    expect(run.stdout).toContain("--sign Duly Local --options runtime");
  });

  it("refuses a path that is not an app", () => {
    expect(spawnSync("bash", [SCRIPT, "--dry-run", "/nowhere"]).status).toBe(2);
  });
});
