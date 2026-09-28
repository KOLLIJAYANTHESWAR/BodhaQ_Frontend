import apiClient from './client';

export async function executeCode(language, code, stdin) {
  const response = await apiClient.post('/coding/execute', {
    language,
    code,
    stdin,
  });
  return response.data;
}
