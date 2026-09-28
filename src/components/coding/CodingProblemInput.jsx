import React, { useState } from 'react';
import './CodingProblemInput.css';

export default function CodingProblemInput({ onGenerate }) {
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [constraints, setConstraints] = useState('');
  const [sample, setSample] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() && !statement.trim()) return;

    onGenerate({
      title: title || 'AI Generated Problem',
      statement,
      constraints,
      sample
    });
  };

  return (
    <div className="coding-problem-input-container">
      <div className="coding-problem-input-card">
        <h2>AI Learn Code</h2>
        <p>Choose how you want to provide the problem.</p>
        
        <form onSubmit={handleSubmit} className="problem-input-form">
          <div className="form-group">
            <label>Problem Name</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g., Two Sum"
            />
          </div>

          <div className="form-divider">OR</div>

          <div className="form-group">
            <label>Problem Statement</label>
            <textarea 
              value={statement} 
              onChange={e => setStatement(e.target.value)} 
              placeholder="Paste the full problem statement here..."
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>Constraints (Optional)</label>
            <textarea 
              value={constraints} 
              onChange={e => setConstraints(e.target.value)} 
              placeholder="e.g., 2 <= nums.length <= 10^4"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Sample Test Case (Optional)</label>
            <textarea 
              value={sample} 
              onChange={e => setSample(e.target.value)} 
              placeholder="Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]"
              rows={2}
            />
          </div>

          <button 
            type="submit" 
            className="btn-generate"
            disabled={!title.trim() && !statement.trim()}
          >
            Generate Workspace
          </button>
        </form>
      </div>
    </div>
  );
}
