import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CodingProblemInput from '../components/coding/CodingProblemInput';
import CodingWorkspace from '../components/coding/CodingWorkspace';
import { getCurrentWorkspace } from '../utils/codingStorage';

export default function CodingWorkspacePage() {
  const location = useLocation();
  const state = location.state || {};
  const [sourceMode, setSourceMode] = useState(state.sourceMode || 'ide');
  const [savedCodeId, setSavedCodeId] = useState(state.savedCodeId || null);
  
  // For AI Learn Code mode
  const [showInput, setShowInput] = useState(false);
  const [problemData, setProblemData] = useState(null);

  useEffect(() => {
    // Determine if we need to show the input screen
    if (state.isNew && sourceMode === 'ai-learn') {
      setShowInput(true);
    } else {
      setShowInput(false);
    }
  }, [state.isNew, sourceMode]);

  const handleGenerateWorkspace = (data) => {
    setProblemData(data);
    setShowInput(false);
  };

  if (showInput) {
    return <CodingProblemInput onGenerate={handleGenerateWorkspace} />;
  }

  // We should also handle current workspace restoration for page refresh
  // If we don't have a savedCodeId, and no problemData, but we have a stored workspace, load its problem data
  return (
    <CodingWorkspace 
      initialProblem={problemData} 
      savedCodeId={savedCodeId}
      sourceMode={sourceMode} 
    />
  );
}
