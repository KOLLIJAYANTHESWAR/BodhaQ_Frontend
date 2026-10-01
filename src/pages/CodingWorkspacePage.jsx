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


// ============================================================================
// CONSTANTS
// ============================================================================

const IDE_MODE = 'ide';
const AI_LEARN_MODE = 'ai-learn';


// ============================================================================
// HELPERS
// ============================================================================

function normalizeSourceMode(value) {
  return value === AI_LEARN_MODE
    ? AI_LEARN_MODE
    : IDE_MODE;
}


function normalizeSavedCodeId(value) {
  return (
    typeof value === 'string' &&
    value.trim()
  )
    ? value.trim()
    : null;
}


function isValidObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}


function isNewAiLearnWorkspace(state) {
  return (
    state?.isNew === true &&
    normalizeSourceMode(
      state?.sourceMode
    ) === AI_LEARN_MODE
  );
}


// ============================================================================
// PAGE
// ============================================================================

export default function CodingWorkspacePage() {
  const location = useLocation();

  const routerState =
    isValidObject(location.state)
      ? location.state
      : {};


  // ==========================================================================
  // NORMALIZED ROUTER STATE
  // ==========================================================================

  const initialSourceMode =
    normalizeSourceMode(
      routerState.sourceMode
    );

  const initialSavedCodeId =
    normalizeSavedCodeId(
      routerState.savedCodeId
    );

  const initialIsNewAiLearn =
    isNewAiLearnWorkspace(
      routerState
    );


  // ==========================================================================
  // STATE
  // ==========================================================================

  const [
    sourceMode,
    setSourceMode,
  ] = useState(
    initialSourceMode
  );


  const [
    savedCodeId,
    setSavedCodeId,
  ] = useState(
    initialSavedCodeId
  );


  /*
   * CodingProblemInput is only used when
   * creating a NEW AI Learn problem.
   *
   * IDE mode never displays this screen.
   */
  const [
    showInput,
    setShowInput,
  ] = useState(
    initialIsNewAiLearn
  );


  /*
   * Generated/restored problem data.
   *
   * This is intentionally kept separate from
   * savedCodeId so CodingWorkspace can decide
   * how to initialize its own internal state.
   */
  const [
    problemData,
    setProblemData,
  ] = useState(null);


  // ==========================================================================
  // ROUTER STATE SYNCHRONIZATION
  // ==========================================================================

  useEffect(() => {
    const nextSourceMode =
      normalizeSourceMode(
        routerState.sourceMode
      );

    const nextSavedCodeId =
      normalizeSavedCodeId(
        routerState.savedCodeId
      );

    const newAiLearnWorkspace =
      isNewAiLearnWorkspace(
        routerState
      );


    setSourceMode(
      nextSourceMode
    );

    setSavedCodeId(
      nextSavedCodeId
    );


    /*
     * A NEW AI Learn workspace must always
     * start clean.
     *
     * Never restore an old workspace here.
     */
    if (newAiLearnWorkspace) {
      setShowInput(true);
      setProblemData(null);

      return;
    }


    /*
     * Existing workspaces open directly in
     * CodingWorkspace.
     *
     * Clear any previously generated/restored
     * problem so stale problem data cannot leak
     * into another saved/existing workspace.
     */
    setShowInput(false);
    setProblemData(null);

  }, [
    routerState.sourceMode,
    routerState.savedCodeId,
    routerState.isNew,
  ]);


  // ==========================================================================
  // CURRENT WORKSPACE RESTORATION
  // ==========================================================================

  useEffect(() => {
    /*
     * Never restore a previous workspace when
     * explicitly creating a new AI Learn problem.
     */
    if (
      isNewAiLearnWorkspace(
        routerState
      )
    ) {
      return;
    }


    /*
     * Saved coding items already provide their
     * savedCodeId to CodingWorkspace.
     */
    if (savedCodeId) {
      return;
    }


    /*
     * A generated/restored problem is already
     * available.
     */
    if (problemData) {
      return;
    }


    /*
     * Current-workspace restoration is primarily
     * for the normal IDE workflow.
     *
     * Do not inject an old workspace into an
     * AI Learn route.
     */
    if (
      sourceMode !== IDE_MODE
    ) {
      return;
    }


    try {
      const currentWorkspace =
        getCurrentWorkspace();


      if (
        !isValidObject(
          currentWorkspace
        )
      ) {
        return;
      }


      /*
       * Support the existing storage formats
       * without changing the storage contract.
       */
      const restoredProblem =
        currentWorkspace.problem ||
        currentWorkspace.initialProblem ||
        currentWorkspace.problemData ||
        null;


      if (
        isValidObject(
          restoredProblem
        )
      ) {
        setProblemData(
          restoredProblem
        );
      }

    } catch {
      /*
       * Workspace restoration is best-effort.
       *
       * Do not expose internal storage details
       * to the production console.
       */
    }

  }, [
    savedCodeId,
    problemData,
    sourceMode,
    routerState.isNew,
    routerState.sourceMode,
  ]);


  // ==========================================================================
  // AI GENERATION
  // ==========================================================================

  const handleGenerateWorkspace = (
    data
  ) => {
    /*
     * Do not enter the workspace with an
     * invalid generated response.
     */
    if (
      !isValidObject(data)
    ) {
      return;
    }


    setProblemData(
      data
    );

    /*
     * Generation always creates a new
     * AI Learn workspace.
     */
    setSourceMode(
      AI_LEARN_MODE
    );

    setSavedCodeId(
      null
    );

    setShowInput(
      false
    );
  };


  // ==========================================================================
  // RENDER — NEW AI LEARN INPUT
  // ==========================================================================

  if (
    showInput &&
    sourceMode === AI_LEARN_MODE
  ) {
    return (
      <CodingProblemInput
        onGenerate={
          handleGenerateWorkspace
        }
      />
    );
  }


  // ==========================================================================
  // RENDER — CODING WORKSPACE
  // ==========================================================================

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