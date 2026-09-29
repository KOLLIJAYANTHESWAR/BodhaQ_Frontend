import { post } from './client.js';

/**
 * Generate structured learning content for a topic.
 * POST /api/learning/topic
 */
export function learnTopic(topic) {
  const normalizedTopic =
    typeof topic === 'string'
      ? topic.trim()
      : '';

  return post('/api/learning/topic', {
    topic: normalizedTopic,
  });
}