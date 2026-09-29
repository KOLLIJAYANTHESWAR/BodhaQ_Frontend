import React, {
  useEffect,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import CodingProblemInput from '../components/coding/CodingProblemInput';
import CodingWorkspace from '../components/coding/CodingWorkspace';
import {
  getCurrentWorkspace,
} from '../utils/codingStorage';


export default function CodingWorkspacePage() {
  const location = useLocation();

  const state = location.state || {};

  const [sourceMode, setSourceMode] =
    useState(
      state.sourceMode === 'ai-learn'
        ? 'ai-learn'
        : 'ide'
    );

  const [savedCodeId, setSavedCodeId] =
    useState(
      typeof state.savedCodeId === 'string'
        ? state.savedCodeId
        : null
    );

  // For AI Learn Code mode.
  const [showInput, setShowInput] =
    useState(
      state.isNew === true &&
      state.sourceMode === 'ai-learn'
    );

  const [problemData, setProblemData] =
    useState(null);


  // ========================================================================
  // ROUTER STATE SYNCHRONIZATION
  // ========================================================================

  useEffect(() => {
    const nextSourceMode =
      state.sourceMode === 'ai-learn'
        ? 'ai-learn'
        : 'ide';

    const nextSavedCodeId =
      typeof state.savedCodeId === 'string'
        ? state.savedCodeId
        : null;

    setSourceMode(
      nextSourceMode
    );

    setSavedCodeId(
      nextSavedCodeId
    );

    if (
      state.isNew === true &&
      nextSourceMode === 'ai-learn'
    ) {
      setShowInput(true);
      setProblemData(null);
      return;
    }

    setShowInput(false);
  }, [
    state.sourceMode,
    state.savedCodeId,
    state.isNew,
  ]);


  // ========================================================================
  // CURRENT WORKSPACE RESTORATION
  // ========================================================================

  useEffect(() => {
    /*
     * Do not restore an old workspace when the user explicitly selected
     * "New" AI Learn Code mode.
     */
    if (
      state.isNew === true &&
      state.sourceMode === 'ai-learn'
    ) {
      return;
    }

    /*
     * CodingWorkspace already receives savedCodeId when opening a saved
     * coding item. There is therefore nothing else to restore here.
     *
     * For a normal IDE refresh, try to recover the current workspace.
     */
    if (
      savedCodeId ||
      problemData
    ) {
      return;
    }

    try {
      const currentWorkspace =
        getCurrentWorkspace();

      if (!currentWorkspace) {
        return;
      }

      /*
       * Only use stored workspace data when it contains enough information
       * to represent an actual coding workspace.
       */
      if (
        typeof currentWorkspace !== 'object'
      ) {
        return;
      }

      const restoredProblem =
        currentWorkspace.problem ||
        currentWorkspace.initialProblem ||
        currentWorkspace.problemData ||
        null;

      if (
        restoredProblem &&
        typeof restoredProblem === 'object'
      ) {
        setProblemData(
          restoredProblem
        );
      }
    } catch (error) {
      console.error(
        '[CodingWorkspacePage] Failed to restore current workspace:',
        error
      );
    }
  }, [
    savedCodeId,
    problemData,
    state.isNew,
    state.sourceMode,
  ]);


  // ========================================================================
  // AI GENERATION
  // ========================================================================

  const handleGenerateWorkspace = (
    data
  ) => {
    if (
      !data ||
      typeof data !== 'object'
    ) {
      return;
    }

    setProblemData(data);
    setSourceMode('ai-learn');
    setSavedCodeId(null);
    setShowInput(false);
  };


  // ========================================================================
  // RENDER
  // ========================================================================

  if (showInput) {
    return (
      <CodingProblemInput
        onGenerate={
          handleGenerateWorkspace
        }
      />
    );
  }


  return (
    <CodingWorkspace
      initialProblem={
        problemData
      }
      savedCodeId={
        savedCodeId
      }
      sourceMode={
        sourceMode
      }
    />
  );
}