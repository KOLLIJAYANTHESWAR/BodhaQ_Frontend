/**
 * BodhaQ API Client
 *
 * Responsibilities:
 * - Central API base URL
 * - Anonymous session management
 * - Session authentication headers
 * - Optional BYOK Gemini/Tavily headers
 * - JSON requests
 * - Multipart requests
 * - Backend error normalization
 *
 * Security model:
 * - Session credentials are stored only in sessionStorage.
 * - Gemini/Tavily keys are stored only in sessionStorage.
 * - Provider keys are sent only when explicitly required by an API call.
 * - Provider keys are never stored by the backend.
 * - Provider keys are never logged by this client.
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

  TAVILY_AUTHENTICATION_FAILED:
    'BodhaQ could not authenticate with Tavily. Please check your Tavily API key.',

  TAVILY_SERVICE_UNAVAILABLE:
    'BodhaQ could not reach Tavily right now. Please try again later.',

  TAVILY_RATE_LIMITED:
    'Tavily rate limit reached. Please wait a moment and try again.',

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
 * Safely read from sessionStorage.
 */
function readSessionStorage(key) {
  try {
    return sessionStorage.getItem(key) || '';
  } catch {
    return '';
  }
}


/**
 * Safely write to sessionStorage.
 */
function writeSessionStorage(key, value) {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}


/**
 * Safely remove from sessionStorage.
 */
function removeSessionStorage(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
}


/**
 * Build standard JSON headers.
 *
 * IMPORTANT:
 * This helper is only used for JSON requests.
 * Multipart requests must bypass the JSON Content-Type header
 * so that the browser can generate the multipart boundary.
 */
function buildHeaders(extra = {}) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...extra,
  };
}


/**
 * Build headers for protected requests.
 *
 * The session token is attached automatically.
 * Provider keys are attached only when explicitly requested.
 *
 * `isMultipart` is used to prevent this function from adding
 * `Content-Type: application/json` to FormData requests.
 */
function buildAuthenticatedHeaders({
  includeGeminiKey = false,
  includeTavilyKey = false,
  extra = {},
  isMultipart = false,
} = {}) {
  const headers = isMultipart
    ? {
      Accept: 'application/json',
    }
    : buildHeaders();

  const sessionToken = readSessionStorage(
    SESSION_STORAGE_KEY
  );

  if (sessionToken) {
    headers['X-BodhaQ-Session'] = sessionToken;
  }

  if (includeGeminiKey) {
    const geminiApiKey = readSessionStorage(
      GEMINI_API_KEY_STORAGE
    );

    if (geminiApiKey) {
      headers['X-Gemini-API-Key'] = geminiApiKey;
    }
  }

  if (includeTavilyKey) {
    const tavilyApiKey = readSessionStorage(
      TAVILY_API_KEY_STORAGE
    );

    if (tavilyApiKey) {
      headers['X-Tavily-API-Key'] = tavilyApiKey;
    }
  }

  return {
    ...headers,
    ...extra,
  };
}


/**
 * Convert arbitrary backend error data into readable text.
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

    return messages.join(' ');
  }

  if (typeof value === 'object') {
    if (typeof value.error === 'string') {
      return value.error;
    }

    if (typeof value.message === 'string') {
      return value.message;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return 'Unknown server error.';
    }
  }

  return String(value);
}


/**
 * Convert a backend error code into a user-facing message.
 *
 * Known errors use controlled frontend messages.
 * Unknown backend messages are preserved when available.
 */
function friendlyError(code, fallback) {
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  const message = stringifyError(fallback);

  return (
    message ||
    'Something went wrong. Please try again.'
  );
}


/**
 * Extract a normalized error from a FastAPI response.
 */
function parseBackendError(errorData, status) {
  const detail = errorData?.detail ?? null;

  if (
    detail &&
    typeof detail === 'object' &&
    !Array.isArray(detail)
  ) {
    const code = String(
      detail.code ||
      errorData?.code ||
      'UNKNOWN_ERROR'
    );

    const message =
      detail.error ||
      detail.message ||
      errorData?.message ||
      `HTTP ${status}`;

    return {
      code,
      message: friendlyError(code, message),
    };
  }

  if (Array.isArray(detail)) {
    const code = String(
      errorData?.code ||
      'INVALID_REQUEST'
    );

    return {
      code,
      message: friendlyError(
        code,
        stringifyError(detail)
      ),
    };
  }

  if (typeof detail === 'string') {
    const code = String(
      errorData?.code ||
      'UNKNOWN_ERROR'
    );

    return {
      code,
      message: friendlyError(code, detail),
    };
  }

  const code = String(
    errorData?.code ||
    'UNKNOWN_ERROR'
  );

  return {
    code,
    message: friendlyError(
      code,
      errorData?.message ||
      `HTTP ${status}`
    ),
  };
}


/**
 * Normalize an API path.
 */
function normalizePath(path) {
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

  return path.startsWith('/')
    ? path
    : `/${path}`;
}


/**
 * Determine whether an endpoint is public.
 */
function isPublicPath(path) {
  return PUBLIC_PATHS.has(
    normalizePath(path)
  );
}


/**
 * Create a new anonymous BodhaQ session.
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
      ERROR_MESSAGES.NETWORK_ERROR
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
    } catch {
      // Backend returned a non-JSON error.
    }

    const parsed = parseBackendError(
      errorData,
      response.status
    );

    const err = new Error(parsed.message);

    err.code = parsed.code;
    err.status = response.status;
    err.details = errorData;

    throw err;
  }

  let data;

  try {
    data = await response.json();
  } catch {
    const err = new Error(
      'The server returned an invalid session response.'
    );

    err.code = 'INVALID_RESPONSE';
    err.status = response.status;

    throw err;
  }

  if (
    !data ||
    typeof data.session_id !== 'string' ||
    !data.session_id.trim() ||
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

  const stored = writeSessionStorage(
    SESSION_STORAGE_KEY,
    data.session_token
  );

  if (!stored) {
    const err = new Error(
      'BodhaQ could not initialize browser session storage.'
    );

    err.code = 'INVALID_RESPONSE';
    err.status = 0;

    throw err;
  }

  return data.session_token;
}


/**
 * Prevent multiple simultaneous session creation requests.
 */
let sessionPromise = null;


/**
 * Ensure that an anonymous session exists.
 */
async function ensureSession() {
  const existingToken = readSessionStorage(
    SESSION_STORAGE_KEY
  );

  if (existingToken) {
    return existingToken;
  }

  if (!sessionPromise) {
    sessionPromise = createSession().finally(() => {
      sessionPromise = null;
    });
  }

  return sessionPromise;
}


/**
 * Clear the current anonymous session.
 */
function clearSession() {
  removeSessionStorage(
    SESSION_STORAGE_KEY
  );
}


/**
 * Core HTTP request function.
 *
 * options may contain:
 *
 * {
 *   method,
 *   headers,
 *   body,
 *   includeGeminiKey,
 *   includeTavilyKey
 * }
 */
async function request(
  path,
  options = {},
  retryAfterSessionRefresh = true
) {
  const normalizedPath = normalizePath(path);

  const publicPath = isPublicPath(
    normalizedPath
  );

  const {
    includeGeminiKey = false,
    includeTavilyKey = false,
    headers: requestHeaders = {},
    ...fetchOptions
  } = options;

  const isMultipart =
    typeof FormData !== 'undefined' &&
    fetchOptions.body instanceof FormData;

  if (!publicPath) {
    await ensureSession();
  }

  const headers = publicPath
    ? (
      isMultipart
        ? {
          Accept: 'application/json',
          ...requestHeaders,
        }
        : buildHeaders(requestHeaders)
    )
    : buildAuthenticatedHeaders({
      includeGeminiKey,
      includeTavilyKey,
      extra: requestHeaders,
      isMultipart,
    });

  const url = `${API_BASE}${normalizedPath}`;

  let response;

  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
  } catch (error) {
    const err = new Error(
      ERROR_MESSAGES.NETWORK_ERROR
    );

    err.code = 'NETWORK_ERROR';
    err.status = 0;
    err.details = error;

    throw err;
  }

  /**
   * Retry exactly once when the anonymous session
   * has expired or become invalid.
   */
  if (
    response.status === 401 &&
    !publicPath &&
    retryAfterSessionRefresh
  ) {
    let errorData = null;

    try {
      errorData = await response.json();
    } catch {
      // Non-JSON 401 response.
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
    } catch {
      // Backend did not return JSON.
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

  /**
   * 204 No Content.
   */
  if (response.status === 204) {
    return null;
  }

  let responseText;

  try {
    responseText = await response.text();
  } catch {
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
  } catch {
    const err = new Error(
      ERROR_MESSAGES.INVALID_RESPONSE
    );

    err.code = 'INVALID_RESPONSE';
    err.status = response.status;

    throw err;
  }
}


/**
 * GET request.
 */
export function get(
  path,
  headers = {},
  options = {}
) {
  return request(path, {
    ...options,
    method: 'GET',
    headers,
  });
}


/**
 * POST JSON request.
 *
 * By default, only the session token is sent.
 *
 * Set:
 *
 * {
 *   includeGeminiKey: true
 * }
 *
 * or:
 *
 * {
 *   includeTavilyKey: true
 * }
 *
 * when the endpoint requires that provider key.
 */
export function post(
  path,
  body = {},
  headers = {},
  options = {}
) {
  return request(path, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}


/**
 * DELETE request.
 */
export function del(
  path,
  headers = {},
  options = {}
) {
  return request(path, {
    ...options,
    method: 'DELETE',
    headers,
  });
}


/**
 * POST multipart/form-data.
 *
 * Content-Type is intentionally not set because
 * the browser must generate the multipart boundary.
 */
export function postForm(
  path,
  formData,
  headers = {},
  options = {}
) {
  if (!(formData instanceof FormData)) {
    const err = new Error(
      'Invalid multipart request. Expected FormData.'
    );

    err.code = 'INVALID_REQUEST';
    err.status = 0;

    return Promise.reject(err);
  }

  return request(path, {
    ...options,
    method: 'POST',
    headers,
    body: formData,
  });
}


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
