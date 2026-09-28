import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar, { MobileBottomNav } from './components/layout/Sidebar.jsx';

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

function MobileHeader({ onMenuOpen }) {
  return (
    <header className="mobile-header" role="banner">
      <div className="mobile-brand">
        <div style={{
          width: 28, height: 28, background: 'var(--color-primary)',
          borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 14,
        }} aria-hidden="true">B</div>
        <span>BodhaQ</span>
      </div>
      <button
        className="hamburger-btn"
        onClick={onMenuOpen}
        aria-label="Open navigation menu"
        aria-haspopup="true"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </header>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div id="app-root">
      {/* Desktop + tablet sidebar */}
      <Sidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main content area */}
      <div className="app-main">
        {/* Mobile top header */}
        <MobileHeader onMenuOpen={() => setMobileNavOpen(true)} />

        {/* Skip navigation link for keyboard/screen-reader users */}
        <a
          href="#main-content"
          style={{
            position: 'absolute',
            top: '-100px',
            left: 0,
            background: 'var(--color-primary)',
            color: '#fff',
            padding: '8px 16px',
            zIndex: 999,
          }}
          onFocus={(e) => (e.currentTarget.style.top = '0')}
          onBlur={(e) => (e.currentTarget.style.top = '-100px')}
        >
          Skip to main content
        </a>

        <main id="main-content" tabIndex={-1}>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/study" element={<StudyPage />} />
            <Route path="/study/document/:documentId" element={<DocumentStudyPage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/quizzes" element={<QuizzesPage />} />
            <Route path="/quiz-results" element={<QuizResultsPage />} />
            <Route path="/weak-topics" element={<WeakTopicsPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/resume-prep" element={<ResumePrepPage />} />
            <Route path="/doubts" element={<DoubtsPage />} />
            <Route path="/coding" element={<CodingPage />} />
            <Route path="/coding/workspace" element={<CodingWorkspacePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}

export default function App() {
  // Restore accessibility preferences on mount
  useEffect(() => {
    const fontSize = localStorage.getItem('bodhaq_font_size');
    if (fontSize) document.documentElement.setAttribute('data-font-size', fontSize);

    const contrast = localStorage.getItem('bodhaq_contrast');
    if (contrast) document.documentElement.setAttribute('data-contrast', contrast);

    const reduceMotion = localStorage.getItem('bodhaq_reduce_motion');
    if (reduceMotion === 'true') document.documentElement.setAttribute('data-reduce-motion', 'true');

    const theme = localStorage.getItem('bodhaq_theme') || 'system';
    let resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', resolved === 'dark' ? 'dark' : '');
  }, []);

  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
