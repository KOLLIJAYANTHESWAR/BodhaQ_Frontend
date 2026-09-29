import apiClient from './client';


/**
 * Execute code with custom stdin.
 */
export async function executeCode(
  language,
  code,
  stdin
) {
  return apiClient.post('/api/coding/execute', {
    language,
    code,
    stdin,
  });
}


/**
 * Generate a new coding problem.
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
    }
  );
}


/**
 * Analyze submitted code against the problem.
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
    }
  );
}


/**
 * Request an improved version of the submitted code.
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
    }
  );
}


/**
 * Generate additional public and hidden test cases
 * for an existing verified coding problem.
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
    }
  );
}


/**
 * Submit code against the selected test suite.
 *
 * The backend controls hidden tests. The frontend
 * only specifies which suite should be executed.
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