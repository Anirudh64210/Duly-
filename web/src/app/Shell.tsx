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
import { useState } from "react";

import { useStore } from "./caseStore";
import { Home } from "./Home";
import { Onboarding } from "./Onboarding";
import { Feedback, Settings, Updates, YourCase } from "./Pages";

// design-1 section 3.1: the sidebar lists only screens that exist, in the canvas order.
export const NAV = [
  { to: "/", label: "Home" },
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
const routes = [
  createRoute({ getParentRoute: () => root, path: "/", component: Home }),
  createRoute({ getParentRoute: () => root, path: "/updates", component: () => <Updates /> }),
  createRoute({ getParentRoute: () => root, path: "/case", component: YourCase }),
  createRoute({ getParentRoute: () => root, path: "/settings", component: Settings }),
  createRoute({ getParentRoute: () => root, path: "/feedback", component: Feedback }),
  createRoute({ getParentRoute: () => root, path: "/welcome", component: Onboarding }),
];

export function createAppRouter(history: RouterHistory) {
  return createRouter({ routeTree: root.addChildren(routes), history });
}
