import {
  get,
  post,
  postForm,
} from './client.js';


/**
 * Upload a resume.
 *
 * POST /api/resume/upload
 *
 * Gemini authentication is handled exclusively by the backend.
 * No Gemini API key is sent from the browser.
 */
export function uploadResume(file) {
  if (!(file instanceof File)) {
    const error = new Error(
      'Please select a valid resume file.'
    );

    error.code = 'INVALID_REQUEST';
    error.status = 0;

    return Promise.reject(error);
  }

  const formData = new FormData();
  formData.append('file', file);

  return postForm(
    '/api/resume/upload',
    formData
  );
}


/**
 * Get the latest resume preparation progress.
 *
 * GET /api/resume/progress
 */
export function getResumeProgress() {
  return get('/api/resume/progress');
}


/**
 * Generate an interview assessment for a resume item.
 *
 * POST /api/resume/quiz/generate
 *
 * The backend already knows the resume item and uses
 * the centralized GeminiService for AI generation.
 */
export function generateResumeQuiz(
  itemId,
  difficulty = 'medium',
  numQuestions = 5
) {
  const normalizedItemId =
    typeof itemId === 'string'
      ? itemId.trim()
      : '';

  if (!normalizedItemId) {
    const error = new Error(
      'Resume item ID cannot be empty.'
    );

    error.code = 'INVALID_REQUEST';
    error.status = 0;

    return Promise.reject(error);
  }

  const normalizedDifficulty =
    typeof difficulty === 'string'
      ? difficulty.trim().toLowerCase()
      : '';

  if (
    !['easy', 'medium', 'hard'].includes(
      normalizedDifficulty
    )
  ) {
    const error = new Error(
      'Difficulty must be easy, medium, or hard.'
    );

    error.code = 'INVALID_REQUEST';
    error.status = 0;

    return Promise.reject(error);
  }

  if (
    typeof numQuestions !== 'number' ||
    !Number.isInteger(numQuestions) ||
    numQuestions < 1 ||
    numQuestions > 20
  ) {
    const error = new Error(
      'Number of questions must be between 1 and 20.'
    );

    error.code = 'INVALID_REQUEST';
    error.status = 0;

    return Promise.reject(error);
  }

  return post(
    '/api/resume/quiz/generate',
    {
      item_id: normalizedItemId,
      difficulty: normalizedDifficulty,
      number_of_questions: numQuestions,
    }
  );
}


/**
 * Submit a resume interview assessment.
 *
 * POST /api/resume/quiz/submit
 *
 * Scoring is performed by the backend evaluation service.
 * Gemini is NOT required for deterministic scoring.
 */
export function submitResumeQuiz(
  quizId,
  answers
) {
  const normalizedQuizId =
    typeof quizId === 'string'
      ? quizId.trim()
      : '';

  if (!normalizedQuizId) {
    const error = new Error(
      'Quiz ID cannot be empty.'
    );

    error.code = 'INVALID_REQUEST';
    error.status = 0;

    return Promise.reject(error);
  }

  if (
    !answers ||
    typeof answers !== 'object' ||
    Array.isArray(answers)
  ) {
    const error = new Error(
      'Quiz answers must be an object.'
    );

    error.code = 'INVALID_REQUEST';
    error.status = 0;

    return Promise.reject(error);
  }

  return post(
    '/api/resume/quiz/submit',
    {
      quiz_id: normalizedQuizId,
      answers,
    }
  );
}