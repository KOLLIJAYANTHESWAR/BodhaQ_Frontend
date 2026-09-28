import { get, post } from './client.js';

/**
 * Generate a quiz.
 * POST /api/quiz/generate
 *
 * @param {'topic'|'document'} sourceType
 * @param {string} sourceId — topic string or document_id
 * @param {number} numberOfQuestions
 * @param {'easy'|'medium'|'hard'} difficulty
 */
export function generateQuiz(sourceType, sourceId, numberOfQuestions = 5, difficulty = 'medium') {
  return post('/api/quiz/generate', {
    source_type: sourceType,
    source_id: sourceId,
    number_of_questions: numberOfQuestions,
    difficulty,
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
  return post('/api/quiz/submit', {
    quiz_id: quizId,
    answers,
  });
}

/**
 * Get aggregated weak topics across recent quizzes.
 * GET /api/quiz/gaps
 */
export function getAggregatedGaps() {
  return get(`/api/quiz/gaps`);
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
export function generatePractice(topic, documentId, difficulty = 'medium', questionCount = 5) {
  const body = { topic, difficulty, question_count: questionCount };
  if (documentId) body.document_id = documentId;
  return post('/api/quiz/practice', body);
}

