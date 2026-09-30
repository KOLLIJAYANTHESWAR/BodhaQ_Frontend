import { get, post } from './client.js';

/**
 * Test the current Gemini BYOK configuration.
 *
 * POST /api/settings/test-ai
 *
 * Requires:
 * - Anonymous BodhaQ session
 * - Gemini API key
 *
 * The API client reads the Gemini key from sessionStorage
 * and sends it through X-Gemini-API-Key.
 */
export function testAiConnection() {
  return post(
    '/api/settings/test-ai',
    {},
    {},
    {
      includeGeminiKey: true,
    }
  );
}

/**
 * Test the current Tavily BYOK configuration.
 *
 * POST /api/settings/test-tavily
 *
 * Requires:
 * - Anonymous BodhaQ session
 * - Tavily API key
 *
 * The API client reads the Tavily key from sessionStorage
 * and sends it through X-Tavily-API-Key.
 *
 * The API key is intentionally not included in the
 * request body.
 */
export function testTavilyConnection() {
  return post(
    '/api/settings/test-tavily',
    {},
    {},
    {
      includeTavilyKey: true,
    }
  );
}

/**
 * Health check.
 *
 * GET /health
 *
 * This endpoint is public and does not require
 * a session or provider API key.
 */
export function checkHealth() {
  return get('/health');
}