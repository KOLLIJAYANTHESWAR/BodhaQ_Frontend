import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSavedCodes, deleteSavedCode, clearCurrentWorkspace } from '../utils/codingStorage';
import './CodingPage.css'; // Add a little CSS for this

export default function CodingPage() {
  const navigate = useNavigate();
  const [savedCodes, setSavedCodes] = useState([]);

  useEffect(() => {
    setSavedCodes(getSavedCodes());
  }, []);

  const handleModeSelect = (mode) => {
    // Clear the current workspace to start fresh
    clearCurrentWorkspace();
    
    // Set the intent (ide or ai-learn) - for phase 1 we can pass state via router
    navigate('/coding/workspace', { state: { sourceMode: mode, isNew: true } });
  };

  const handleOpenSaved = (savedCode) => {
    // Load this specific code into the workspace
    navigate('/coding/workspace', { state: { sourceMode: savedCode.sourceMode, savedCodeId: savedCode.id, isNew: false } });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this saved code?')) {
      deleteSavedCode(id);
      setSavedCodes(getSavedCodes());
    }
  };

  return (
    <div className="coding-landing-page">
      <header className="page-header">
        <h1>Coding</h1>
        <p>Learn, practice, test and improve your coding skills.</p>
      </header>

      <section className="coding-modes-section">
        <div className="mode-card" onClick={() => handleModeSelect('ai-learn')}>
          <h2>AI Learn Code</h2>
          <p>Learn a coding problem with AI</p>
        </div>
        <div className="mode-card" onClick={() => handleModeSelect('ide')}>
          <h2>IDE</h2>
          <p>Practice coding independently</p>
        </div>
      </section>

      <section className="saved-codes-section">
        <h2>Saved Codes</h2>
        {savedCodes.length === 0 ? (
          <div className="no-saved-codes">
            <p>No saved codes yet.</p>
            <p>Save your coding work from the IDE to see it here.</p>
          </div>
        ) : (
          <div className="saved-codes-list">
            {savedCodes.map((code) => (
              <div key={code.id} className="saved-code-card">
                <div className="saved-code-info">
                  <h3>{code.title || 'Untitled'}</h3>
                  <span className="language-badge">{code.language}</span>
                  <p className="updated-at">Updated: {new Date(code.updatedAt).toLocaleString()}</p>
                </div>
                <div className="saved-code-actions">
                  <button className="btn-primary" onClick={() => handleOpenSaved(code)}>Open</button>
                  <button className="btn-danger" onClick={() => handleDelete(code.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
