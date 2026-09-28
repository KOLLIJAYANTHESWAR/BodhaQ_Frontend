import { useState, useEffect } from 'react';
import { testAiConnection, checkHealth } from '../api/settingsApi.js';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import PageHeader from '../components/common/PageHeader.jsx';

/* ── Accessibility settings ──────────────────────────────────────────────── */
function AccessibilitySettings() {
  const [fontSize, setFontSize] = useState(
    document.documentElement.getAttribute('data-font-size') || 'normal'
  );
  const [reduceMotion, setReduceMotion] = useState(
    document.documentElement.getAttribute('data-reduce-motion') === 'true'
  );
  const [highContrast, setHighContrast] = useState(
    document.documentElement.getAttribute('data-contrast') === 'high'
  );
  const [reading, setReading] = useState(false);

  function applyFontSize(size) {
    setFontSize(size);
    document.documentElement.setAttribute('data-font-size', size);
    localStorage.setItem('bodhaq_font_size', size);
  }

  function toggleReduceMotion() {
    const next = !reduceMotion;
    setReduceMotion(next);
    document.documentElement.setAttribute('data-reduce-motion', String(next));
    localStorage.setItem('bodhaq_reduce_motion', String(next));
  }

  function toggleHighContrast() {
    const next = !highContrast;
    setHighContrast(next);
    document.documentElement.setAttribute('data-contrast', next ? 'high' : '');
    localStorage.setItem('bodhaq_contrast', next ? 'high' : '');
  }

  function handleReadAloud() {
    if (reading) {
      window.speechSynthesis.cancel();
      setReading(false);
      return;
    }
    const mainContent = document.querySelector('.page-content');
    if (mainContent) {
      const utterance = new SpeechSynthesisUtterance(mainContent.innerText);
      utterance.onend = () => setReading(false);
      utterance.onerror = () => setReading(false);
      setReading(true);
      window.speechSynthesis.speak(utterance);
    }
  }

  return (
    <Card style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 20 }}>Accessibility</h2>

      {/* Text size */}
      <div style={{ marginBottom: 20 }}>
        <span className="form-label" id="font-size-label">Text size</span>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }} role="group" aria-labelledby="font-size-label">
          {[
            { key: 'small', label: 'A−', desc: 'Small text' },
            { key: 'normal', label: 'A', desc: 'Normal text' },
            { key: 'large', label: 'A+', desc: 'Large text' },
          ].map(({ key, label, desc }) => (
            <button
              key={key}
              className={`btn btn-${fontSize === key ? 'primary' : 'secondary'} btn-sm`}
              onClick={() => applyFontSize(key)}
              aria-label={desc}
              aria-pressed={fontSize === key}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contrast */}
      <div style={{ marginBottom: 20 }}>
        <span className="form-label" id="contrast-label">Contrast</span>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }} role="group" aria-labelledby="contrast-label">
          <button
            className={`btn btn-${!highContrast ? 'primary' : 'secondary'} btn-sm`}
            onClick={() => highContrast && toggleHighContrast()}
            aria-pressed={!highContrast}
          >
            Standard
          </button>
          <button
            className={`btn btn-${highContrast ? 'primary' : 'secondary'} btn-sm`}
            onClick={() => !highContrast && toggleHighContrast()}
            aria-pressed={highContrast}
          >
            High contrast
          </button>
        </div>
      </div>

      {/* Motion */}
      <div style={{ marginBottom: 20 }}>
        <span className="form-label" id="motion-label">Motion</span>
        <div style={{ marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={toggleReduceMotion}
              style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
              aria-label="Reduce animations"
            />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
              Reduce animations
            </span>
          </label>
        </div>
      </div>

      {/* Read aloud */}
      <div>
        <span className="form-label" id="reading-label">Reading assistance</span>
        <div style={{ marginTop: 8 }}>
          <Button
            variant={reading ? 'danger' : 'secondary'}
            size="sm"
            onClick={handleReadAloud}
            aria-label={reading ? 'Stop reading content aloud' : 'Read page content aloud'}
          >
            {reading ? 'Stop reading' : 'Read content aloud'}
          </Button>
          <p className="text-muted" style={{ marginTop: 6 }}>
            Uses your browser's built-in speech synthesis.
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ── AI Configuration (BYOK) ─────────────────────────────────────────────── */
function AIConfiguration() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyMode, setKeyMode] = useState('session'); // session
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    // Load saved session key on mount (for display)
    const saved = sessionStorage.getItem('bodhaq_user_api_key');
    if (saved) {
      setApiKey(saved);
      setTestResult({ valid: true, message: 'API key active for this session.' });
    }
  }, []);

  async function handleTest() {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);

    // Store key in sessionStorage BEFORE the request so client.js can attach it
    sessionStorage.setItem('bodhaq_user_api_key', apiKey.trim());

    try {
      const data = await testAiConnection(apiKey.trim());
      setTestResult({ valid: data.valid, message: data.message || 'Connection successful.' });
      if (!data.valid) {
        // Remove invalid key
        sessionStorage.removeItem('bodhaq_user_api_key');
      }
    } catch (err) {
      setTestResult({ valid: false, message: err.message });
      sessionStorage.removeItem('bodhaq_user_api_key');
    } finally {
      setTesting(false);
    }
  }

  function handleClear() {
    sessionStorage.removeItem('bodhaq_user_api_key');
    setApiKey('');
    setTestResult(null);
  }

  return (
    <Card style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 6 }}>AI Configuration</h2>
      <p style={{ color: 'var(--color-muted)', marginBottom: 20, fontSize: 'var(--font-size-sm)' }}>
        Provide your own Gemini API key for this session. The key is never stored in the database or logs.
      </p>

      {/* API Key input */}
      <div className="form-group">
        <label htmlFor="api-key-input" className="form-label">Gemini API Key</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="api-key-input"
            type={showKey ? 'text' : 'password'}
            className="form-input"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza…"
            autoComplete="off"
            aria-describedby="api-key-hint"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowKey((s) => !s)}
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
            style={{ flexShrink: 0 }}
          >
            {showKey ? 'Hide' : 'Show'}
          </Button>
        </div>
        <span id="api-key-hint" className="text-muted" style={{ marginTop: 4 }}>
          Key is stored in browser session memory only. Closing the tab clears it.
        </span>
      </div>

      {/* Storage mode */}
      <div className="form-group" style={{ marginBottom: 20 }}>
        <span className="form-label">Storage</span>
        <div style={{ marginTop: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name="key-mode"
              value="session"
              checked={keyMode === 'session'}
              onChange={() => setKeyMode('session')}
              style={{ accentColor: 'var(--color-primary)' }}
            />
            <span style={{ fontSize: 'var(--font-size-sm)' }}>
              Keep my key only for this browser session (recommended)
            </span>
          </label>
        </div>
      </div>

      {/* Test / Clear */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <Button
          variant="primary"
          onClick={handleTest}
          loading={testing}
          disabled={!apiKey.trim() || testing}
        >
          Test Connection
        </Button>
        {apiKey && (
          <Button variant="secondary" onClick={handleClear}>
            Clear Key
          </Button>
        )}
      </div>

      {/* Test result */}
      {testResult && (
        <div
          className={`inline-notice ${testResult.valid ? 'success' : 'error'}`}
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true">{testResult.valid ? '✓' : '✗'}</span>
          {testResult.message}
        </div>
      )}

      {/* Security notice */}
      <div className="inline-notice warning" style={{ marginTop: 16 }}>
        <span aria-hidden="true">🔒</span>
        <span>
          <strong>Never share your API key publicly.</strong> Do not paste it into GitHub, screenshots, public chats, or source code.
          Gemini API quotas, pricing, and availability are controlled by Google and may vary by project, model, and billing tier.
        </span>
      </div>

      {/* Help accordion */}
      <div style={{ marginTop: 20 }}>
        <button
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-primary)', fontWeight: 600,
            fontSize: 'var(--font-size-sm)', padding: 0,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onClick={() => setHelpOpen((h) => !h)}
          aria-expanded={helpOpen}
          aria-controls="api-key-help"
        >
          <span aria-hidden="true">{helpOpen ? '▾' : '▸'}</span>
          How to get a Gemini API key
        </button>

        {helpOpen && (
          <div id="api-key-help" style={{ marginTop: 14 }}>
            <ol style={{ listStyleType: 'decimal', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Open Google AI Studio.',
                'Sign in with your Google account.',
                'Open the API Keys page.',
                'Select Create API key.',
                'Select or create the appropriate project if prompted.',
                'Copy the generated key.',
                'Return to BodhaQ.',
                'Paste the key into the API key field above.',
                'Click Test Connection.',
              ].map((step, i) => (
                <li key={i} style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.6 }}>
                  {step}
                </li>
              ))}
            </ol>
            <a
              href="https://aistudio.google.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 14, display: 'inline-flex' }}
            >
              Open Google AI Studio ↗
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ── Theme Settings ──────────────────────────────────────────────────────── */
function ThemeSettings() {
  const [theme, setTheme] = useState(
    localStorage.getItem('bodhaq_theme') || 'system'
  );

  function applyTheme(t) {
    setTheme(t);
    localStorage.setItem('bodhaq_theme', t);

    let resolved = t;
    if (t === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', resolved === 'dark' ? 'dark' : '');
  }

  return (
    <Card style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 16 }}>Appearance</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="group" aria-label="Theme selection">
        {[
          { key: 'light', label: '☀️ Light' },
          { key: 'dark', label: '🌙 Dark' },
          { key: 'system', label: '💻 System' },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`btn btn-${theme === key ? 'primary' : 'secondary'} btn-sm`}
            onClick={() => applyTheme(key)}
            aria-pressed={theme === key}
          >
            {label}
          </button>
        ))}
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="page-content">
      <PageHeader title="Settings" subtitle="Customise your BodhaQ experience." />

      <ThemeSettings />
      <AIConfiguration />
      <AccessibilitySettings />

      <Card>
        <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 8 }}>About BodhaQ</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>
          BodhaQ is an AI-powered learning workspace. Turn anything you study into an interactive learning experience.
          Built with FastAPI, Gemini, and React.
        </p>
      </Card>
    </div>
  );
}
