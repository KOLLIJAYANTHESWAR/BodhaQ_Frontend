import React, { useState } from 'react';
import { generateCodingProblem } from '../../api/codingApi';
import './CodingProblemInput.css';

export default function CodingProblemInput({ onGenerate }) {
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [constraints, setConstraints] = useState('');
  const [sample, setSample] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedTitle = title.trim();
    const normalizedStatement = statement.trim();
    const normalizedConstraints = constraints.trim();
    const normalizedSample = sample.trim();

    if (!normalizedTitle && !normalizedStatement) {
      setError(
        'Enter a problem name or provide a problem statement.'
      );
      return;
    }

    if (typeof onGenerate !== 'function') {
      setError(
        'Unable to open the generated workspace. Please try again.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await generateCodingProblem(
        normalizedTitle,
        normalizedStatement,
        normalizedConstraints,
        normalizedSample
      );

      onGenerate(result);
    } catch (err) {
      setError(
        err?.message ||
        'Failed to generate problem. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="coding-problem-input-container">
      <div className="coding-problem-input-card">
        <h2>AI Learn Code</h2>
        <p>Choose how you want to provide the problem.</p>

        {error && (
          <div
            className="error-message"
            style={{
              color: 'red',
              marginBottom: '16px',
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="problem-input-form"
        >
          <div className="form-group">
            <label htmlFor="coding-problem-title">
              Problem Name
            </label>

            <input
              id="coding-problem-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Two Sum"
              disabled={loading}
            />
          </div>

          <div className="form-divider">OR</div>

          <div className="form-group">
            <label htmlFor="coding-problem-statement">
              Problem Statement
            </label>

            <textarea
              id="coding-problem-statement"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Paste the full problem statement here..."
              rows={4}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="coding-problem-constraints">
              Constraints (Optional)
            </label>

            <textarea
              id="coding-problem-constraints"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="e.g., 2 <= nums.length <= 10^4"
              rows={2}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="coding-problem-sample">
              Sample Test Case (Optional)
            </label>

            <textarea
              id="coding-problem-sample"
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              placeholder={`e.g.
Input:
4
2 7 11 15
9

Output:
0 1`}
              rows={4}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn-generate"
            disabled={
              (!title.trim() && !statement.trim()) ||
              loading
            }
          >
            {loading
              ? 'Generating...'
              : 'Generate Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}