import { post } from './client.js';

/**
 * Generate structured learning content for a topic.
 * POST /api/learn/topic
 */
export function learnTopic(topic) {
  return post('/api/learn/topic', { topic });
}
