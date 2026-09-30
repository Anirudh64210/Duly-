// specs/desktop-1/SPEC.md, the screen: requests go to `api/` relative to the page, so the
// same build answers from duly://app/index.html and from http://localhost:5173/.

/** The request path for an api route such as `/v1/status`, relative to the page. */
export function apiPath(route: `/${string}`): string {
  return `api${route}`;
}
