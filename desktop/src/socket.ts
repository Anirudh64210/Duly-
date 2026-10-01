/**
 * Where the engine's socket lives, and the checks on it (SPEC-W1 points 6 and 8).
 *
 * Every function takes the file system it works on, so the tests run them over a fake one.
 */
import { randomBytes } from "node:crypto";
import { join } from "node:path";

/** macOS limits a socket path to 103 bytes. */
export const SOCKET_PATH_MAX = 103;
export const SOCKET_NAME = "engine.sock";
export const FOLDER_MODE = 0o700;

/** What the checks read from lstat. */
export interface Entry {
  uid: number;
  mode: number;
  isDirectory(): boolean;
  isSocket(): boolean;
  isSymbolicLink(): boolean;
}

/** The part of node:fs the socket folder needs. */
export interface FolderFs {
  lstatSync(path: string, options: { throwIfNoEntry: false }): Entry | undefined;
  mkdirSync(path: string, options: { mode: number }): unknown;
  chmodSync(path: string, mode: number): void;
  rmSync(path: string, options: { recursive: true; force: true }): void;
}

export interface SocketPlace {
  folder: string;
  socket: string;
  /** A fresh folder under the temporary folder, removed on quit. */
  temporary: boolean;
}

export function fitsSocketPath(path: string): boolean {
  return Buffer.byteLength(path, "utf8") <= SOCKET_PATH_MAX;
}

/**
 * `<userData>/run/engine.sock`, or, when that path is over 103 bytes,
 * `<tmpdir>/duly-<16 random hex>/engine.sock`.
 */
export function socketPlace(
  userData: string,
  tmpdir: string,
  random: () => string = () => randomBytes(8).toString("hex"),
): SocketPlace {
  const run = join(userData, "run");
  if (fitsSocketPath(join(run, SOCKET_NAME))) {
    return { folder: run, socket: join(run, SOCKET_NAME), temporary: false };
  }
  const hex = random();
  if (!/^[0-9a-f]{16}$/.test(hex)) throw new Error("the folder name needs 16 random hex digits");
  const folder = join(tmpdir, `duly-${hex}`);
  const socket = join(folder, SOCKET_NAME);
  if (!fitsSocketPath(socket)) throw new Error("no folder for the engine's socket is short enough");
  return { folder, socket, temporary: true };
}

/** A folder, not a link, owned by this user, mode 0700. */
export function folderIsSafe(entry: Entry | undefined, uid: number): boolean {
  return (
    entry !== undefined &&
    !entry.isSymbolicLink() &&
    entry.isDirectory() &&
    entry.uid === uid &&
    (entry.mode & 0o777) === FOLDER_MODE
  );
}

/**
 * Makes the folder 0700, or checks the one there. A folder that fails the check is removed and
 * made again; if it still fails, this throws and the engine is not started.
 */
export function prepareFolder(fs: FolderFs, place: SocketPlace, uid: number): void {
  const found = fs.lstatSync(place.folder, { throwIfNoEntry: false });
  if (place.temporary && found !== undefined) {
    throw new Error("the engine's temporary folder is already there");
  }
  if (found !== undefined && !folderIsSafe(found, uid)) {
    fs.rmSync(place.folder, { recursive: true, force: true });
  }
  if (found === undefined || !folderIsSafe(found, uid)) {
    fs.mkdirSync(place.folder, { mode: FOLDER_MODE });
    fs.chmodSync(place.folder, FOLDER_MODE);
  }
  if (!folderIsSafe(fs.lstatSync(place.folder, { throwIfNoEntry: false }), uid)) {
    throw new Error("the engine's folder is not this user's alone");
  }
}

export type SocketCheck = "missing" | "safe" | "refused";

/** Before main talks to it: a socket, owned by this user, mode & 0o077 == 0. */
export function checkSocket(entry: Entry | undefined, uid: number): SocketCheck {
  if (entry === undefined) return "missing";
  const safe =
    !entry.isSymbolicLink() && entry.isSocket() && entry.uid === uid && (entry.mode & 0o077) === 0;
  return safe ? "safe" : "refused";
}
