import { get, post } from './client.js';

/**
 * Test an AI connection.
 * POST /api/settings/test-ai
 *
 * @param {string} apiKey — user-provided key; sent to backend and never stored
 */
export function testAiConnection(apiKey) {
  return post('/api/settings/test-ai', { api_key: apiKey });
}

/**
 * Health check.
 * GET /health
 */
export function checkHealth() {
  return get('/health');
}
