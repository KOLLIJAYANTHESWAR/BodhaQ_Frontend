import { useState, useEffect } from 'react';
import {
  testAiConnection,
  testTavilyConnection,
} from '../api/settingsApi.js';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import PageHeader from '../components/common/PageHeader.jsx';

/* ── Accessibility settings ──────────────────────────────────────────────── */

function AccessibilitySettings() {
  const [fontSize, setFontSize] = useState(
    document.documentElement.getAttribute('data-font-size') ||
    'normal'
  );

  const [reduceMotion, setReduceMotion] = useState(
    document.documentElement.getAttribute('data-reduce-motion') ===
    'true'
  );

  const [highContrast, setHighContrast] = useState(
    document.documentElement.getAttribute('data-contrast') === 'high'
  );

  const [reading, setReading] = useState(false);

  function applyFontSize(size) {
    setFontSize(size);

    document.documentElement.setAttribute(
      'data-font-size',
      size
    );

    localStorage.setItem('bodhaq_font_size', size);
  }

  function toggleReduceMotion() {
    const next = !reduceMotion;

    setReduceMotion(next);

    document.documentElement.setAttribute(
      'data-reduce-motion',
      String(next)
    );

    localStorage.setItem(
      'bodhaq_reduce_motion',
      String(next)
    );
  }

  function toggleHighContrast() {
    const next = !highContrast;

    setHighContrast(next);

    document.documentElement.setAttribute(
      'data-contrast',
      next ? 'high' : ''
    );

    localStorage.setItem(
      'bodhaq_contrast',
      next ? 'high' : ''
    );
  }

  function handleReadAloud() {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      typeof window.SpeechSynthesisUtterance === 'undefined'
    ) {
      setReading(false);
      return;
    }

    if (reading) {
      window.speechSynthesis.cancel();
      setReading(false);
      return;
    }

    const mainContent = document.querySelector('.page-content');

    if (!mainContent) {
      return;
    }

    const utterance = new window.SpeechSynthesisUtterance(
      mainContent.innerText
    );

    utterance.onend = () => setReading(false);
    utterance.onerror = () => setReading(false);

    setReading(true);
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    return () => {
      if (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <Card style={{ marginBottom: 20 }}>
      <h2
        style={{
          fontSize: 'var(--font-size-lg)',
          marginBottom: 20,
        }}
      >
        Accessibility
      </h2>

      {/* Text size */}
      <div style={{ marginBottom: 20 }}>
        <span
          className="form-label"
          id="font-size-label"
        >
          Text size
        </span>

        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 8,
          }}
          role="group"
          aria-labelledby="font-size-label"
        >
          {[
            {
              key: 'small',
              label: 'A−',
              desc: 'Small text',
            },
            {
              key: 'normal',
              label: 'A',
              desc: 'Normal text',
            },
            {
              key: 'large',
              label: 'A+',
              desc: 'Large text',
            },
          ].map(({ key, label, desc }) => (
            <button
              key={key}
              type="button"
              className={`btn btn-${fontSize === key ? 'primary' : 'secondary'
                } btn-sm`}
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
        <span
          className="form-label"
          id="contrast-label"
        >
          Contrast
        </span>

        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 8,
          }}
          role="group"
          aria-labelledby="contrast-label"
        >
          <button
            type="button"
            className={`btn btn-${!highContrast ? 'primary' : 'secondary'
              } btn-sm`}
            onClick={() => {
              if (highContrast) {
                toggleHighContrast();
              }
            }}
            aria-pressed={!highContrast}
          >
            Standard
          </button>

          <button
            type="button"
            className={`btn btn-${highContrast ? 'primary' : 'secondary'
              } btn-sm`}
            onClick={() => {
              if (!highContrast) {
                toggleHighContrast();
              }
            }}
            aria-pressed={highContrast}
          >
            High contrast
          </button>
        </div>
      </div>

      {/* Motion */}
      <div style={{ marginBottom: 20 }}>
        <span
          className="form-label"
          id="motion-label"
        >
          Motion
        </span>

        <div style={{ marginTop: 8 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={toggleReduceMotion}
              style={{
                width: 18,
                height: 18,
                accentColor: 'var(--color-primary)',
              }}
              aria-label="Reduce animations"
            />

            <span
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text)',
              }}
            >
              Reduce animations
            </span>
          </label>
        </div>
      </div>

      {/* Read aloud */}
      <div>
        <span
          className="form-label"
          id="reading-label"
        >
          Reading assistance
        </span>

        <div style={{ marginTop: 8 }}>
          <Button
            type="button"
            variant={reading ? 'danger' : 'secondary'}
            size="sm"
            onClick={handleReadAloud}
            aria-label={
              reading
                ? 'Stop reading content aloud'
                : 'Read page content aloud'
            }
          >
            {reading ? 'Stop reading' : 'Read content aloud'}
          </Button>

          <p
            className="text-muted"
            style={{
              marginTop: 6,
            }}
          >
            Uses your browser's built-in speech synthesis.
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ── Gemini Configuration ────────────────────────────────────────────────── */

function GeminiConfiguration() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(
      'bodhaq_user_api_key'
    );

    if (saved) {
      setApiKey(saved);

      setTestResult({
        valid: true,
        message: 'API key active for this session.',
      });
    }
  }, []);

  async function handleTest() {
    const trimmedKey = apiKey.trim();

    if (!trimmedKey || testing) {
      return;
    }

    setTesting(true);
    setTestResult(null);

    sessionStorage.setItem(
      'bodhaq_user_api_key',
      trimmedKey
    );

    try {
      const data = await testAiConnection(trimmedKey);

      const valid = data?.valid === true;

      setTestResult({
        valid,
        message:
          data?.message ||
          (valid
            ? 'Connection successful.'
            : 'Gemini connection failed.'),
      });

      if (!valid) {
        sessionStorage.removeItem(
          'bodhaq_user_api_key'
        );
      }
    } catch (err) {
      setTestResult({
        valid: false,
        message:
          err?.message ||
          'Unable to test Gemini connection.',
      });

      sessionStorage.removeItem(
        'bodhaq_user_api_key'
      );
    } finally {
      setTesting(false);
    }
  }

  function handleClear() {
    sessionStorage.removeItem(
      'bodhaq_user_api_key'
    );

    setApiKey('');
    setTestResult(null);
  }

  return (
    <Card style={{ marginBottom: 20 }}>
      <h2
        style={{
          fontSize: 'var(--font-size-lg)',
          marginBottom: 6,
        }}
      >
        Gemini API
      </h2>

      <p
        style={{
          color: 'var(--color-muted)',
          marginBottom: 20,
          fontSize: 'var(--font-size-sm)',
        }}
      >
        Provide your own Gemini API key for this session. The
        key is never stored in the database or logs.
      </p>

      <div className="form-group">
        <label
          htmlFor="api-key-input"
          className="form-label"
        >
          Gemini API Key
        </label>

        <div
          style={{
            display: 'flex',
            gap: 8,
          }}
        >
          <input
            id="api-key-input"
            type={showKey ? 'text' : 'password'}
            className="form-input"
            value={apiKey}
            onChange={(event) => {
              setApiKey(event.target.value);
              setTestResult(null);
            }}
            placeholder="AIza…"
            autoComplete="off"
            spellCheck="false"
            aria-describedby="api-key-hint"
          />

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowKey((value) => !value)}
            aria-label={
              showKey ? 'Hide API key' : 'Show API key'
            }
            style={{
              flexShrink: 0,
            }}
          >
            {showKey ? 'Hide' : 'Show'}
          </Button>
        </div>

        <span
          id="api-key-hint"
          className="text-muted"
          style={{
            marginTop: 4,
          }}
        >
          Key is stored in browser session storage only. Closing
          the tab clears it.
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <Button
          type="button"
          variant="primary"
          onClick={handleTest}
          loading={testing}
          disabled={!apiKey.trim() || testing}
        >
          Test Connection
        </Button>

        {apiKey && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleClear}
            disabled={testing}
          >
            Clear Key
          </Button>
        )}
      </div>

      {testResult && (
        <div
          className={`inline-notice ${testResult.valid ? 'success' : 'error'
            }`}
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true">
            {testResult.valid ? '✓' : '✗'}
          </span>

          {testResult.message}
        </div>
      )}

      <div
        className="inline-notice warning"
        style={{
          marginTop: 16,
        }}
      >
        <span aria-hidden="true">🔒</span>

        <span>
          <strong>Never share your API key publicly.</strong>{' '}
          Do not paste it into GitHub, screenshots, public
          chats, or source code. Gemini API quotas, pricing,
          and availability are controlled by Google and may
          vary by project, model, and billing tier.
        </span>
      </div>

      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-primary)',
            fontWeight: 600,
            fontSize: 'var(--font-size-sm)',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          onClick={() => setHelpOpen((value) => !value)}
          aria-expanded={helpOpen}
          aria-controls="api-key-help"
        >
          <span aria-hidden="true">
            {helpOpen ? '▾' : '▸'}
          </span>

          How to get a Gemini API key
        </button>

        {helpOpen && (
          <div
            id="api-key-help"
            style={{
              marginTop: 14,
            }}
          >
            <ol
              style={{
                listStyleType: 'decimal',
                paddingLeft: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
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
              ].map((step, index) => (
                <li
                  key={index}
                  style={{
                    color:
                      'var(--color-text-secondary)',
                    fontSize: 'var(--font-size-sm)',
                    lineHeight: 1.6,
                  }}
                >
                  {step}
                </li>
              ))}
            </ol>

            <a
              href="https://aistudio.google.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{
                marginTop: 14,
                display: 'inline-flex',
              }}
            >
              Open Google AI Studio ↗
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ── Tavily Configuration ────────────────────────────────────────────────── */

function TavilyConfiguration() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(
      'bodhaq_tavily_api_key'
    );

    if (saved) {
      setApiKey(saved);

      setTestResult({
        valid: true,
        message:
          'Tavily API key active for this session.',
      });
    }
  }, []);

  async function handleTest() {
    const trimmedKey = apiKey.trim();

    if (!trimmedKey || testing) {
      return;
    }

    setTesting(true);
    setTestResult(null);

    sessionStorage.setItem(
      'bodhaq_tavily_api_key',
      trimmedKey
    );

    try {
      const data =
        await testTavilyConnection(trimmedKey);

      const valid = data?.valid === true;

      setTestResult({
        valid,
        message:
          data?.message ||
          (valid
            ? 'Tavily connection successful.'
            : 'Tavily connection failed.'),
      });

      if (!valid) {
        sessionStorage.removeItem(
          'bodhaq_tavily_api_key'
        );
      }
    } catch (err) {
      setTestResult({
        valid: false,
        message:
          err?.message ||
          'Unable to test Tavily connection.',
      });

      sessionStorage.removeItem(
        'bodhaq_tavily_api_key'
      );
    } finally {
      setTesting(false);
    }
  }

  function handleClear() {
    sessionStorage.removeItem(
      'bodhaq_tavily_api_key'
    );

    setApiKey('');
    setTestResult(null);
  }

  return (
    <Card style={{ marginBottom: 20 }}>
      <h2
        style={{
          fontSize: 'var(--font-size-lg)',
          marginBottom: 6,
        }}
      >
        Tavily API
      </h2>

      <p
        style={{
          color: 'var(--color-muted)',
          marginBottom: 20,
          fontSize: 'var(--font-size-sm)',
        }}
      >
        Tavily powers BodhaQ's online study-resource search.
        Your API key is kept only for this browser session.
      </p>

      <div className="form-group">
        <label
          htmlFor="tavily-api-key-input"
          className="form-label"
        >
          Tavily API Key
        </label>

        <div
          style={{
            display: 'flex',
            gap: 8,
          }}
        >
          <input
            id="tavily-api-key-input"
            type={showKey ? 'text' : 'password'}
            className="form-input"
            value={apiKey}
            onChange={(event) => {
              setApiKey(event.target.value);
              setTestResult(null);
            }}
            placeholder="tvly-…"
            autoComplete="off"
            spellCheck="false"
            aria-describedby="tavily-api-key-hint"
          />

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowKey((value) => !value)}
            aria-label={
              showKey
                ? 'Hide Tavily API key'
                : 'Show Tavily API key'
            }
            style={{
              flexShrink: 0,
            }}
          >
            {showKey ? 'Hide' : 'Show'}
          </Button>
        </div>

        <span
          id="tavily-api-key-hint"
          className="text-muted"
          style={{
            marginTop: 4,
          }}
        >
          Key is stored in browser session storage only. Closing
          the tab clears it.
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <Button
          type="button"
          variant="primary"
          onClick={handleTest}
          loading={testing}
          disabled={!apiKey.trim() || testing}
        >
          Test Connection
        </Button>

        {apiKey && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleClear}
            disabled={testing}
          >
            Clear Key
          </Button>
        )}
      </div>

      {testResult && (
        <div
          className={`inline-notice ${testResult.valid ? 'success' : 'error'
            }`}
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true">
            {testResult.valid ? '✓' : '✗'}
          </span>

          {testResult.message}
        </div>
      )}

      <div
        className="inline-notice warning"
        style={{
          marginTop: 16,
        }}
      >
        <span aria-hidden="true">🔒</span>

        <span>
          <strong>
            Never share your Tavily API key publicly.
          </strong>{' '}
          Keep it out of GitHub, screenshots, public chats,
          and source code.
        </span>
      </div>

      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-primary)',
            fontWeight: 600,
            fontSize: 'var(--font-size-sm)',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          onClick={() => setHelpOpen((value) => !value)}
          aria-expanded={helpOpen}
          aria-controls="tavily-api-help"
        >
          <span aria-hidden="true">
            {helpOpen ? '▾' : '▸'}
          </span>

          How to get a Tavily API key
        </button>

        {helpOpen && (
          <div
            id="tavily-api-help"
            style={{
              marginTop: 14,
            }}
          >
            <ol
              style={{
                listStyleType: 'decimal',
                paddingLeft: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {[
                'Open the Tavily Dashboard.',
                'Sign in or create a Tavily account.',
                'Open the API Keys section.',
                'Create a new API key.',
                'Give the key a recognizable name, such as BodhaQ Development.',
                'Copy the generated API key.',
                'Return to BodhaQ.',
                'Paste the key into the Tavily API Key field above.',
                'Click Test Connection.',
              ].map((step, index) => (
                <li
                  key={index}
                  style={{
                    color:
                      'var(--color-text-secondary)',
                    fontSize: 'var(--font-size-sm)',
                    lineHeight: 1.6,
                  }}
                >
                  {step}
                </li>
              ))}
            </ol>

            <a
              href="https://app.tavily.com/home"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{
                marginTop: 14,
                display: 'inline-flex',
              }}
            >
              Open Tavily Dashboard ↗
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ── Settings Page ───────────────────────────────────────────────────────── */

export default function SettingsPage() {
  return (
    <div className="page-content">
      <PageHeader
        title="Settings"
        subtitle="Customise your BodhaQ experience."
      />

      {/* Appearance has intentionally been removed from Settings.
          The Light/Dark control is placed in the main application layout. */}

      <GeminiConfiguration />

      <TavilyConfiguration />

      <AccessibilitySettings />

      <Card>
        <h2
          style={{
            fontSize: 'var(--font-size-lg)',
            marginBottom: 8,
          }}
        >
          About BodhaQ
        </h2>

        <p
          style={{
            color: 'var(--color-muted)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          BodhaQ is an AI-powered learning workspace. Turn
          anything you study into an interactive learning
          experience. Built with FastAPI, Gemini, and React.
        </p>
      </Card>
    </div>
  );
}