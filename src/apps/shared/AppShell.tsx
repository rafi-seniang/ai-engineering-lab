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
  scope: { line: string; detail: string };
  nav: NavItem[];
  sidebarFooter?: ReactNode;
  topbar?: ReactNode;
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
export function AppShell({ product, mark, scope, nav, sidebarFooter, topbar, className, children }: AppShellProps) {
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
          <span className="scope">
            <strong>{scope.line}</strong>
            <span>{scope.detail}</span>
          </span>
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
        </header>

        <main className="sheet">{children}</main>
      </div>
    </div>
  );
}
