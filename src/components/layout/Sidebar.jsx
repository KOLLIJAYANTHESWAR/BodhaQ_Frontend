import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  {
    to: '/',
    label: 'Home',
    exact: true,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to: '/study',
    label: 'Study',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
  },
  {
    to: '/materials',
    label: 'Materials',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    to: '/quizzes',
    label: 'Quiz & Practice',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    to: '/weak-topics',
    label: 'Learning Gaps',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    to: '/resume-prep',
    label: 'Resume Prep',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    to: '/doubts',
    label: 'Doubts',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    to: '/coding',
    label: 'Coding',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
      </svg>
    ),
    isFooter: true,
  },
];

const mainItems = navItems.filter((item) => !item.isFooter);
const footerItems = navItems.filter((item) => item.isFooter);

export default function Sidebar({ mobileOpen, onClose }) {
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('bodhaq_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    document.documentElement.classList.toggle(
      'sidebar-collapsed',
      collapsed
    );
  }, [collapsed]);

  function toggleCollapse() {
    setCollapsed((current) => {
      const next = !current;

      localStorage.setItem(
        'bodhaq_sidebar_collapsed',
        String(next)
      );

      return next;
    });
  }

  function isActive(to, exact) {
    if (exact) {
      return location.pathname === to;
    }

    if (to === '/weak-topics') {
      return (
        location.pathname.startsWith('/weak-topics') ||
        location.pathname.startsWith('/practice')
      );
    }

    return location.pathname.startsWith(to);
  }

  function renderNavItem(item) {
    const active = isActive(item.to, item.exact);

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.exact}
        className={({ isActive: routerActive }) =>
          `nav-item ${routerActive || active ? 'active' : ''}`
        }
        onClick={onClose}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
      >
        <span className="nav-item-icon">
          {item.icon}
        </span>

        <span className="nav-item-label">
          {item.label}
        </span>
      </NavLink>
    );
  }

  return (
    <>
      <div
        className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <nav
        className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''} ${collapsed ? 'collapsed' : ''
          }`}
        aria-label="Main navigation"
      >
        <div className="sidebar-brand">
          <div
            className="sidebar-logo"
            aria-hidden="true"
          >
            B
          </div>

          <span className="sidebar-name">
            BodhaQ
          </span>

          <button
            type="button"
            className="collapse-btn"
            onClick={toggleCollapse}
            title={
              collapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
            aria-label={
              collapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
            aria-expanded={!collapsed}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </button>
        </div>

        <ul
          className="sidebar-nav"
          role="list"
        >
          {mainItems.map(renderNavItem)}
        </ul>

        <div className="sidebar-footer">
          {footerItems.map(renderNavItem)}
        </div>
      </nav>
    </>
  );
}

const mobileNavItems = navItems
  .filter((item) => !item.isFooter)
  .slice(0, 5);

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="Mobile navigation"
    >
      {mobileNavItems.map((item) => {
        const active =
          item.exact
            ? location.pathname === item.to
            : item.to === '/weak-topics'
              ? (
                location.pathname.startsWith('/weak-topics') ||
                location.pathname.startsWith('/practice')
              )
              : location.pathname.startsWith(item.to);

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}