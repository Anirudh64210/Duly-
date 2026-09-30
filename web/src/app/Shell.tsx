import {
  Link,
  Navigate,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
  type RouterHistory,
} from "@tanstack/react-router";
import { useState, type ComponentType } from "react";

import { SHOT_SCREENS, type ShotScreen } from "../lib/shots";
import { useStore } from "./caseStore";
import { Checklists } from "./Checklists";
import { Home } from "./Home";
import { Onboarding } from "./Onboarding";
import { Feedback, Settings, Updates, YourCase } from "./Pages";
import { Timeline } from "./Timeline";

// design-1 section 3.1: the sidebar lists only screens that exist, in the canvas order.
export const NAV = [
  { to: "/", label: "Home" },
  { to: "/timeline", label: "Timeline" },
  { to: "/checklists", label: "Checklists" },
  { to: "/updates", label: "Updates" },
] as const;
export const NAV_BOTTOM = [
  { to: "/case", label: "Your case" },
  { to: "/settings", label: "Settings" },
  { to: "/feedback", label: "Feedback" },
] as const;

function NavLinks({ onPick }: { onPick?: () => void }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const link = (item: { to: string; label: string }) => (
    <Link
      key={item.to}
      to={item.to}
      className="nav-item"
      aria-current={path === item.to ? "page" : undefined}
      onClick={onPick}
    >
      {item.label}
    </Link>
  );
  return (
    <>
      <div className="nav-group">{NAV.map(link)}</div>
      <div className="nav-spacer" />
      <div className="nav-group">{NAV_BOTTOM.map(link)}</div>
    </>
  );
}

function Frame() {
  const { held } = useStore();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [menu, setMenu] = useState(false);
  if (path === "/welcome") return <Outlet />;
  if (held === null || !held.onboarded) return <Navigate to="/welcome" />;
  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Duly">
        <p className="wordmark">
          Duly<span className="dot">.</span>
        </p>
        <NavLinks />
      </nav>
      <div className="topbar">
        <p className="wordmark">
          Duly<span className="dot">.</span>
        </p>
        <button
          type="button"
          className="text-button"
          aria-expanded={menu}
          onClick={() => setMenu((now) => !now)}
        >
          Menu
        </button>
        {menu && (
          <nav className="topbar-menu" aria-label="Duly menu">
            <NavLinks onPick={() => setMenu(false)} />
          </nav>
        )}
      </div>
      <main className="main" key={path}>
        <Outlet />
      </main>
    </div>
  );
}

const root = createRootRoute({
  component: Frame,
  notFoundComponent: () => <Navigate to="/" />,
});
// resolutions point 20: the router is built from SHOT_SCREENS, the table each screen's
// landmark is read from, so a screen's landmark is its route.
const SCREENS = {
  "/": Home,
  "/timeline": Timeline,
  "/checklists": Checklists,
  "/updates": () => <Updates />,
  "/case": YourCase,
  "/settings": Settings,
  "/feedback": Feedback,
  "/welcome": Onboarding,
} as const satisfies Record<ShotScreen, ComponentType>;

const routes = SHOT_SCREENS.map((path) =>
  createRoute({ getParentRoute: () => root, path, component: SCREENS[path] }),
);

export function createAppRouter(history: RouterHistory) {
  return createRouter({ routeTree: root.addChildren(routes), history });
}
