/**
 * DoubtsPage — Continuous AI chat with Markdown rendering and source selection.
 *
 * Features:
 *   - Persistent conversation history during the page session
 *   - Source selector: General | uploaded document
 *   - Switching source does NOT reset the conversation
 *   - Conversation history sent to backend
 *   - Safe Markdown rendering
 *   - Safe external links
 *   - Theme-safe Markdown/code rendering
 *   - Typing indicator
 *   - Enter to send, Shift+Enter for new line
 *   - Auto-scroll to latest message
 *   - Defensive API/error handling
 *   - Stable message keys
 *   - Question length protection
 *   - Light/dark theme-safe rendering
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';

import { useSearchParams } from 'react-router-dom';
import { marked } from 'marked';

import { askDoubt } from '../api/doubtApi.js';
import { listDocuments } from '../api/documentApi.js';


// ── Constants ────────────────────────────────────────────────────────────────

const MAX_QUESTION_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 16;
const MAX_SOURCE_ITEMS = 20;
const MAX_SOURCE_TEXT_LENGTH = 500;


// ── Configure marked ─────────────────────────────────────────────────────────

marked.setOptions({
  gfm: true,
  breaks: true,
});


// ── Utility: stable ID ───────────────────────────────────────────────────────

function createMessageId() {
  try {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to timestamp-based fallback.
  }

  return `msg-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}


// ── Safe error conversion ────────────────────────────────────────────────────

function getErrorMessage(error) {
  if (!error) {
    return 'Something went wrong. Please try again.';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return (
      error.message ||
      'Something went wrong. Please try again.'
    );
  }

  if (typeof error === 'object') {
    if (typeof error.message === 'string') {
      return error.message;
    }

    if (typeof error.error === 'string') {
      return error.error;
    }

    if (
      error.detail &&
      typeof error.detail === 'string'
    ) {
      return error.detail;
    }

    if (
      error.detail &&
      typeof error.detail.message === 'string'
    ) {
      return error.detail.message;
    }

    if (
      error.detail &&
      typeof error.detail.error === 'string'
    ) {
      return error.detail.error;
    }

    try {
      const serialized = JSON.stringify(error);

      if (
        serialized &&
        serialized !== '{}' &&
        serialized !== 'null'
      ) {
        return serialized;
      }
    } catch {
      // Ignore serialization failures.
    }
  }

  return String(error);
}


// ── HTML escaping ────────────────────────────────────────────────────────────

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// ── Safe Markdown sanitization ───────────────────────────────────────────────

/**
 * marked supports raw HTML because Markdown allows inline HTML.
 *
 * AI-generated content must never be trusted as executable HTML.
 *
 * This sanitizer:
 *   - removes executable/embedded elements
 *   - removes event-handler attributes
 *   - removes unsafe URL protocols
 *   - keeps normal Markdown formatting
 *   - protects external links
 */
function sanitizeMarkdownHtml(html) {
  if (
    typeof window === 'undefined' ||
    typeof DOMParser === 'undefined'
  ) {
    return escapeHtml(html);
  }

  try {
    const parser = new DOMParser();

    const document =
      parser.parseFromString(
        String(html || ''),
        'text/html'
      );

    const blockedTags = [
      'script',
      'iframe',
      'object',
      'embed',
      'form',
      'input',
      'button',
      'textarea',
      'select',
      'option',
      'style',
      'link',
      'meta',
      'base',
      'svg',
      'math',
    ];

    blockedTags.forEach((tagName) => {
      document
        .querySelectorAll(tagName)
        .forEach((element) => {
          element.remove();
        });
    });

    const allowedUrlProtocols = [
      'http:',
      'https:',
      'mailto:',
    ];

    document
      .querySelectorAll('*')
      .forEach((element) => {
        Array.from(element.attributes).forEach(
          (attribute) => {
            const attributeName =
              attribute.name.toLowerCase();

            /*
             * Never allow inline event handlers.
             */
            if (
              attributeName.startsWith('on')
            ) {
              element.removeAttribute(
                attribute.name
              );

              return;
            }

            /*
             * Remove potentially dangerous
             * namespace attributes.
             */
            if (
              attributeName === 'xmlns' ||
              attributeName.startsWith('xlink:')
            ) {
              element.removeAttribute(
                attribute.name
              );

              return;
            }

            /*
             * Validate URL-bearing attributes.
             */
            if (
              attributeName === 'href' ||
              attributeName === 'src' ||
              attributeName === 'action' ||
              attributeName === 'formaction'
            ) {
              const rawValue =
                attribute.value.trim();

              /*
               * Fragment links are safe.
               */
              if (
                rawValue.startsWith('#')
              ) {
                return;
              }

              let parsedUrl;

              try {
                parsedUrl = new URL(
                  rawValue,
                  window.location.origin
                );
              } catch {
                element.removeAttribute(
                  attribute.name
                );

                return;
              }

              if (
                !allowedUrlProtocols.includes(
                  parsedUrl.protocol
                )
              ) {
                element.removeAttribute(
                  attribute.name
                );
              }
            }
          }
        );

        /*
         * External links open safely.
         */
        if (
          element.tagName.toLowerCase() === 'a'
        ) {
          const href =
            element.getAttribute('href');

          if (href) {
            element.setAttribute(
              'rel',
              'noopener noreferrer nofollow'
            );

            element.setAttribute(
              'target',
              '_blank'
            );
          }
        }
      });

    return document.body.innerHTML;
  } catch {
    return escapeHtml(html);
  }
}


// ── Markdown rendering ───────────────────────────────────────────────────────

function renderMarkdown(text) {
  const normalizedText =
    typeof text === 'string'
      ? text
      : String(text || '');

  if (!normalizedText.trim()) {
    return {
      __html: '',
    };
  }

  try {
    const parsed =
      marked.parse(normalizedText);

    return {
      __html: sanitizeMarkdownHtml(parsed),
    };
  } catch {
    return {
      __html: escapeHtml(normalizedText),
    };
  }
}


// ── Source normalization ─────────────────────────────────────────────────────

function normalizeSources(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }

  return sources
    .slice(0, MAX_SOURCE_ITEMS)
    .map((source, index) => {
      if (
        !source ||
        typeof source !== 'object'
      ) {
        return null;
      }

      const documentName =
        typeof source.document === 'string'
          ? source.document
            .trim()
            .slice(
              0,
              MAX_SOURCE_TEXT_LENGTH
            )
          : '';

      const page =
        Number.isInteger(source.page) &&
          source.page > 0
          ? source.page
          : null;

      if (
        !documentName &&
        page === null
      ) {
        return null;
      }

      return {
        id:
          `${documentName || 'source'}-${page ?? index}`,
        document:
          documentName || 'Source',
        page,
      };
    })
    .filter(Boolean);
}


// ── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="chat-message">
      <div
        className="chat-avatar assistant-avatar"
        aria-hidden="true"
      >
        BQ
      </div>

      <div className="chat-bubble-group">
        <span className="chat-sender">
          BodhaQ
        </span>

        <div
          className="chat-typing"
          role="status"
          aria-label="BodhaQ is thinking"
        >
          <span
            className="typing-dot"
            aria-hidden="true"
          />

          <span
            className="typing-dot"
            aria-hidden="true"
          />

          <span
            className="typing-dot"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}


// ── Single chat message ──────────────────────────────────────────────────────

function ChatMessage({ message }) {
  const isUser =
    message?.role === 'user';

  const content =
    typeof message?.content === 'string'
      ? message.content
      : getErrorMessage(
        message?.content
      );

  const sources =
    normalizeSources(
      message?.sources
    );

  return (
    <div
      className={`chat-message ${isUser
          ? 'user-message'
          : ''
        }`}
    >
      {/* Avatar */}

      <div
        className={`chat-avatar ${isUser
            ? 'user-avatar'
            : 'assistant-avatar'
          }`}
        aria-hidden="true"
      >
        {isUser ? 'You' : 'BQ'}
      </div>


      <div className="chat-bubble-group">
        {/* Sender */}

        <span className="chat-sender">
          {isUser
            ? 'You'
            : 'BodhaQ'}
        </span>


        {/* User message */}

        {isUser ? (
          <div
            className="chat-bubble user-bubble"
            dir="auto"
          >
            {content}
          </div>
        ) : (
          <>
            {/* Assistant response */}

            {content && (
              <div
                className="chat-bubble assistant-bubble chat-md"
                dangerouslySetInnerHTML={
                  renderMarkdown(content)
                }
                dir="auto"
              />
            )}


            {/* Sources */}

            {sources.length > 0 && (
              <div
                className="chat-sources"
                aria-label="Sources"
              >
                {sources.map(
                  (source) => (
                    <span
                      key={source.id}
                      className="chat-source-chip"
                      title={
                        source.page !== null
                          ? `${source.document} — page ${source.page}`
                          : source.document
                      }
                    >
                      <span
                        aria-hidden="true"
                      >
                        📄
                      </span>

                      <span>
                        {source.document}

                        {source.page !==
                          null &&
                          ` — p.${source.page}`}
                      </span>
                    </span>
                  )
                )}
              </div>
            )}


            {/* Error */}

            {message?.error && (
              <div
                className="chat-error-bubble"
                role="alert"
              >
                <span
                  aria-hidden="true"
                >
                  ⚠️
                </span>

                <span>
                  {getErrorMessage(
                    message.error
                  )}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


// ── Send icon ─────────────────────────────────────────────────────────────────

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <line
        x1="22"
        y1="2"
        x2="11"
        y2="13"
      />

      <polygon
        points="22 2 15 22 11 13 2 9 22 2"
      />
    </svg>
  );
}


// ── Main page ─────────────────────────────────────────────────────────────────

export default function DoubtsPage() {
  const [searchParams] =
    useSearchParams();


  // ── URL parameters ─────────────────────────────────────────────────────────

  const prefillDoc =
    searchParams.get(
      'document_id'
    ) || '';

  const prefill =
    searchParams.get(
      'prefill'
    ) || '';


  // ── State ──────────────────────────────────────────────────────────────────

  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    input,
    setInput,
  ] = useState(
    prefill
      ? `What is ${prefill}?`
      : ''
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    selectedSource,
    setSelectedSource,
  ] = useState(
    prefillDoc || 'general'
  );

  const [
    documents,
    setDocuments,
  ] = useState([]);

  const [
    docsLoading,
    setDocsLoading,
  ] = useState(false);

  const [
    docsError,
    setDocsError,
  ] = useState(false);


  // ── Refs ───────────────────────────────────────────────────────────────────

  const chatWindowRef =
    useRef(null);

  const textareaRef =
    useRef(null);


  // ── Fetch documents ────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function fetchDocuments() {
      setDocsLoading(true);
      setDocsError(false);

      try {
        const data =
          await listDocuments();

        if (cancelled) {
          return;
        }

        const nextDocuments =
          Array.isArray(
            data?.documents
          )
            ? data.documents.filter(
              (document) =>
                document &&
                typeof document ===
                'object' &&
                typeof document.document_id ===
                'string' &&
                document.document_id.trim() &&
                typeof document.filename ===
                'string'
            )
            : [];

        setDocuments(
          nextDocuments
        );
      } catch {
        if (!cancelled) {
          setDocuments([]);
          setDocsError(true);
        }
      } finally {
        if (!cancelled) {
          setDocsLoading(false);
        }
      }
    }

    fetchDocuments();

    return () => {
      cancelled = true;
    };
  }, []);


  // ── Keep selected document valid ───────────────────────────────────────────

  useEffect(() => {
    if (
      selectedSource === 'general'
    ) {
      return;
    }

    const exists =
      documents.some(
        (document) =>
          document.document_id ===
          selectedSource
      );

    if (
      !docsLoading &&
      !exists
    ) {
      setSelectedSource(
        'general'
      );
    }
  }, [
    documents,
    docsLoading,
    selectedSource,
  ]);


  // ── Auto-scroll ────────────────────────────────────────────────────────────

  const scrollToBottom =
    useCallback(() => {
      const element =
        chatWindowRef.current;

      if (!element) {
        return;
      }

      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth',
      });
    }, []);

  useEffect(() => {
    const frame =
      window.requestAnimationFrame(
        scrollToBottom
      );

    return () => {
      window.cancelAnimationFrame(
        frame
      );
    };
  }, [
    messages,
    loading,
    scrollToBottom,
  ]);


  // ── Auto-grow textarea ─────────────────────────────────────────────────────

  function resizeTextarea() {
    const element =
      textareaRef.current;

    if (!element) {
      return;
    }

    element.style.height =
      'auto';

    element.style.height =
      `${Math.min(
        element.scrollHeight,
        160
      )}px`;
  }

  function handleInputChange(event) {
    const value =
      event.target.value;

    if (
      value.length >
      MAX_QUESTION_LENGTH
    ) {
      return;
    }

    setInput(value);

    resizeTextarea();
  }


  // ── Send message ───────────────────────────────────────────────────────────

  async function handleSend(event) {
    event?.preventDefault();

    const trimmed =
      input.trim();

    if (
      !trimmed ||
      loading
    ) {
      return;
    }

    if (
      trimmed.length >
      MAX_QUESTION_LENGTH
    ) {
      return;
    }


    // Determine selected document.

    const documentId =
      selectedSource !== 'general'
        ? selectedSource
        : null;


    // Build bounded history.

    const history =
      messages
        .filter(
          (message) =>
            (
              message?.role ===
              'user' ||
              message?.role ===
              'assistant'
            ) &&
            typeof message?.content ===
            'string' &&
            message.content.trim()
        )
        .slice(
          -MAX_HISTORY_MESSAGES
        )
        .map(
          (message) => ({
            role: message.role,
            content:
              message.content,
          })
        );


    // Add user message immediately.

    const userMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmed,
    };

    setMessages(
      (previous) => [
        ...previous,
        userMessage,
      ]
    );


    // Clear input.

    setInput('');

    if (textareaRef.current) {
      textareaRef.current.style.height =
        'auto';
    }

    setLoading(true);


    try {
      const data =
        await askDoubt(
          trimmed,
          documentId,
          history
        );


      const answer =
        typeof data?.answer ===
          'string'
          ? data.answer.trim()
          : '';


      const sources =
        normalizeSources(
          data?.sources
        );


      const assistantMessage = {
        id: createMessageId(),
        role: 'assistant',
        content:
          answer ||
          'BodhaQ returned an empty response.',
        sources,
      };


      setMessages(
        (previous) => [
          ...previous,
          assistantMessage,
        ]
      );
    } catch (error) {
      const errorMessage =
        getErrorMessage(error);

      const assistantMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: '',
        sources: [],
        error:
          errorMessage ||
          'Something went wrong. Please try again.',
      };

      setMessages(
        (previous) => [
          ...previous,
          assistantMessage,
        ]
      );
    } finally {
      setLoading(false);
    }
  }


  // ── Keyboard handler ───────────────────────────────────────────────────────

  function handleKeyDown(event) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (!loading) {
        handleSend();
      }
    }
  }


  // ── Can send? ──────────────────────────────────────────────────────────────

  const trimmedInput =
    input.trim();

  const canSend =
    trimmedInput.length >= 1 &&
    trimmedInput.length <=
    MAX_QUESTION_LENGTH &&
    !loading;


  // ── Selected source name ───────────────────────────────────────────────────

  function sourceName() {
    if (
      selectedSource ===
      'general'
    ) {
      return '🌐 General';
    }

    const document =
      documents.find(
        (item) =>
          item.document_id ===
          selectedSource
      );

    if (document) {
      return `📄 ${document.filename}`;
    }

    return '📄 Material';
  }


  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="chat-page">

      {/*
       * Markdown-specific theme protection.
       *
       * marked generates:
       *
       *   <pre><code>...</code></pre>
       *
       * It does NOT generate the application's
       * .code-block class.
       *
       * Therefore these selectors are required
       * to prevent dark-background/dark-text
       * rendering in light mode.
       */}
      <style>{`
        .chat-md {
          color: var(--color-text, #0f172a);
          line-height: 1.7;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .chat-md > :first-child {
          margin-top: 0;
        }

        .chat-md > :last-child {
          margin-bottom: 0;
        }

        .chat-md h1,
        .chat-md h2,
        .chat-md h3,
        .chat-md h4,
        .chat-md h5,
        .chat-md h6 {
          color: var(--color-text, #0f172a);
          line-height: 1.3;
          margin-top: 1.25em;
          margin-bottom: 0.55em;
          font-weight: 700;
        }

        .chat-md h1 {
          font-size: 1.45rem;
        }

        .chat-md h2 {
          font-size: 1.3rem;
        }

        .chat-md h3 {
          font-size: 1.15rem;
        }

        .chat-md h4,
        .chat-md h5,
        .chat-md h6 {
          font-size: 1rem;
        }

        .chat-md p {
          color: var(--color-text, #0f172a);
          margin: 0.65em 0;
        }

        .chat-md strong {
          color: var(--color-text, #0f172a);
          font-weight: 700;
        }

        .chat-md em {
          color: var(--color-text, #0f172a);
        }

        .chat-md a {
          color: var(--color-primary, #2563eb);
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .chat-md a:hover {
          opacity: 0.82;
        }

        .chat-md ul,
        .chat-md ol {
          color: var(--color-text, #0f172a);
          margin: 0.7em 0;
          padding-left: 1.6rem;
        }

        .chat-md li {
          color: var(--color-text, #0f172a);
          margin: 0.3em 0;
        }

        .chat-md li::marker {
          color: var(--color-primary, #2563eb);
        }

        .chat-md blockquote {
          color: var(--color-text, #0f172a);
          background: var(--color-surface-2, rgba(127, 127, 127, 0.08));
          border-left: 4px solid var(--color-primary, #2563eb);
          margin: 1em 0;
          padding: 0.7em 1em;
          border-radius: 0 8px 8px 0;
        }

        .chat-md blockquote p {
          margin: 0;
        }

        /*
         * Inline code.
         */
        .chat-md :not(pre) > code {
          background: var(--color-surface-2, rgba(127, 127, 127, 0.12));
          color: var(--color-text, #0f172a);
          border: 1px solid var(--color-border, rgba(127, 127, 127, 0.22));
          border-radius: 5px;
          padding: 0.12em 0.4em;
          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            "Liberation Mono",
            "Courier New",
            monospace;
          font-size: 0.9em;
        }

        /*
         * Fenced code blocks.
         *
         * IMPORTANT:
         * marked produces <pre><code>.
         *
         * The code text is explicitly light so it
         * remains readable on the dark code surface
         * in both light and dark application themes.
         */
        .chat-md pre {
          background: #0f172a;
          color: #f8fafc;
          border: 1px solid rgba(148, 163, 184, 0.28);
          border-radius: 10px;
          margin: 1em 0;
          padding: 1rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          box-shadow: none;
        }

        .chat-md pre code {
          display: block;
          background: transparent;
          color: #f8fafc;
          border: 0;
          border-radius: 0;
          padding: 0;
          margin: 0;
          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            "Liberation Mono",
            "Courier New",
            monospace;
          font-size: 0.9rem;
          line-height: 1.65;
          white-space: pre;
          overflow: visible;
        }

        .chat-md table {
          width: 100%;
          max-width: 100%;
          margin: 1em 0;
          border-collapse: collapse;
          display: block;
          overflow-x: auto;
          color: var(--color-text, #0f172a);
        }

        .chat-md th,
        .chat-md td {
          color: var(--color-text, #0f172a);
          background: var(--color-surface, transparent);
          border: 1px solid var(--color-border, rgba(127, 127, 127, 0.25));
          padding: 0.55rem 0.7rem;
          text-align: left;
          vertical-align: top;
        }

        .chat-md th {
          background: var(--color-surface-2, rgba(127, 127, 127, 0.08));
          font-weight: 700;
        }

        .chat-md hr {
          border: 0;
          border-top: 1px solid var(--color-border, rgba(127, 127, 127, 0.25));
          margin: 1.25rem 0;
        }

        .chat-md img {
          display: block;
          max-width: 100%;
          height: auto;
          border-radius: 8px;
        }

        .chat-md del {
          color: var(--color-text-muted, #64748b);
        }

        .chat-md mark {
          background: var(--color-surface-2, rgba(250, 204, 21, 0.25));
          color: var(--color-text, #0f172a);
          border-radius: 3px;
          padding: 0 0.15em;
        }

        .chat-input-help {
          color: var(--color-text-muted, #64748b);
        }

        .chat-docs-notice {
          color: var(--color-text-muted, #64748b);
        }

        @media (max-width: 640px) {
          .chat-md pre {
            padding: 0.8rem;
            border-radius: 8px;
          }

          .chat-md pre code {
            font-size: 0.82rem;
          }

          .chat-md table {
            font-size: 0.88rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .chat-md a {
            scroll-behavior: auto;
          }
        }
      `}</style>


      {/* Header */}

      <header className="chat-header">
        <h1>Doubts</h1>

        <p>
          Ask anything about what
          you're learning. Switch
          sources freely — the
          conversation continues.
        </p>
      </header>


      {/* Chat window */}

      <div
        className="chat-window"
        ref={chatWindowRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {/* Empty state */}

        {messages.length === 0 &&
          !loading && (
            <div className="chat-empty-state">
              <div
                className="chat-empty-icon"
                aria-hidden="true"
              >
                💬
              </div>

              <h3>
                Ask BodhaQ anything
              </h3>

              <p>
                Type a question below.
                Select{' '}
                <strong>
                  General
                </strong>{' '}
                for broad knowledge
                or choose an uploaded
                document for grounded
                answers.
              </p>

              {docsError && (
                <p
                  className="chat-docs-notice"
                  role="status"
                >
                  Uploaded materials
                  could not be loaded.
                  You can still use
                  General mode.
                </p>
              )}
            </div>
          )}


        {/* Messages */}

        {messages.map(
          (message, index) => (
            <ChatMessage
              key={
                message.id ||
                `message-${index}`
              }
              message={message}
            />
          )
        )}


        {/* Typing */}

        {loading && (
          <TypingIndicator />
        )}
      </div>


      {/* Input bar */}

      <div className="chat-input-bar">

        {/* Source selector */}

        <div className="chat-source-selector">
          <label
            htmlFor="chat-source"
            className="chat-source-label"
          >
            Source:
          </label>

          <select
            id="chat-source"
            className="chat-source-select"
            value={selectedSource}
            onChange={(event) =>
              setSelectedSource(
                event.target.value
              )
            }
            aria-label="Select knowledge source"
            disabled={loading}
          >
            <option value="general">
              🌐 General
            </option>

            {documents.length > 0 && (
              <optgroup label="Uploaded materials">
                {documents.map(
                  (document) => (
                    <option
                      key={
                        document.document_id
                      }
                      value={
                        document.document_id
                      }
                    >
                      📄{' '}
                      {document.filename}
                    </option>
                  )
                )}
              </optgroup>
            )}

            {docsLoading && (
              <option disabled>
                Loading documents…
              </option>
            )}
          </select>
        </div>


        {/* Text input */}

        <form
          onSubmit={handleSend}
          className="chat-input-row"
          noValidate
        >
          <textarea
            ref={textareaRef}
            id="doubt-input"
            className="chat-textarea"
            placeholder={`Ask a doubt… (${sourceName()})`}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={
              MAX_QUESTION_LENGTH
            }
            aria-label="Type your question"
            aria-describedby="doubt-input-help"
            disabled={loading}
            autoComplete="off"
            spellCheck="true"
          />

          <button
            type="submit"
            className="chat-send-btn"
            disabled={!canSend}
            aria-label={
              loading
                ? 'Sending message'
                : 'Send message'
            }
            title="Send (Enter)"
            aria-busy={loading}
          >
            <SendIcon />
          </button>
        </form>


        {/* Input helper */}

        <div
          id="doubt-input-help"
          className="chat-input-help"
          aria-live="polite"
        >
          <span>
            Enter to send · Shift+Enter
            for a new line
          </span>

          <span>
            {input.length}/
            {MAX_QUESTION_LENGTH}
          </span>
        </div>
      </div>
    </div>
  );
}