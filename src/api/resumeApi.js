const API_BASE =
  import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const BASE_URL = `${API_BASE}/api/resume`;

/**
 * Parse an API error consistently.
 *
 * Backend errors follow:
 *
 * {
 *   "detail": {
 *     "error": "...",
 *     "code": "..."
 *   }
 * }
 */
async function createApiError(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));

  const detail = data?.detail;

  let message = fallbackMessage;
  let code = null;

  if (typeof detail === 'string') {
    message = detail;
  } else if (detail && typeof detail === 'object') {
    message = detail.error || fallbackMessage;
    code = detail.code || null;
  }

  const error = new Error(message);

  error.code =
    code ||
    (response.status === 401
      ? 'INVALID_API_KEY'
      : 'RESUME_API_ERROR');

  error.status = response.status;
  error.detail = detail;

  return error;
}


/**
 * Upload a resume.
 *
 * IMPORTANT:
 * No Gemini API key is sent from the browser.
 *
 * Gemini authentication is handled by the backend through:
 *
 * backend/.env
 * GEMINI_API_KEY=...
 */
export async function uploadResume(file) {
  const formData = new FormData();

  formData.append('file', file);

  const response = await fetch(
    `${BASE_URL}/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw await createApiError(
      response,
      'Failed to upload resume.'
    );
  }

  return response.json();
}


/**
 * Get the latest resume preparation progress.
 */
export async function getResumeProgress() {
  const response = await fetch(
    `${BASE_URL}/progress`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw await createApiError(
      response,
      'Failed to fetch resume progress.'
    );
  }

  return response.json();
}


/**
 * Generate an interview assessment for a resume item.
 *
 * The backend already knows the resume item and uses the centralized
 * GeminiService for AI generation.
 */
export async function generateResumeQuiz(
  itemId,
  difficulty = 'medium',
  numQuestions = 5
) {
  const response = await fetch(
    `${BASE_URL}/quiz/generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        item_id: itemId,
        difficulty,
        number_of_questions: numQuestions,
      }),
    }
  );

  if (!response.ok) {
    throw await createApiError(
      response,
      'Failed to generate interview assessment.'
    );
  }

  return response.json();
}


/**
 * Submit a resume interview assessment.
 *
 * Scoring is performed by the backend evaluation service.
 * Gemini is NOT required for deterministic scoring.
 */
export async function submitResumeQuiz(
  quizId,
  answers
) {
  const response = await fetch(
    `${BASE_URL}/quiz/submit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        quiz_id: quizId,
        answers,
      }),
    }
  );

  if (!response.ok) {
    throw await createApiError(
      response,
      'Failed to submit interview assessment.'
    );
  }

  return response.json();
}