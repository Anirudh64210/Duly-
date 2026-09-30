import { insideTheApp } from "./about";

/**
 * The hosts of primary sources. A copy of PRIMARY_HOSTS in tools/sources/verify.py;
 * guard.test.ts reads that file and fails when the two lists differ.
 */
export const PRIMARY_HOSTS: readonly string[] = [
  "www.ecfr.gov",
  "www.federalregister.gov",
  "www.govinfo.gov",
  "www.uscis.gov",
  "studyinthestates.dhs.gov",
  "www.ice.gov",
  "travel.state.gov",
  "www.whitehouse.gov",
  "www.courtlistener.com",
  "www.reginfo.gov",
  "www.dol.gov",
  "flag.dol.gov",
  "uscode.house.gov",
];

/**
 * May this link be opened in the person's own browser? Only https, only a primary
 * source, no user name or password in it, and no port other than the usual one.
 */
export function mayOpenOutside(address: string): boolean {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    url.username === "" &&
    url.password === "" &&
    url.port === "" &&
    PRIMARY_HOSTS.includes(url.hostname)
  );
}

/** What the window does when its page asks to go somewhere. */
export type Navigation = "stay" | "open_outside" | "refuse";

/**
 * A page inside the app may load. A primary source opens in the person's browser.
 * Everything else is refused.
 */
export function decideNavigation(address: string): Navigation {
  if (insideTheApp(address)) return "stay";
  if (mayOpenOutside(address)) return "open_outside";
  return "refuse";
}

/**
 * A frame inside the page may load only pages of the app. It never opens anything
 * outside; that is left to the page itself, through decideNavigation.
 */
export function decideFrameNavigation(address: string): "stay" | "refuse" {
  return insideTheApp(address) ? "stay" : "refuse";
}

/**
 * window.open never makes a new window. A primary source opens in the person's
 * browser instead; anything else is dropped.
 */
export function decideNewWindow(address: string): "open_outside" | "refuse" {
  return mayOpenOutside(address) ? "open_outside" : "refuse";
}

/** Every permission (camera, microphone, location, notifications and the rest) is refused. */
export function decidePermission(permission: string): false {
  void permission;
  return false;
}

/** The window's settings. Nothing here is taken from the screen. */
export const WINDOW = {
  title: "Duly",
  width: 1200,
  height: 860,
  minWidth: 900,
  minHeight: 600,
} as const;

/** The settings every page of the app runs under. */
export function webPreferences(preload: string, version: string) {
  return {
    preload,
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
    experimentalFeatures: false,
    spellcheck: false,
    additionalArguments: [versionArgument(version)],
  };
}

export const VERSION_FLAG = "--duly-version=";

export function versionArgument(version: string): string {
  return `${VERSION_FLAG}${version}`;
}
