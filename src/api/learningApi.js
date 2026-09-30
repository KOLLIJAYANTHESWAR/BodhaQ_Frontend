import { post } from './client.js';

/**
 * Generate structured learning content for a topic.
 *
 * POST /api/learning/topic
 *
 * Requires:
 * - Gemini API key
 * - Tavily API key
 *
 * The anonymous session and provider keys are automatically
 * attached by the API client when the request is sent.
 */
export function learnTopic(topic) {
  const normalizedTopic =
    typeof topic === 'string'
      ? topic.trim()
      : '';

  return post(
    '/api/learning/topic',
    {
      topic: normalizedTopic,
    },
    {},
    {
      includeGeminiKey: true,
      includeTavilyKey: true,
    }
  );
}