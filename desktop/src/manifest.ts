/**
 * Main checks the bundled runtime before it starts it (SPEC-W1 point 17).
 *
 * python-manifest.json, written by desktop/scripts/manifest.mjs, holds the SHA-256 of every file
 * under python/ and engine-root/ beside it; a symbolic link is held as "link:<target>". Any
 * changed, missing or extra file refuses the start. This walk and the script's must agree;
 * manifest.test.ts checks that they do.
 */
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";

export const MANIFEST_FOLDERS = ["python", "engine-root"] as const;

/** Every file under the folders, by its path relative to base, with its hash or link target. */
export async function treeHashes(
  base: string,
  folders: readonly string[] = MANIFEST_FOLDERS,
): Promise<Record<string, string>> {
  const found: Record<string, string> = {};
  const walk = async (relative: string): Promise<void> => {
    const path = join(base, relative);
    const entry = await fs.lstat(path);
    if (entry.isSymbolicLink()) {
      found[relative] = `link:${await fs.readlink(path)}`;
    } else if (entry.isDirectory()) {
      for (const name of (await fs.readdir(path)).sort()) await walk(`${relative}/${name}`);
    } else if (entry.isFile()) {
      found[relative] = createHash("sha256")
        .update(await fs.readFile(path))
        .digest("hex");
    } else {
      found[relative] = "other";
    }
  };
  for (const folder of folders) await walk(folder);
  return found;
}

/** The first difference, as a plain line, or null when the files are the ones listed. */
export function firstDifference(
  listed: Readonly<Record<string, string>>,
  found: Readonly<Record<string, string>>,
): string | null {
  for (const name of Object.keys(listed).sort()) {
    if (!(name in found)) return `A file of Duly's engine is missing: ${name}`;
    if (found[name] !== listed[name]) return `A file of Duly's engine has changed: ${name}`;
  }
  for (const name of Object.keys(found).sort()) {
    if (!(name in listed)) return `A file that is not Duly's is in its engine: ${name}`;
  }
  return null;
}

/** Reads the manifest and checks the files beside it. Null when all is as listed. */
export async function checkRuntime(manifestPath: string): Promise<string | null> {
  let listed: unknown;
  try {
    listed = (JSON.parse(await fs.readFile(manifestPath, "utf8")) as { files?: unknown }).files;
  } catch {
    return "Duly could not read the list of its engine's files.";
  }
  if (
    typeof listed !== "object" ||
    listed === null ||
    Object.values(listed).some((v) => typeof v !== "string")
  ) {
    return "Duly could not read the list of its engine's files.";
  }
  let found: Record<string, string>;
  try {
    found = await treeHashes(dirname(manifestPath));
  } catch {
    return "A folder of Duly's engine is missing.";
  }
  return firstDifference(listed as Record<string, string>, found);
}
