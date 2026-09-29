/**
 * BodhaQ API Client
 *
 * Centralises:
 * - Base URL
 * - Anonymous session creation and session headers
 * - BYOK Gemini/Tavily request headers
 * - JSON parsing
 * - Multipart requests
 * - HTTP error handling
 *
 * Security model:
 * - Gemini/Tavily API keys are stored only in sessionStorage.
 * - API keys are sent to the backend only through request headers.
 * - API keys are never persisted in the database by the backend.
 * - API keys are never logged by this client.
 * - Closing the browser tab/session clears sessionStorage.
 */

const API_BASE = (
  import.meta.env.VITE_API_BASE || 'http://localhost:8000'
).replace(/\/+$/, '');

const SESSION_STORAGE_KEY = 'bodhaq_session_token';
const GEMINI_API_KEY_STORAGE = 'bodhaq_user_api_key';
const TAVILY_API_KEY_STORAGE = 'bodhaq_tavily_api_key';

const SESSION_ENDPOINT = '/api/session';
const PUBLIC_PATHS = new Set([
  '/',
  '/health',
  SESSION_ENDPOINT,
]);

/**
 * Map known backend error codes to user-friendly messages.
 */
const ERROR_MESSAGES = {
  AI_AUTHENTICATION_FAILED:
    'BodhaQ could not authenticate with Gemini. Please check your Gemini API key.',

  AI_SERVICE_UNAVAILABLE:
    'BodhaQ could not reach the AI service right now. Please try again later.',

  LEARNING_GENERATION_FAILED:
    'BodhaQ could not generate the learning content. Please try again.',

  INVALID_LEARNING_REQUEST:
    'Please enter a valid learning topic.',

  DOCUMENT_NOT_FOUND:
    'This learning material is no longer available.',

  DOCUMENT_PROCESSING_ERROR:
    'There was a problem processing this document. Please check the file and try again.',

  UNSUPPORTED_FILE_TYPE:
    'This file type is not supported. Please upload a PDF, PPTX, or DOCX.',

  FILE_TOO_LARGE:
    'The file exceeds the 50 MB size limit.',

  INVALID_API_KEY:
    'The API key could not be verified. Please check your API key and try again.',

  RATE_LIMITED:
    'The AI service rate limit was reached. Please wait a moment and try again.',

  MODEL_UNAVAILABLE:
    'The AI model is currently unavailable. Please try again later.',

  INVALID_QUIZ_REQUEST:
    'Invalid quiz request. Please check your inputs.',

  INVALID_PRACTICE_REQUEST:
    'Invalid practice request.',

  QUIZ_NOT_FOUND:
    'Quiz not found. It may have expired or been cleared.',

  QUIZ_NOT_SUBMITTED:
    'This quiz has not been submitted yet.',

  INVALID_SESSION:
    'Your BodhaQ session has expired. A new session will be created automatically.',

  INVALID_REQUEST:
    'Some of the provided information is invalid. Please check your inputs.',

  NETWORK_ERROR:
    'Unable to connect to the BodhaQ backend. Make sure the backend server is running.',

  INVALID_RESPONSE:
    'The server returned an invalid response.',

  UNKNOWN_ERROR:
    'Something went wrong. Please try again.',
};


/**
 * Safely read a value from sessionStorage.
 *
 * sessionStorage can theoretically be unavailable in some
 * browser/privacy configurations, so storage access is guarded.
 */
function readSessionStorage(key) {
  try {
    return sessionStorage.getItem(key) || '';
  } catch (_) {
    return '';
  }
}


/**
 * Safely write a value to sessionStorage.
 */
function writeSessionStorage(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch (_) {
    /*
     * Do not expose storage internals to the user.
     * Requests will simply fail normally if the browser
     * does not allow sessionStorage.
     */
  }
}


/**
 * Safely remove a value from sessionStorage.
 */
function removeSessionStorage(key) {
  try {
    sessionStorage.removeItem(key);
  } catch (_) {
    /*
     * Ignore storage cleanup failures.
     */
  }
}


/**
 * Build JSON request headers.
 */
function buildHeaders(extra = {}) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...extra,
  };
}


/**
 * Build request headers that include the current
 * BodhaQ anonymous session and BYOK credentials.
 *
 * Explicit headers passed by a caller take precedence.
 */
function buildAuthenticatedHeaders(extra = {}) {
  const sessionToken = readSessionStorage(
    SESSION_STORAGE_KEY
  );

  const geminiApiKey = readSessionStorage(
    GEMINI_API_KEY_STORAGE
  );

  const tavilyApiKey = readSessionStorage(
    TAVILY_API_KEY_STORAGE
  );

  const headers = {
    ...buildHeaders(),
  };

  if (sessionToken) {
    headers['X-BodhaQ-Session'] = sessionToken;
  }

  if (geminiApiKey) {
    headers['X-Gemini-API-Key'] = geminiApiKey;
  }

  if (tavilyApiKey) {
    headers['X-Tavily-API-Key'] = tavilyApiKey;
  }

  /*
   * Explicit caller headers override automatically
   * generated headers.
   */
  return {
    ...headers,
    ...extra,
  };
}


/**
 * Safely convert any backend error value into a string.
 *
 * Prevents values such as:
 *
 *     [object Object]
 *
 * from appearing in the UI.
 */
function stringifyError(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === 'object') {
    if (typeof value.error === 'string') {
      return value.error;
    }

    if (typeof value.message === 'string') {
      return value.message;
    }

    /*
     * FastAPI validation errors commonly return:
     *
     * {
     *   "detail": [
     *     {
     *       "loc": [...],
     *       "msg": "...",
     *       "type": "..."
     *     }
     *   ]
     * }
     */
    if (Array.isArray(value)) {
      const messages = value
        .map((item) => {
          if (typeof item === 'string') {
            return item;
          }

          if (
            item &&
            typeof item.msg === 'string'
          ) {
            return item.msg;
          }

          if (
            item &&
            typeof item.message === 'string'
          ) {
            return item.message;
          }

          return '';
        })
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join(' ');
      }
    }

    try {
      return JSON.stringify(value);
    } catch (_) {
      return 'Unknown server error.';
    }
  }

  return String(value);
}


/**
 * Return a user-friendly error message.
 */
function friendlyError(code, fallback) {
  return (
    ERROR_MESSAGES[code] ||
    stringifyError(fallback) ||
    'Something went wrong. Please try again.'
  );
}


/**
 * Extract an error code and message from a FastAPI response.
 */
function parseBackendError(errorData, status) {
  const detail = errorData?.detail ?? null;

  /*
   * Current BodhaQ backend commonly returns:
   *
   * detail: {
   *   error: "...",
   *   code: "..."
   * }
   */
  if (
    detail &&
    typeof detail === 'object' &&
    !Array.isArray(detail)
  ) {
    const code =
      detail.code ||
      errorData?.code ||
      'UNKNOWN_ERROR';

    const message =
      detail.error ||
      detail.message ||
      errorData?.message ||
      `HTTP ${status}`;

    return {
      code: String(code),
      message: friendlyError(code, message),
    };
  }

  /*
   * FastAPI validation errors may return:
   *
   * detail: [...]
   */
  if (Array.isArray(detail)) {
    return {
      code:
        errorData?.code ||
        'INVALID_REQUEST',

      message: friendlyError(
        errorData?.code ||
        'INVALID_REQUEST',
        stringifyError(detail)
      ),
    };
  }

  /*
   * Some endpoints may return:
   *
   * detail: "some message"
   */
  if (typeof detail === 'string') {
    return {
      code:
        errorData?.code ||
        'UNKNOWN_ERROR',

      message: friendlyError(
        errorData?.code ||
        'UNKNOWN_ERROR',
        detail
      ),
    };
  }

  return {
    code:
      errorData?.code ||
      'UNKNOWN_ERROR',

    message: friendlyError(
      errorData?.code ||
      'UNKNOWN_ERROR',

      errorData?.message ||
      `HTTP ${status}`
    ),
  };
}


/**
 * Determine whether the path is public and therefore
 * does not need an anonymous session.
 */
function isPublicPath(path) {
  const normalizedPath = path.startsWith('/')
    ? path
    : `/${path}`;

  return PUBLIC_PATHS.has(normalizedPath);
}


/**
 * Create a new anonymous BodhaQ session.
 *
 * This is intentionally the only request that does not
 * require an existing session token.
 */
async function createSession() {
  let response;

  try {
    response = await fetch(
      `${API_BASE}${SESSION_ENDPOINT}`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const err = new Error(
      'Unable to connect to the BodhaQ backend. Make sure the backend server is running.'
    );

    err.code = 'NETWORK_ERROR';
    err.status = 0;
    err.details = error;

    throw err;
  }

  if (!response.ok) {
    let errorData = null;

    try {
      errorData = await response.json();
    } catch (_) {
      /*
       * Backend did not return JSON.
       */
    }

    const parsed = parseBackendError(
      errorData,
      response.status
    );

    const err = new Error(
      parsed.message
    );

    err.code = parsed.code;
    err.status = response.status;
    err.details = errorData;

    throw err;
  }

  let data;

  try {
    data = await response.json();
  } catch (_) {
    const err = new Error(
      'The server returned an invalid session response.'
    );

    err.code = 'INVALID_RESPONSE';
    err.status = response.status;

    throw err;
  }

  if (
    !data ||
    typeof data.session_token !== 'string' ||
    !data.session_token.trim()
  ) {
    const err = new Error(
      'The server returned an invalid session response.'
    );

    err.code = 'INVALID_RESPONSE';
    err.status = response.status;

    throw err;
  }

  writeSessionStorage(
    SESSION_STORAGE_KEY,
    data.session_token
  );

  return data.session_token;
}


/**
 * Ensure that the browser has a valid BodhaQ session.
 *
 * Multiple components can request data during initial
 * application startup. A shared promise prevents them
 * from creating multiple sessions simultaneously.
 */
let sessionPromise = null;

async function ensureSession() {
  const existingToken = readSessionStorage(
    SESSION_STORAGE_KEY
  );

  if (existingToken) {
    return existingToken;
  }

  if (!sessionPromise) {
    sessionPromise = createSession()
      .finally(() => {
        sessionPromise = null;
      });
  }

  return sessionPromise;
}


/**
 * Clear the current session token.
 */
function clearSession() {
  removeSessionStorage(
    SESSION_STORAGE_KEY
  );
}


/**
 * Core HTTP request function.
 *
 * Throws:
 *
 *     Error {
 *       message,
 *       code,
 *       status,
 *       details
 *     }
 */
async function request(
  path,
  options = {},
  retryAfterSessionRefresh = true
) {
  if (
    typeof path !== 'string' ||
    !path.trim()
  ) {
    const err = new Error(
      'Invalid API request path.'
    );

    err.code = 'INVALID_REQUEST';
    err.status = 0;

    throw err;
  }

  const normalizedPath = path.startsWith('/')
    ? path
    : `/${path}`;

  const publicPath = isPublicPath(
    normalizedPath
  );

  /*
   * Protected API requests require an anonymous session.
   *
   * /api/session itself is excluded to avoid recursion.
   */
  if (!publicPath) {
    await ensureSession();
  }

  const automaticHeaders = publicPath
    ? buildHeaders()
    : buildAuthenticatedHeaders();

  const url = `${API_BASE}${normalizedPath}`;

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...automaticHeaders,
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    const err = new Error(
      'Unable to connect to the BodhaQ backend. Make sure the backend server is running.'
    );

    err.code = 'NETWORK_ERROR';
    err.status = 0;
    err.details = error;

    throw err;
  }


  /*
   * If the anonymous session is invalid or expired,
   * create one new session and retry the original
   * request exactly once.
   *
   * This prevents infinite retry loops.
   */
  if (
    response.status === 401 &&
    !publicPath &&
    retryAfterSessionRefresh
  ) {
    let errorData = null;

    try {
      errorData = await response.json();
    } catch (_) {
      /*
       * Non-JSON 401 response.
       */
    }

    const parsed = parseBackendError(
      errorData,
      response.status
    );

    if (parsed.code === 'INVALID_SESSION') {
      clearSession();

      await ensureSession();

      return request(
        normalizedPath,
        options,
        false
      );
    }

    /*
     * The 401 was caused by something other than
     * the anonymous session, such as an invalid BYOK key.
     * Continue through normal error handling below.
     */

    const err = new Error(
      parsed.message
    );

    err.code = parsed.code;
    err.status = response.status;
    err.details = errorData;

    throw err;
  }


  if (!response.ok) {
    let errorData = null;

    try {
      errorData = await response.json();
    } catch (_) {
      /*
       * Backend did not return JSON.
       * The HTTP status will be used below.
       */
    }

    const parsed = parseBackendError(
      errorData,
      response.status
    );

    const err = new Error(
      parsed.message
    );

    err.code = parsed.code;
    err.status = response.status;

    /*
     * Preserve the original backend response for
     * debugging without displaying it automatically.
     *
     * This response should never contain API keys because
     * the backend must not return them.
     */
    err.details = errorData;

    throw err;
  }


  /*
   * 204 No Content
   */
  if (response.status === 204) {
    return null;
  }


  /*
   * Some successful endpoints may legitimately return
   * an empty body. Read the response as text first so that
   * an empty successful response does not become an
   * "invalid response" error.
   */
  let responseText;

  try {
    responseText = await response.text();
  } catch (_) {
    const err = new Error(
      'Unable to read the server response.'
    );

    err.code = 'INVALID_RESPONSE';
    err.status = response.status;

    throw err;
  }


  if (!responseText.trim()) {
    return null;
  }


  try {
    return JSON.parse(responseText);
  } catch (_) {
    const err = new Error(
      'The server returned an invalid response.'
    );

    err.code = 'INVALID_RESPONSE';
    err.status = response.status;

    throw err;
  }
}


/**
 * GET request.
 *
 * Optional headers allow individual callers to override
 * or add request-specific headers.
 */
export function get(
  path,
  headers = {}
) {
  return request(
    path,
    {
      method: 'GET',
      headers,
    }
  );
}


/**
 * POST request with JSON body.
 *
 * Optional headers support request-scoped BYOK keys
 * and other endpoint-specific headers.
 */
export function post(
  path,
  body = {},
  headers = {}
) {
  return request(
    path,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    }
  );
}


/**
 * DELETE request.
 *
 * Optional headers allow individual callers to override
 * or add request-specific headers.
 */
export function del(
  path,
  headers = {}
) {
  return request(
    path,
    {
      method: 'DELETE',
      headers,
    }
  );
}


/**
 * POST multipart/form-data.
 *
 * Content-Type is intentionally NOT set.
 * The browser automatically generates the correct
 * multipart boundary for FormData.
 *
 * Session and BYOK headers are still automatically added
 * by the core request function.
 */
export function postForm(
  path,
  formData,
  headers = {}
) {
  if (!(formData instanceof FormData)) {
    const err = new Error(
      'Invalid multipart request. Expected FormData.'
    );

    err.code = 'INVALID_REQUEST';
    err.status = 0;

    return Promise.reject(err);
  }

  return request(
    path,
    {
      method: 'POST',
      headers,
      body: formData,
    }
  );
}


/**
 * Expose the session helpers only when explicitly needed
 * by the application.
 *
 * Most pages should simply use get/post/postForm/del;
 * session creation is automatic.
 */
export {
  ensureSession,
  clearSession,
};


export default {
  get,
  post,
  del,
  postForm,
  ensureSession,
  clearSession,
};