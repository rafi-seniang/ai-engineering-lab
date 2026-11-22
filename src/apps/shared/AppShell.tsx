import { type ReactNode, useState } from "react";
import { Link } from "react-router";
import "./app-shell.css";

export interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
  count?: number;
  current?: boolean;
}

interface AppShellProps {
  product: string;
  mark: ReactNode;
  /** A line under the brand. Left out on screens whose page title already says what the app does */
  scope?: { line: string; detail: string };
  nav: NavItem[];
  /** Controls under the navigation, such as a screen's modes */
  sidebar?: ReactNode;
  sidebarFooter?: ReactNode;
  topbar?: ReactNode;
  /** The app's section of the guide (/guide#id): a visible "How it works" link in the top bar */
  guide?: string;
  className?: string;
  children: ReactNode;
}

const BACK_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M10 3.5 5.5 8 10 12.5" />
    <path d="M6 8h7.5" />
  </svg>
);

/** The frame every project screen sits in: the tinted L of sidebar and top bar, and the white sheet. */
export function AppShell({
  product,
  mark,
  scope,
  nav,
  sidebar,
  sidebarFooter,
  topbar,
  guide,
  className,
  children,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={`app-shell${className ? ` ${className}` : ""}`}>
      <div className="app">
        <aside className={`sidebar${menuOpen ? " open" : ""}`} aria-label="Navigation">
          <Link className="btn back-lobby" to="/" onClick={() => setMenuOpen(false)}>
            {BACK_ICON}
            Back to lobby
          </Link>
          <div className="brand">
            {mark}
            {product}
            <button
              className="btn ghost menu-close"
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation"
            >
              Close
            </button>
          </div>
          {scope ? (
            <span className="scope">
              <strong>{scope.line}</strong>
              <span>{scope.detail}</span>
            </span>
          ) : (
            <span className="scope-gap" />
          )}
          {nav.map((item) => (
            <Link
              key={item.to}
              className="nav-item"
              to={item.to}
              aria-current={item.current ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {item.icon}
              {item.label}
              {item.count ? <span className="count">{item.count}</span> : null}
            </Link>
          ))}
          {sidebar}
          {sidebarFooter && <div className="bottom">{sidebarFooter}</div>}
        </aside>

        <header className="topbar">
          <button
            className="btn ghost menu-toggle"
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-label="Open navigation"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M2 4h12M2 8h12M2 12h12" />
            </svg>
          </button>
          <span className="brand-short">
            {mark}
            {product}
          </span>
          {topbar}
          {guide && (
            <Link className="guide-link" to={`/guide#${guide}`}>
              How it works
            </Link>
          )}
        </header>

        <main className="sheet">{children}</main>
      </div>
    </div>
  );
}
