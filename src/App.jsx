import { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';

import Sidebar, {
  MobileBottomNav,
} from './components/layout/Sidebar.jsx';

import HomePage from './pages/HomePage.jsx';
import StudyPage from './pages/StudyPage.jsx';
import MaterialsPage from './pages/MaterialsPage.jsx';
import DocumentStudyPage from './pages/DocumentStudyPage.jsx';
import QuizzesPage from './pages/QuizzesPage.jsx';
import QuizResultsPage from './pages/QuizResultsPage.jsx';
import WeakTopicsPage from './pages/WeakTopicsPage.jsx';
import PracticePage from './pages/PracticePage.jsx';
import DoubtsPage from './pages/DoubtsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import ResumePrepPage from './pages/ResumePrepPage.jsx';
import CodingPage from './pages/CodingPage.jsx';
import CodingWorkspacePage from './pages/CodingWorkspacePage.jsx';

import './index.css';


/* -------------------------------------------------------------------------- */
/* Mobile Header                                                              */
/* -------------------------------------------------------------------------- */

function MobileHeader({ onMenuOpen }) {
  return (
    <header className="mobile-header" role="banner">
      <div className="mobile-brand">
        <div
          className="mobile-brand-logo"
          aria-hidden="true"
        >
          B
        </div>

        <span>BodhaQ</span>
      </div>

      <button
        type="button"
        className="hamburger-btn"
        onClick={onMenuOpen}
        aria-label="Open navigation menu"
        aria-haspopup="true"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </header>
  );
}


/* -------------------------------------------------------------------------- */
/* Theme Icons                                                                */
/* -------------------------------------------------------------------------- */

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />

      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />

      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />

      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />

      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
    </svg>
  );
}


function MoonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}


/* -------------------------------------------------------------------------- */
/* Theme Toggle                                                               */
/* -------------------------------------------------------------------------- */

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={
        isDark
          ? 'Switch to light mode'
          : 'Switch to dark mode'
      }
      title={
        isDark
          ? 'Switch to light mode'
          : 'Switch to dark mode'
      }
      aria-pressed={isDark}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}


/* -------------------------------------------------------------------------- */
/* Scroll To Top                                                              */
/* -------------------------------------------------------------------------- */

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}


/* -------------------------------------------------------------------------- */
/* Theme                                                                      */
/* -------------------------------------------------------------------------- */

function getInitialTheme() {
  const savedTheme = localStorage.getItem('bodhaq_theme');

  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme;
  }

  return window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches
    ? 'dark'
    : 'light';
}


function applyTheme(theme) {
  document.documentElement.setAttribute(
    'data-theme',
    theme === 'dark' ? 'dark' : ''
  );
}


/* -------------------------------------------------------------------------- */
/* App Shell                                                                  */
/* -------------------------------------------------------------------------- */

function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] =
    useState(false);

  const [theme, setTheme] = useState(
    getInitialTheme
  );

  useEffect(() => {
    applyTheme(theme);

    localStorage.setItem(
      'bodhaq_theme',
      theme
    );
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme((currentTheme) =>
      currentTheme === 'dark'
        ? 'light'
        : 'dark'
    );
  };

  const handleMobileMenuClose = () => {
    setMobileNavOpen(false);
  };

  return (
    <div id="app-root">

      {/* Desktop + tablet sidebar */}
      <Sidebar
        mobileOpen={mobileNavOpen}
        onClose={handleMobileMenuClose}
      />

      {/* Main content area */}
      <div className="app-main">

        {/* Global light / dark mode toggle */}
        <ThemeToggle
          theme={theme}
          onToggle={handleThemeToggle}
        />

        {/* Mobile top header */}
        <MobileHeader
          onMenuOpen={() =>
            setMobileNavOpen(true)
          }
        />

        {/* Skip navigation link */}
        <a
          href="#main-content"
          className="skip-to-content"
        >
          Skip to main content
        </a>

        <main
          id="main-content"
          tabIndex={-1}
        >
          <ScrollToTop />

          <Routes>

            <Route
              path="/"
              element={<HomePage />}
            />

            <Route
              path="/study"
              element={<StudyPage />}
            />

            <Route
              path="/study/document/:documentId"
              element={<DocumentStudyPage />}
            />

            <Route
              path="/materials"
              element={<MaterialsPage />}
            />

            <Route
              path="/quizzes"
              element={<QuizzesPage />}
            />

            <Route
              path="/quiz-results"
              element={<QuizResultsPage />}
            />

            <Route
              path="/weak-topics"
              element={<WeakTopicsPage />}
            />

            <Route
              path="/practice"
              element={<PracticePage />}
            />

            <Route
              path="/resume-prep"
              element={<ResumePrepPage />}
            />

            <Route
              path="/doubts"
              element={<DoubtsPage />}
            />

            <Route
              path="/coding"
              element={<CodingPage />}
            />

            <Route
              path="/coding/workspace"
              element={<CodingWorkspacePage />}
            />

            <Route
              path="/settings"
              element={<SettingsPage />}
            />

          </Routes>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />

    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* App                                                                        */
/* -------------------------------------------------------------------------- */

export default function App() {

  /*
   * Restore accessibility preferences.
   *
   * Theme is intentionally NOT restored here because
   * AppShell owns theme state and persistence.
   */
  useEffect(() => {

    const fontSize =
      localStorage.getItem(
        'bodhaq_font_size'
      );

    if (fontSize) {
      document.documentElement.setAttribute(
        'data-font-size',
        fontSize
      );
    }

    const contrast =
      localStorage.getItem(
        'bodhaq_contrast'
      );

    if (contrast) {
      document.documentElement.setAttribute(
        'data-contrast',
        contrast
      );
    }

    const reduceMotion =
      localStorage.getItem(
        'bodhaq_reduce_motion'
      );

    if (reduceMotion === 'true') {
      document.documentElement.setAttribute(
        'data-reduce-motion',
        'true'
      );
    } else {
      document.documentElement.removeAttribute(
        'data-reduce-motion'
      );
    }

  }, []);

  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}