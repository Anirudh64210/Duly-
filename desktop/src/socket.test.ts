import { describe, expect, it } from "vitest";

import {
  SOCKET_PATH_MAX,
  checkSocket,
  fitsSocketPath,
  folderIsSafe,
  prepareFolder,
  socketPlace,
  type Entry,
  type FolderFs,
} from "./socket";

const ME = 501;

function entry(kind: "dir" | "link" | "socket" | "file", mode: number, uid = ME): Entry {
  return {
    uid,
    mode,
    isDirectory: () => kind === "dir",
    isSocket: () => kind === "socket",
    isSymbolicLink: () => kind === "link",
  };
}

/** A file system of one folder at most, recording what was done to it. */
function fakeFs(start: Entry | undefined, made: Entry = entry("dir", 0o40700)) {
  let current = start;
  const done: string[] = [];
  const fs: FolderFs = {
    lstatSync: () => current,
    mkdirSync: (_path, options) => {
      done.push(`mkdir ${options.mode.toString(8)}`);
      current = made;
    },
    chmodSync: (_path, mode) => {
      done.push(`chmod ${mode.toString(8)}`);
    },
    rmSync: () => {
      done.push("rm");
      current = undefined;
    },
  };
  return { fs, done };
}

const USER_DATA = "/Users/ani/Library/Application Support/Duly";

describe("where the socket lives (point 6)", () => {
  it("is <userData>/run/engine.sock when the path fits", () => {
    expect(socketPlace(USER_DATA, "/tmp")).toEqual({
      folder: `${USER_DATA}/run`,
      socket: `${USER_DATA}/run/engine.sock`,
      temporary: false,
    });
  });

  it("allows 103 bytes and no more, counted in bytes", () => {
    expect(SOCKET_PATH_MAX).toBe(103);
    expect(fitsSocketPath(`/${"a".repeat(102)}`)).toBe(true);
    expect(fitsSocketPath(`/${"a".repeat(103)}`)).toBe(false);
    expect(fitsSocketPath(`/${"é".repeat(51)}`)).toBe(true);
    expect(fitsSocketPath(`/${"é".repeat(51)}a`)).toBe(false);
  });

  it("moves to a fresh duly-<16 hex> folder under tmpdir when the path is too long", () => {
    const long = `/Users/${"n".repeat(80)}/Library/Application Support/Duly`;
    const place = socketPlace(long, "/var/folders/xy/T", () => "0123456789abcdef");
    expect(place).toEqual({
      folder: "/var/folders/xy/T/duly-0123456789abcdef",
      socket: "/var/folders/xy/T/duly-0123456789abcdef/engine.sock",
      temporary: true,
    });
  });

  it("uses real random hex by default and refuses anything else", () => {
    const long = `/${"n".repeat(120)}`;
    expect(socketPlace(long, "/tmp").folder).toMatch(/^\/tmp\/duly-[0-9a-f]{16}$/);
    expect(() => socketPlace(long, "/tmp", () => "../../etc")).toThrow();
  });

  it("refuses when even the temporary path is too long", () => {
    expect(() => socketPlace(`/${"n".repeat(120)}`, `/${"t".repeat(90)}`)).toThrow();
  });
});

describe("the socket folder's checks (point 6)", () => {
  it("is safe only as this user's own 0700 folder, not a link", () => {
    expect(folderIsSafe(entry("dir", 0o40700), ME)).toBe(true);
    expect(folderIsSafe(undefined, ME)).toBe(false);
    expect(folderIsSafe(entry("dir", 0o40755), ME)).toBe(false);
    expect(folderIsSafe(entry("dir", 0o40770), ME)).toBe(false);
    expect(folderIsSafe(entry("dir", 0o40700, 0), ME)).toBe(false);
    expect(folderIsSafe(entry("link", 0o120700), ME)).toBe(false);
    expect(folderIsSafe(entry("file", 0o100700), ME)).toBe(false);
  });

  it("makes a missing folder with 0700", () => {
    const { fs, done } = fakeFs(undefined);
    prepareFolder(fs, socketPlace(USER_DATA, "/tmp"), ME);
    expect(done).toEqual(["mkdir 700", "chmod 700"]);
  });

  it("leaves a safe folder as it is", () => {
    const { fs, done } = fakeFs(entry("dir", 0o40700));
    prepareFolder(fs, socketPlace(USER_DATA, "/tmp"), ME);
    expect(done).toEqual([]);
  });

  it("removes and makes again a folder that is open, not ours, or a link", () => {
    for (const bad of [entry("dir", 0o40777), entry("dir", 0o40700, 0), entry("link", 0o120700)]) {
      const { fs, done } = fakeFs(bad);
      prepareFolder(fs, socketPlace(USER_DATA, "/tmp"), ME);
      expect(done).toEqual(["rm", "mkdir 700", "chmod 700"]);
    }
  });

  it("throws when the folder made is still not safe", () => {
    const { fs } = fakeFs(undefined, entry("dir", 0o40755));
    expect(() => prepareFolder(fs, socketPlace(USER_DATA, "/tmp"), ME)).toThrow();
  });

  it("never takes over a temporary folder that is already there", () => {
    const { fs, done } = fakeFs(entry("dir", 0o40700));
    const place = socketPlace(`/${"n".repeat(120)}`, "/tmp");
    expect(() => prepareFolder(fs, place, ME)).toThrow();
    expect(done).toEqual([]);
  });
});

describe("main's check before it talks to the socket (point 8)", () => {
  it("passes this user's socket with no group or world bits", () => {
    expect(checkSocket(entry("socket", 0o140600), ME)).toBe("safe");
    expect(checkSocket(entry("socket", 0o140700), ME)).toBe("safe");
  });

  it("waits while there is no socket yet", () => {
    expect(checkSocket(undefined, ME)).toBe("missing");
  });

  it("refuses each other case", () => {
    for (const bad of [
      entry("socket", 0o140666),
      entry("socket", 0o140640),
      entry("socket", 0o140602),
      entry("socket", 0o140600, 0),
      entry("link", 0o120600),
      entry("file", 0o100600),
      entry("dir", 0o40700),
    ]) {
      expect(checkSocket(bad, ME)).toBe("refused");
    }
  });
});
