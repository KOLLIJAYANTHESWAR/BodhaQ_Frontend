import { post } from './client.js';

/**
 * Ask a doubt.
 * POST /api/doubts/ask
 *
 * @param {string} question
 * @param {string|null} documentId — omit for general mode
 * @param {Array<{role: string, content: string}>} history — prior turns for context
 */
export function askDoubt(question, documentId = null, history = []) {
  const body = { question };
  if (documentId) {
    body.document_id = documentId;
  }
  if (history && history.length > 0) {
    body.history = history;
  }
  return post('/api/doubts/ask', body);
}
