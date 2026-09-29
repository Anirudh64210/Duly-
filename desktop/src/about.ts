/** What the app is called, in the window's title and in the menu. */
export const APP_NAME = "Duly";

/** The scheme the screen is served from. Nothing is loaded from any other. */
export const APP_SCHEME = "duly";
export const APP_ORIGIN = `${APP_SCHEME}://app`;

/** Is this address inside the app? Anything else is never loaded in the window. */
export function insideTheApp(address: string): boolean {
  try {
    const url = new URL(address);
    return url.protocol === `${APP_SCHEME}:` && url.host === "app";
  } catch {
    return false;
  }
}
