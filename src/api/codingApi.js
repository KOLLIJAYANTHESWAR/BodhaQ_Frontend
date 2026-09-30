import apiClient from './client';

/**
 * Execute code with custom stdin.
 *
 * This endpoint does not require Gemini.
 */
export async function executeCode(
  language,
  code,
  stdin
) {
  return apiClient.post(
    '/api/coding/execute',
    {
      language,
      code,
      stdin,
    }
  );
}

/**
 * Generate a new coding problem.
 *
 * Gemini is required because the backend uses AI
 * when generating the problem.
 *
 * If statement is empty, the backend/AI generates
 * the problem from the supplied title.
 */
export async function generateCodingProblem(
  title,
  statement,
  constraints,
  sample
) {
  return apiClient.post(
    '/api/coding/generate-problem',
    {
      title,
      statement,
      constraints,
      sample,
    },
    {},
    {
      includeGeminiKey: true,
    }
  );
}

/**
 * Analyze submitted code against the problem.
 *
 * Gemini is required for AI code analysis.
 */
export async function analyzeCode(
  problem_statement,
  sample_test_case,
  constraints,
  code,
  language
) {
  return apiClient.post(
    '/api/coding/analyze',
    {
      problem_statement,
      sample_test_case,
      constraints,
      code,
      language,
    },
    {},
    {
      includeGeminiKey: true,
    }
  );
}

/**
 * Request an improved version of the submitted code.
 *
 * Gemini is required for AI-powered code improvement.
 */
export async function improveCode(
  problem_statement,
  sample_test_case,
  constraints,
  code,
  language
) {
  return apiClient.post(
    '/api/coding/improve',
    {
      problem_statement,
      sample_test_case,
      constraints,
      code,
      language,
    },
    {},
    {
      includeGeminiKey: true,
    }
  );
}

/**
 * Generate additional public and hidden test cases
 * for an existing verified coding problem.
 *
 * Gemini is required for test-case generation.
 *
 * Hidden test details are handled by the backend and
 * must never be exposed by the frontend API layer.
 */
export async function generateTestCases(
  problem_id,
  problem_statement,
  sample_test_case,
  constraints,
  code,
  language
) {
  return apiClient.post(
    '/api/coding/testcases',
    {
      problem_id,
      problem_statement,
      sample_test_case,
      constraints,
      code,
      language,
    },
    {},
    {
      includeGeminiKey: true,
    }
  );
}

/**
 * Submit code against the selected test suite.
 *
 * The backend controls hidden tests. The frontend
 * only specifies which suite should be executed.
 *
 * This endpoint does not require Gemini.
 */
export async function submitCode(
  problem_id,
  language,
  code,
  test_suite = 'all'
) {
  return apiClient.post(
    '/api/coding/submit',
    {
      problem_id,
      language,
      code,
      test_suite,
    }
  );
}