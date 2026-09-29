import { get, post } from './client.js';

/**
 * Test the backend Gemini AI configuration.
 * POST /api/settings/test-ai
 *
 * The Gemini API key is configured securely on the backend.
 * No API key is sent from the browser.
 */
export function testAiConnection() {
  return post('/api/settings/test-ai', {});
}


/**
 * Test the Tavily API configuration.
 * POST /api/settings/test-tavily
 *
 * The Tavily API key is sent only for the current test request.
 * It must never be persisted by the frontend API layer.
 */
export function testTavilyConnection(apiKey) {
  const normalizedKey =
    typeof apiKey === 'string'
      ? apiKey.trim()
      : '';

  if (!normalizedKey) {
    return Promise.reject(
      new Error('Tavily API key is required.')
    );
  }

  return post('/api/settings/test-tavily', {
    api_key: normalizedKey,
  });
}


/**
 * Health check.
 * GET /health
 */
export function checkHealth() {
  return get('/health');
}