// Checks the packaged Duly.app holds nothing server-only (SPEC-W1 point 25, steps 1 and 2).
// Called by make desktop-verify from the repository root.
//
//   1. no file or folder named for anthropic, langgraph, langchain, psycopg, sqlalchemy or
//      pydantic_settings anywhere in the bundle (a package or its dist-info); no assistant/
//      folder; no api/main.py, api/settings.py or api/db.py; every file under engine-root is in
//      desktop/python/bundle.json; python-manifest.json matches the files;
//   2. the bundled interpreter, run with -I and the engine's own sys.path, fails to import
//      each forbidden module.
//
//   node desktop/scripts/verify-bundle.mjs [path to Duly.app]
import { spawnSync } from "node:child_process";
import { promises as fs, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import process from "node:process";
import { URL, fileURLToPath, pathToFileURL } from "node:url";

import { treeHashes } from "./manifest.mjs";
import { DEFAULT_APP } from "./read-fuses.mjs";

export const FORBIDDEN_NAMES = [
  "anthropic",
  "langgraph",
  "langchain",
  "psycopg",
  "sqlalchemy",
  "pydantic_settings",
];
export const FORBIDDEN_MODULES = [
  "anthropic",
  "langgraph",
  "langchain_core",
  "psycopg",
  "sqlalchemy",
  "pydantic_settings",
  "assistant",
  "pipeline",
];
const SERVER_ONLY_API = ["api/main.py", "api/settings.py", "api/db.py"];
const LAUNCHER = "duly_engine.py";

export function readAllowlist(
  path = fileURLToPath(new URL("../python/bundle.json", import.meta.url)),
) {
  const data = JSON.parse(readFileSync(path, "utf8"));
  return Array.isArray(data) ? data : [...data.include, ...(data.optional ?? [])];
}

/** A pattern of bundle.json as a test on a repository-relative path. */
function matcher(pattern) {
  const source = pattern
    .split("/")
    .map((part) =>
      part === "**"
        ? ".*"
        : part
            .replace(/[.+^${}()|[\]\\]/g, "\\$&")
            .replaceAll("*", "[^/]*")
            .replaceAll("?", "[^/]"),
    )
    .join("/");
  const exact = new RegExp(`^${source}$`);
  const under = new RegExp(`^${source}/`);
  return (rel) => exact.test(rel) || under.test(rel);
}

/** Is this file under engine-root one the allowlist lets in? */
export function allowedInEngineRoot(rel, patterns) {
  let source = rel;
  const compiled = /^(.*\/)?__pycache__\/([^/.]+)\.[^/]+\.pyc$/.exec(rel);
  if (compiled) source = `${compiled[1] ?? ""}${compiled[2]}.py`;
  // The launcher sits at the top of engine-root, and only there.
  if (source === LAUNCHER) return patterns.some((p) => posix.basename(p) === LAUNCHER);
  if (posix.basename(source) === LAUNCHER) return false;
  // An agent's work log never ships, whatever pattern takes its folder.
  if (["PROGRESS.md", "REPORT.json"].includes(posix.basename(source))) return false;
  return patterns.some((p) => matcher(p)(source));
}

async function walk(base, relative = "") {
  const found = [];
  for (const name of (await fs.readdir(join(base, relative))).sort()) {
    const rel = relative === "" ? name : `${relative}/${name}`;
    const entry = await fs.lstat(join(base, rel));
    found.push({ rel, folder: entry.isDirectory() });
    if (entry.isDirectory()) found.push(...(await walk(base, rel)));
  }
  return found;
}

/** Every problem found in the bundle, as plain lines; none when it is clean. */
export async function checkBundle(app, patterns = readAllowlist()) {
  const problems = [];
  const resources = join(app, "Contents", "Resources");
  for (const { rel, folder } of await walk(app)) {
    const name = posix.basename(rel).toLowerCase().replaceAll("-", "_");
    const hit = FORBIDDEN_NAMES.find((n) => name.startsWith(n));
    if (hit !== undefined) problems.push(`server-only ${hit} in the bundle: ${rel}`);
    if (folder && name === "assistant") problems.push(`an assistant folder in the bundle: ${rel}`);
  }
  const engineRoot = join(resources, "engine-root");
  let engineFiles = [];
  try {
    engineFiles = (await walk(engineRoot)).filter((e) => !e.folder).map((e) => e.rel);
  } catch {
    problems.push("no engine-root in Resources");
  }
  for (const rel of SERVER_ONLY_API) {
    if (engineFiles.includes(rel)) problems.push(`server-only ${rel} in engine-root`);
  }
  for (const rel of engineFiles) {
    if (!allowedInEngineRoot(rel, patterns))
      problems.push(`not in bundle.json: engine-root/${rel}`);
  }
  try {
    const listed = JSON.parse(await fs.readFile(join(resources, "python-manifest.json"), "utf8"));
    const found = await treeHashes(resources);
    const names = new Set([...Object.keys(listed.files ?? {}), ...Object.keys(found)]);
    for (const rel of [...names].sort()) {
      if (listed.files?.[rel] !== found[rel])
        problems.push(`python-manifest.json differs at ${rel}`);
    }
  } catch (error) {
    problems.push(`python-manifest.json could not be checked: ${String(error)}`);
  }
  return problems;
}

/** Step 2: each forbidden module fails to import in the bundled interpreter. */
export function importProblems(app, run = spawnSync) {
  const resources = join(app, "Contents", "Resources");
  const python = join(resources, "python", "bin", "python3");
  const paths = JSON.stringify([join(resources, "engine-root"), join(resources, "python", "site")]);
  const problems = [];
  for (const module of FORBIDDEN_MODULES) {
    const code = `import sys; sys.path[:0] = ${paths}; import ${module}`;
    const done = run(python, ["-I", "-B", "-c", code], { encoding: "utf8" });
    if (done.error !== undefined) problems.push(`the bundled python did not run: ${done.error}`);
    else if (done.status === 0) problems.push(`the bundled python imports ${module}`);
  }
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const app = process.argv[2] ?? DEFAULT_APP;
  const problems = [...(await checkBundle(app)), ...importProblems(app)];
  for (const line of problems) process.stderr.write(`verify-bundle: ${line}\n`);
  if (problems.length > 0) process.exit(1);
  process.stdout.write("verify-bundle: the bundle holds only what bundle.json lets in\n");
}
