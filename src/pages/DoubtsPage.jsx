/**
 * DoubtsPage — Continuous AI chat with Markdown rendering and source selection.
 *
 * Features:
 *   - Persistent conversation history
 *   - Source selector: General | uploaded document
 *   - Switching source does NOT reset the conversation
 *   - Conversation history sent to backend
 *   - Markdown rendering
 *   - Typing indicator
 *   - Enter to send, Shift+Enter for new line
 *   - Auto-scroll to latest message
 *   - Safe error rendering
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


// ── Configure marked ──────────────────────────────────────────────────────────

marked.setOptions({
  gfm: true,
  breaks: true,
});


// ── Safe error conversion ────────────────────────────────────────────────────

function getErrorMessage(error) {
  if (!error) {
    return 'Something went wrong. Please try again.';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message || 'Something went wrong. Please try again.';
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
      typeof error.detail.error === 'string'
    ) {
      return error.detail.error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Something went wrong. Please try again.';
    }
  }

  return String(error);
}


// ── Markdown rendering ───────────────────────────────────────────────────────

function renderMarkdown(text) {
  try {
    return {
      __html: marked.parse(
        typeof text === 'string'
          ? text
          : String(text || '')
      ),
    };
  } catch {
    return {
      __html: String(text || ''),
    };
  }
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
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  );
}


// ── Single chat message ──────────────────────────────────────────────────────

function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  const content =
    typeof message.content === 'string'
      ? message.content
      : getErrorMessage(message.content);


  return (
    <div
      className={`chat-message ${isUser ? 'user-message' : ''
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
          {isUser ? 'You' : 'BodhaQ'}
        </span>


        {/* User message */}
        {isUser ? (
          <div className="chat-bubble user-bubble">
            {content}
          </div>
        ) : (
          <>

            {/* Assistant response */}
            {content && (
              <div
                className="chat-bubble assistant-bubble chat-md"
                dangerouslySetInnerHTML={renderMarkdown(content)}
                aria-live="polite"
              />
            )}


            {/* Sources */}
            {Array.isArray(message.sources) &&
              message.sources.length > 0 && (
                <div
                  className="chat-sources"
                  aria-label="Sources"
                >
                  {message.sources.map(
                    (src, index) => (
                      <span
                        key={`${src.document || 'source'}-${src.page || index}`}
                        className="chat-source-chip"
                      >
                        📄 {src.document}

                        {src.page != null &&
                          ` — p.${src.page}`}
                      </span>
                    )
                  )}
                </div>
              )}


            {/* Error */}
            {message.error && (
              <div
                className="chat-error-bubble"
                role="alert"
              >
                ⚠️ {getErrorMessage(message.error)}
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
    searchParams.get('document_id') || '';

  const prefill =
    searchParams.get('prefill') || '';


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


  // 'general' OR document_id

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


  const chatWindowRef =
    useRef(null);


  const textareaRef =
    useRef(null);


  // ── Fetch documents ────────────────────────────────────────────────────────

  useEffect(() => {

    let cancelled = false;


    async function fetchDocuments() {

      setDocsLoading(true);

      try {

        const data =
          await listDocuments();


        if (!cancelled) {

          setDocuments(
            Array.isArray(data?.documents)
              ? data.documents
              : []
          );

        }

      } catch (_) {

        if (!cancelled) {
          setDocuments([]);
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


  // ── Auto-scroll ────────────────────────────────────────────────────────────

  const scrollToBottom =
    useCallback(() => {

      if (chatWindowRef.current) {

        chatWindowRef.current.scrollTop =
          chatWindowRef.current.scrollHeight;

      }

    }, []);


  useEffect(() => {

    scrollToBottom();

  }, [
    messages,
    loading,
    scrollToBottom,
  ]);


  // ── Auto-grow textarea ─────────────────────────────────────────────────────

  function handleInputChange(event) {

    const value =
      event.target.value;


    setInput(value);


    const element =
      textareaRef.current;


    if (element) {

      element.style.height =
        'auto';


      element.style.height =
        `${Math.min(
          element.scrollHeight,
          160
        )}px`;

    }

  }


  // ── Send message ───────────────────────────────────────────────────────────

  async function handleSend(event) {

    event?.preventDefault();


    const trimmed =
      input.trim();


    if (!trimmed || loading) {
      return;
    }


    // Determine selected document.

    const documentId =
      selectedSource !== 'general'
        ? selectedSource
        : null;


    // Build history from existing messages.

    const history =
      messages
        .filter(
          (message) =>
            (
              message.role === 'user' ||
              message.role === 'assistant'
            ) &&
            typeof message.content === 'string' &&
            message.content.trim()
        )
        .map(
          (message) => ({
            role: message.role,
            content: message.content,
          })
        );


    // Add user's message immediately.

    const userMessage = {
      role: 'user',
      content: trimmed,
    };


    setMessages(
      (previous) => [
        ...previous,
        userMessage,
      ]
    );


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
        typeof data?.answer === 'string'
          ? data.answer
          : 'BodhaQ returned an empty response.';


      const sources =
        Array.isArray(data?.sources)
          ? data.sources
          : [];


      const assistantMessage = {
        role: 'assistant',
        content: answer,
        sources,
      };


      setMessages(
        (previous) => [
          ...previous,
          assistantMessage,
        ]
      );

    } catch (error) {

      /*
       * IMPORTANT:
       *
       * Never store/render the complete error object.
       *
       * This prevents:
       *
       *     ⚠️ [object Object]
       *
       * from appearing in the chat.
       */

      const errorMessage =
        getErrorMessage(error);


      const assistantMessage = {
        role: 'assistant',
        content: '',
        sources: [],
        error: errorMessage,
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

      handleSend();

    }

  }


  // ── Can send? ──────────────────────────────────────────────────────────────

  const canSend =
    input.trim().length >= 1 &&
    !loading;


  // ── Selected source name ───────────────────────────────────────────────────

  function sourceName() {

    if (
      selectedSource === 'general'
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

      {/* Header */}

      <header className="chat-header">

        <h1>Doubts</h1>

        <p>
          Ask anything about what you're
          learning. Switch sources freely —
          the conversation continues.
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

              <div className="chat-empty-icon">
                💬
              </div>

              <h3>
                Ask BodhaQ anything
              </h3>

              <p>
                Type a question below.
                Select <strong>General</strong>
                {' '}
                for broad knowledge or choose
                an uploaded document for grounded
                answers.
              </p>

            </div>

          )}


        {/* Messages */}

        {messages.map(
          (message, index) => (

            <ChatMessage
              key={`${message.role}-${index}`}
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
                      key={document.document_id}
                      value={document.document_id}
                    >
                      📄 {document.filename}
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
            aria-label="Type your question"
            disabled={loading}
          />


          <button
            type="submit"
            className="chat-send-btn"
            disabled={!canSend}
            aria-label="Send message"
            title="Send (Enter)"
          >
            <SendIcon />
          </button>

        </form>

      </div>

    </div>

  );
}