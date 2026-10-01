// Writes python-manifest.json (SPEC-W1 points 15 and 17): the SHA-256 of every file under
// python/ and engine-root/ in a folder, a symbolic link as "link:<target>", and the tzdata
// version. build-python.sh calls it over desktop/build; sign-adhoc.sh calls it again over the
// app's Resources once the runtime is signed, since signing changes the binaries' bytes, and
// keeps the tzdata version already written there.
// desktop/src/manifest.ts reads the same walk at launch; manifest.test.ts checks they agree.
//
//   node manifest.mjs <folder> [tzdata version]
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const MANIFEST_FOLDERS = ["python", "engine-root"];

export async function treeHashes(base, folders = MANIFEST_FOLDERS) {
  const found = {};
  const walk = async (relative) => {
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

export async function writeManifest(base, tzdata) {
  const files = await treeHashes(base);
  const text = `${JSON.stringify({ tzdata, files }, null, 2)}\n`;
  await fs.writeFile(join(base, "python-manifest.json"), text);
  return Object.keys(files).length;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [base, given] = process.argv.slice(2);
  if (base === undefined) {
    process.stderr.write("usage: node manifest.mjs <folder> [tzdata version]\n");
    process.exit(2);
  }
  const tzdata =
    given ?? JSON.parse(await fs.readFile(join(base, "python-manifest.json"), "utf8")).tzdata;
  if (typeof tzdata !== "string" || tzdata === "") {
    process.stderr.write("manifest.mjs: no tzdata version\n");
    process.exit(2);
  }
  const count = await writeManifest(base, tzdata);
  process.stdout.write(`python-manifest.json: ${count} files\n`);
}
