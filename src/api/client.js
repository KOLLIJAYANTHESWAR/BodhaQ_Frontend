/**
 * BodhaQ API Client
 *
 * Centralises:
 * - Base URL
 * - Request headers
 * - JSON parsing
 * - Multipart requests
 * - HTTP error handling
 *
 * Never exposes the server-side Gemini key to the browser.
 */

const API_BASE =
  import.meta.env.VITE_API_BASE || 'http://localhost:8000';


/**
 * Build request headers.
 *
 * If the user has supplied a Gemini API key for this session,
 * it is sent via X-Gemini-API-Key.
 *
 * The key is not stored in the database or intentionally logged
 * by the frontend.
 */
function buildHeaders(extra = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extra,
  };

  const userKey = sessionStorage.getItem(
    'bodhaq_user_api_key'
  );

  if (userKey) {
    headers['X-Gemini-API-Key'] = userKey;
  }

  return headers;
}


/**
 * Map known backend error codes to user-friendly messages.
 */
const ERROR_MESSAGES = {
  AI_SERVICE_UNAVAILABLE:
    'BodhaQ could not reach Gemini right now. Check your API configuration or try again.',

  DOCUMENT_NOT_FOUND:
    'This learning material is no longer available.',

  UNSUPPORTED_FILE_TYPE:
    'This file type is not supported. Please upload a PDF, PPTX, or DOCX.',

  INVALID_API_KEY:
    'The Gemini API key could not be verified. Check the key and try again.',

  RATE_LIMITED:
    'Gemini API rate limit reached. Please wait a moment and try again.',

  MODEL_UNAVAILABLE:
    'The Gemini model is currently unavailable. Please try again later.',

  QUIZ_NOT_FOUND:
    'Quiz not found. It may have expired or been cleared.',

  QUIZ_NOT_SUBMITTED:
    'This quiz has not been submitted yet.',

  DOCUMENT_PROCESSING_ERROR:
    'There was a problem processing this document. Please check the file and try again.',

  FILE_TOO_LARGE:
    'The file exceeds the 50 MB size limit.',

  INVALID_QUIZ_REQUEST:
    'Invalid quiz request. Please check your inputs.',

  INVALID_PRACTICE_REQUEST:
    'Invalid practice request.',
};


/**
 * Safely convert any backend error value into a string.
 *
 * This specifically prevents:
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
async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers:
        options.headers ||
        buildHeaders(),
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


  if (!response.ok) {
    let errorData = null;

    try {
      errorData = await response.json();
    } catch (_) {
      // Backend did not return JSON.
    }


    const detail =
      errorData?.detail ?? null;


    const code =
      detail?.code ||
      errorData?.code ||
      'UNKNOWN_ERROR';


    const rawMessage =
      detail?.error ||
      errorData?.message ||
      (
        typeof detail === 'string'
          ? detail
          : null
      ) ||
      `HTTP ${response.status}`;


    const message =
      friendlyError(
        code,
        rawMessage
      );


    const err = new Error(message);

    err.code = code;
    err.status = response.status;

    // Preserve the original backend response for
    // debugging without displaying it automatically.
    err.details = errorData;

    throw err;
  }


  // 204 No Content
  if (response.status === 204) {
    return null;
  }


  try {
    return await response.json();
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
 */
export function get(path) {
  return request(
    path,
    {
      method: 'GET',
    }
  );
}


/**
 * POST request with JSON body.
 */
export function post(path, body) {
  return request(
    path,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}


/**
 * DELETE request.
 */
export function del(path) {
  return request(
    path,
    {
      method: 'DELETE',
    }
  );
}


/**
 * POST multipart/form-data.
 *
 * Content-Type is intentionally NOT set because
 * the browser must generate the multipart boundary.
 */
export async function postForm(
  path,
  formData
) {
  const headers = {};

  const userKey =
    sessionStorage.getItem(
      'bodhaq_user_api_key'
    );

  if (userKey) {
    headers['X-Gemini-API-Key'] =
      userKey;
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


export default {
  get,
  post,
  del,
  postForm,
};