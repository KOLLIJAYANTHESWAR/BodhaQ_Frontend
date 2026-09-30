import { post } from './client.js';

/**
 * Ask a doubt.
 *
 * POST /api/doubts/ask
 *
 * Requires:
 * - Anonymous BodhaQ session
 * - Gemini API key
 *
 * Document mode additionally uses the session-scoped
 * RAG pipeline when documentId is provided.
 *
 * @param {string} question
 * @param {string|null} documentId — omit for general mode
 * @param {Array<{role: string, content: string}>} history — prior turns for context
 */
export function askDoubt(
  question,
  documentId = null,
  history = []
) {
  const normalizedQuestion =
    typeof question === 'string'
      ? question.trim()
      : '';

  const body = {
    question: normalizedQuestion,
  };

  const normalizedDocumentId =
    typeof documentId === 'string'
      ? documentId.trim()
      : '';

  if (normalizedDocumentId) {
    body.document_id = normalizedDocumentId;
  }

  if (
    Array.isArray(history) &&
    history.length > 0
  ) {
    body.history = history
      .slice(-8)
      .filter(
        (turn) =>
          turn &&
          typeof turn === 'object' &&
          typeof turn.role === 'string' &&
          typeof turn.content === 'string' &&
          turn.role.trim() &&
          turn.content.trim()
      )
      .map((turn) => ({
        role: turn.role.trim(),
        content: turn.content.trim(),
      }));
  }

  return post(
    '/api/doubts/ask',
    body,
    {},
    {
      includeGeminiKey: true,
    }
  );
}