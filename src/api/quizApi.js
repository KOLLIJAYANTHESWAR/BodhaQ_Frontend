import { get, post } from './client.js';


const VALID_SOURCE_TYPES = new Set([
  'topic',
  'document',
]);

const VALID_DIFFICULTIES = new Set([
  'easy',
  'medium',
  'hard',
]);

const MIN_QUESTIONS = 1;
const MAX_QUESTIONS = 20;


/**
 * Normalize a string value.
 */
function normalizeString(value) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}


/**
 * Validate a positive integer question count.
 */
function validateQuestionCount(value, fieldName) {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < MIN_QUESTIONS ||
    value > MAX_QUESTIONS
  ) {
    throw new Error(
      `${fieldName} must be an integer between ${MIN_QUESTIONS} and ${MAX_QUESTIONS}.`
    );
  }

  return value;
}


/**
 * Validate quiz difficulty.
 */
function validateDifficulty(difficulty) {
  const normalized = normalizeString(difficulty).toLowerCase();

  if (!VALID_DIFFICULTIES.has(normalized)) {
    throw new Error(
      'Difficulty must be easy, medium, or hard.'
    );
  }

  return normalized;
}


/**
 * Generate a quiz.
 * POST /api/quiz/generate
 *
 * @param {'topic'|'document'} sourceType
 * @param {string} sourceId — topic string or document_id
 * @param {number} numberOfQuestions
 * @param {'easy'|'medium'|'hard'} difficulty
 */
export function generateQuiz(
  sourceType,
  sourceId,
  numberOfQuestions = 5,
  difficulty = 'medium'
) {
  const normalizedSourceType =
    normalizeString(sourceType).toLowerCase();

  if (!VALID_SOURCE_TYPES.has(normalizedSourceType)) {
    throw new Error(
      'Quiz source must be topic or document.'
    );
  }

  const normalizedSourceId =
    normalizeString(sourceId);

  if (!normalizedSourceId) {
    throw new Error(
      'Quiz source cannot be empty.'
    );
  }

  const validatedQuestionCount =
    validateQuestionCount(
      numberOfQuestions,
      'numberOfQuestions'
    );

  const validatedDifficulty =
    validateDifficulty(difficulty);

  return post('/api/quiz/generate', {
    source_type: normalizedSourceType,
    source_id: normalizedSourceId,
    number_of_questions: validatedQuestionCount,
    difficulty: validatedDifficulty,
  });
}


/**
 * Submit quiz answers.
 * POST /api/quiz/submit
 *
 * @param {string} quizId
 * @param {Record<string, string>} answers — { "1": "A", "2": "C" }
 */
export function submitQuiz(quizId, answers) {
  const normalizedQuizId =
    normalizeString(quizId);

  if (!normalizedQuizId) {
    throw new Error(
      'Quiz ID cannot be empty.'
    );
  }

  if (
    !answers ||
    typeof answers !== 'object' ||
    Array.isArray(answers)
  ) {
    throw new Error(
      'Quiz answers must be an object.'
    );
  }

  return post('/api/quiz/submit', {
    quiz_id: normalizedQuizId,
    answers,
  });
}


/**
 * Get aggregated weak topics across recent quizzes.
 * GET /api/quiz/gaps
 */
export function getAggregatedGaps() {
  return get('/api/quiz/gaps');
}


/**
 * Generate targeted practice.
 * POST /api/quiz/practice
 *
 * document_id is optional.
 * When omitted, the backend generates topic-only practice.
 * When provided, it grounds practice in the original document via RAG.
 *
 * @param {string} topic
 * @param {string|null|undefined} documentId
 * @param {'easy'|'medium'|'hard'} difficulty
 * @param {number} questionCount
 */
export function generatePractice(
  topic,
  documentId,
  difficulty = 'medium',
  questionCount = 5
) {
  const normalizedTopic =
    normalizeString(topic);

  if (!normalizedTopic) {
    throw new Error(
      'Practice topic cannot be empty.'
    );
  }

  const validatedDifficulty =
    validateDifficulty(difficulty);

  const validatedQuestionCount =
    validateQuestionCount(
      questionCount,
      'questionCount'
    );

  const body = {
    topic: normalizedTopic,
    difficulty: validatedDifficulty,
    question_count: validatedQuestionCount,
  };

  const normalizedDocumentId =
    normalizeString(documentId);

  if (normalizedDocumentId) {
    body.document_id = normalizedDocumentId;
  }

  return post('/api/quiz/practice', body);
}