import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import Editor from '@monaco-editor/react';
import Button from '../common/Button';
import {
  saveCode,
  saveCurrentWorkspace,
  getSavedCodes,
  getCurrentWorkspace,
} from '../../utils/codingStorage';
import {
  executeCode,
  analyzeCode,
  improveCode,
  generateTestCases,
  submitCode,
} from '../../api/codingApi';
import './CodingWorkspace.css';


const DEFAULT_JAVA_CODE = `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, BodhaQ!");
    }
}`;

const DEFAULT_PYTHON_CODE = `def main():
    print("Hello, BodhaQ!")

if __name__ == "__main__":
    main()`;


const MIN_RESULTS_HEIGHT = 0;
const MAX_RESULTS_HEIGHT_RATIO = 0.7;
const DEFAULT_RESULTS_HEIGHT = 250;


function generateId() {
  try {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }
  } catch (_) {
    // Fall back below.
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 15)}`;
}


function normalizeString(value) {
  return typeof value === 'string'
    ? value
    : '';
}


function normalizeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}


function getExampleSample(examples) {
  if (!Array.isArray(examples) || examples.length === 0) {
    return '';
  }

  const firstExample = examples[0];

  if (!firstExample || typeof firstExample !== 'object') {
    return '';
  }

  const input = normalizeString(firstExample.input).trim();
  const output = normalizeString(firstExample.output).trim();

  if (!input && !output) {
    return '';
  }

  const parts = [];

  if (input) {
    parts.push(`Input:\n${input}`);
  }

  if (output) {
    parts.push(`Output:\n${output}`);
  }

  return parts.join('\n\n');
}


function normalizeStarterCode(
  code,
  fallback
) {
  const normalized = normalizeString(code);

  return normalized.trim()
    ? normalized
    : fallback;
}


function getErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.'
) {
  if (
    error &&
    typeof error.message === 'string' &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}


function normalizeResultsHeight(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_RESULTS_HEIGHT;
  }

  const maxHeight =
    typeof window !== 'undefined'
      ? window.innerHeight *
      MAX_RESULTS_HEIGHT_RATIO
      : DEFAULT_RESULTS_HEIGHT;

  return Math.min(
    Math.max(parsed, MIN_RESULTS_HEIGHT),
    maxHeight
  );
}


export default function CodingWorkspace({
  initialProblem,
  savedCodeId,
  sourceMode,
}) {
  const initialExamples =
    normalizeArray(initialProblem?.examples);

  const initialJavaCode =
    normalizeStarterCode(
      initialProblem?.starter_code_java,
      DEFAULT_JAVA_CODE
    );

  const initialPythonCode =
    normalizeStarterCode(
      initialProblem?.starter_code_python,
      DEFAULT_PYTHON_CODE
    );

  const initialLanguage = 'java';

  const [workspaceState, setWorkspaceState] =
    useState({
      id: generateId(),
      title:
        normalizeString(initialProblem?.title).trim() ||
        'Untitled',

      language: initialLanguage,

      code: initialJavaCode,

      javaCode: initialJavaCode,

      pythonCode: initialPythonCode,

      sourceMode:
        sourceMode || 'ide',

      problemId:
        initialProblem?.problem_id || null,

      problemStatement:
        normalizeString(initialProblem?.statement),

      inputFormat:
        normalizeString(initialProblem?.input_format),

      outputFormat:
        normalizeString(initialProblem?.output_format),

      constraints:
        normalizeString(initialProblem?.constraints),

      examples: initialExamples,

      sample:
        getExampleSample(initialExamples),

      publicTests:
        normalizeArray(initialProblem?.public_tests),

      hiddenTestCount:
        Number.isInteger(
          initialProblem?.hidden_test_count
        )
          ? initialProblem.hidden_test_count
          : 0,

      difficulty:
        normalizeString(initialProblem?.difficulty),

      topics:
        normalizeArray(initialProblem?.topics),
    });


  const [actionMessage, setActionMessage] =
    useState('');

  const [customInput, setCustomInput] =
    useState('');

  const [isRunning, setIsRunning] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [executionResult, setExecutionResult] =
    useState(null);


  const [showAiModal, setShowAiModal] =
    useState(false);

  const [aiAnalysisResult, setAiAnalysisResult] =
    useState(null);

  const [aiImprovementResult, setAiImprovementResult] =
    useState(null);


  const [theme, setTheme] = useState(
    typeof document !== 'undefined' &&
      document.documentElement.getAttribute(
        'data-theme'
      ) === 'dark'
      ? 'vs-dark'
      : 'vs-light'
  );


  const [panelWidth, setPanelWidth] =
    useState(50);

  const [isDragging, setIsDragging] =
    useState(false);

  const workspaceRef = useRef(null);

  const actionMessageTimeoutRef =
    useRef(null);


  const [isDraggingResults, setIsDraggingResults] =
    useState(false);

  const [resultsHeight, setResultsHeight] =
    useState(() => {
      try {
        const saved =
          localStorage.getItem(
            'bodhaq_coding_results_panel_height'
          );

        return normalizeResultsHeight(
          saved || DEFAULT_RESULTS_HEIGHT
        );
      } catch (_) {
        return DEFAULT_RESULTS_HEIGHT;
      }
    });


  /*
   * Clean up the action-message timer.
   */
  useEffect(() => {
    return () => {
      if (actionMessageTimeoutRef.current) {
        clearTimeout(
          actionMessageTimeoutRef.current
        );
      }
    };
  }, []);


  /*
   * Persist the current results-panel height.
   */
  const persistResultsHeight = useCallback(
    (height) => {
      try {
        localStorage.setItem(
          'bodhaq_coding_results_panel_height',
          String(Math.round(height))
        );
      } catch (_) {
        // Local persistence is optional.
      }
    },
    []
  );


  const handleResultsPointerDown =
    useCallback((e) => {
      e.preventDefault();
      setIsDraggingResults(true);
    }, []);


  const handleResultsPointerMove =
    useCallback(
      (e) => {
        if (!isDraggingResults) {
          return;
        }

        const newHeight =
          window.innerHeight - e.clientY;

        const normalized =
          normalizeResultsHeight(newHeight);

        setResultsHeight(normalized);
      },
      [isDraggingResults]
    );


  const handleResultsPointerUp =
    useCallback(() => {
      if (!isDraggingResults) {
        return;
      }

      setIsDraggingResults(false);

      persistResultsHeight(resultsHeight);
    }, [
      isDraggingResults,
      persistResultsHeight,
      resultsHeight,
    ]);


  useEffect(() => {
    if (!isDraggingResults) {
      return undefined;
    }

    window.addEventListener(
      'pointermove',
      handleResultsPointerMove
    );

    window.addEventListener(
      'pointerup',
      handleResultsPointerUp
    );

    return () => {
      window.removeEventListener(
        'pointermove',
        handleResultsPointerMove
      );

      window.removeEventListener(
        'pointerup',
        handleResultsPointerUp
      );
    };
  }, [
    isDraggingResults,
    handleResultsPointerMove,
    handleResultsPointerUp,
  ]);


  /*
   * Keep the stored results-panel height valid
   * when the viewport changes.
   */
  useEffect(() => {
    const handleResize = () => {
      setResultsHeight((currentHeight) => {
        const normalized =
          normalizeResultsHeight(
            currentHeight
          );

        if (normalized !== currentHeight) {
          persistResultsHeight(normalized);
        }

        return normalized;
      });
    };

    window.addEventListener(
      'resize',
      handleResize
    );

    return () => {
      window.removeEventListener(
        'resize',
        handleResize
      );
    };
  }, [persistResultsHeight]);


  /*
   * Detect application theme changes.
   */
  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const observer =
      new MutationObserver(() => {
        const isDark =
          document.documentElement.getAttribute(
            'data-theme'
          ) === 'dark';

        setTheme(
          isDark
            ? 'vs-dark'
            : 'vs-light'
        );
      });

    observer.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: ['data-theme'],
      }
    );

    return () => observer.disconnect();
  }, []);


  /*
   * Load a saved workspace/problem.
   */
  useEffect(() => {
    let cancelled = false;

    const loadWorkspace = async () => {
      if (savedCodeId) {
        const savedCodes =
          getSavedCodes();

        const codeItem =
          Array.isArray(savedCodes)
            ? savedCodes.find(
              (item) =>
                item?.id === savedCodeId
            )
            : null;

        if (!codeItem || cancelled) {
          return;
        }

        const savedLanguage =
          codeItem.language === 'python'
            ? 'python'
            : 'java';

        const savedCode =
          normalizeString(codeItem.code);

        setWorkspaceState(
          (prevState) => ({
            ...prevState,

            id:
              codeItem.id ||
              prevState.id,

            title:
              normalizeString(
                codeItem.title
              ).trim() ||
              'Untitled',

            language:
              savedLanguage,

            code:
              savedCode ||
              (
                savedLanguage === 'java'
                  ? prevState.javaCode
                  : prevState.pythonCode
              ),

            javaCode:
              savedLanguage === 'java'
                ? (
                  savedCode ||
                  prevState.javaCode
                )
                : prevState.javaCode,

            pythonCode:
              savedLanguage === 'python'
                ? (
                  savedCode ||
                  prevState.pythonCode
                )
                : prevState.pythonCode,

            sourceMode:
              codeItem.sourceMode ||
              prevState.sourceMode,
          })
        );

        return;
      }


      if (initialProblem) {
        const examples =
          normalizeArray(
            initialProblem.examples
          );

        const javaCode =
          normalizeStarterCode(
            initialProblem.starter_code_java,
            DEFAULT_JAVA_CODE
          );

        const pythonCode =
          normalizeStarterCode(
            initialProblem.starter_code_python,
            DEFAULT_PYTHON_CODE
          );

        const language =
          workspaceState.language ===
            'python'
            ? 'python'
            : 'java';

        const sample =
          normalizeString(
            initialProblem.sample
          ).trim() ||
          getExampleSample(examples);

        setWorkspaceState(
          (prevState) => ({
            ...prevState,

            title:
              normalizeString(
                initialProblem.title
              ).trim() ||
              'Untitled',

            problemId:
              initialProblem.problem_id ||
              null,

            problemStatement:
              normalizeString(
                initialProblem.statement
              ),

            inputFormat:
              normalizeString(
                initialProblem.input_format
              ),

            outputFormat:
              normalizeString(
                initialProblem.output_format
              ),

            constraints:
              normalizeString(
                initialProblem.constraints
              ),

            examples,

            sample,

            publicTests:
              normalizeArray(
                initialProblem.public_tests
              ),

            hiddenTestCount:
              Number.isInteger(
                initialProblem.hidden_test_count
              )
                ? initialProblem.hidden_test_count
                : 0,

            difficulty:
              normalizeString(
                initialProblem.difficulty
              ),

            topics:
              normalizeArray(
                initialProblem.topics
              ),

            code:
              language === 'java'
                ? javaCode
                : pythonCode,

            javaCode,

            pythonCode,
          })
        );

        return;
      }


      try {
        const currentWorkspace =
          getCurrentWorkspace();

        if (
          currentWorkspace &&
          !cancelled
        ) {
          setWorkspaceState(
            (prevState) => ({
              ...prevState,
              ...currentWorkspace,

              id:
                currentWorkspace.id ||
                prevState.id,

              language:
                currentWorkspace.language ===
                  'python'
                  ? 'python'
                  : 'java',

              code:
                normalizeString(
                  currentWorkspace.code
                ) ||
                (
                  currentWorkspace.language ===
                    'python'
                    ? DEFAULT_PYTHON_CODE
                    : DEFAULT_JAVA_CODE
                ),

              javaCode:
                normalizeString(
                  currentWorkspace.javaCode
                ) ||
                DEFAULT_JAVA_CODE,

              pythonCode:
                normalizeString(
                  currentWorkspace.pythonCode
                ) ||
                DEFAULT_PYTHON_CODE,

              examples:
                normalizeArray(
                  currentWorkspace.examples
                ),

              publicTests:
                normalizeArray(
                  currentWorkspace.publicTests
                ),

              topics:
                normalizeArray(
                  currentWorkspace.topics
                ),
            })
          );
        }
      } catch (error) {
        console.error(
          '[CodingWorkspace] Failed to restore workspace:',
          error
        );
      }
    };

    loadWorkspace();

    return () => {
      cancelled = true;
    };

    // Workspace initialization intentionally happens
    // when the incoming workspace identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedCodeId, initialProblem]);


  const handleLanguageChange =
    (e) => {
      const newLanguage =
        e.target.value === 'python'
          ? 'python'
          : 'java';

      setWorkspaceState(
        (prev) => {
          const currentCode =
            normalizeString(
              prev.code
            );

          const updatedState = {
            ...prev,

            [
              prev.language === 'java'
                ? 'javaCode'
                : 'pythonCode'
            ]: currentCode,
          };

          const newCode =
            newLanguage === 'java'
              ? normalizeStarterCode(
                updatedState.javaCode,
                DEFAULT_JAVA_CODE
              )
              : normalizeStarterCode(
                updatedState.pythonCode,
                DEFAULT_PYTHON_CODE
              );

          const newState = {
            ...updatedState,

            language:
              newLanguage,

            code:
              newCode,
          };

          saveCurrentWorkspace(
            newState
          );

          return newState;
        }
      );
    };


  const handleCodeChange =
    (value) => {
      const newCode =
        typeof value === 'string'
          ? value
          : '';

      setWorkspaceState(
        (prev) => {
          const newState = {
            ...prev,

            code: newCode,

            [
              prev.language === 'java'
                ? 'javaCode'
                : 'pythonCode'
            ]: newCode,
          };

          saveCurrentWorkspace(
            newState
          );

          return newState;
        }
      );
    };


  const showActionMessage =
    useCallback((message) => {
      setActionMessage(message);

      if (actionMessageTimeoutRef.current) {
        clearTimeout(
          actionMessageTimeoutRef.current
        );
      }

      actionMessageTimeoutRef.current =
        setTimeout(() => {
          setActionMessage('');
          actionMessageTimeoutRef.current =
            null;
        }, 3000);
    }, []);


  const handleSave = () => {
    try {
      saveCode({
        id: workspaceState.id,
        title:
          workspaceState.title ||
          'Untitled',
        language:
          workspaceState.language,
        code:
          workspaceState.code || '',
        sourceMode:
          workspaceState.sourceMode,
      });

      showActionMessage(
        'Code saved successfully.'
      );
    } catch (err) {
      showActionMessage(
        getErrorMessage(
          err,
          'Unable to save code.'
        )
      );
    }
  };


  const handleRun = async () => {
    if (isRunning || isSubmitting) {
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);

    try {
      const result =
        await executeCode(
          workspaceState.language,
          workspaceState.code,
          customInput
        );

      setExecutionResult(
        result
      );
    } catch (err) {
      setExecutionResult({
        status:
          err?.code ||
          'execution_service_unavailable',

        stderr:
          getErrorMessage(
            err,
            'Unable to execute code right now. Please try again.'
          ),

        stdout: '',
      });
    } finally {
      setIsRunning(false);
    }
  };


  const handleRunSuite =
    async (testSuite) => {
      if (isSubmitting || isRunning) {
        return;
      }

      if (!workspaceState.problemId) {
        showActionMessage(
          'Test execution is only available for generated problems.'
        );
        return;
      }

      setIsSubmitting(true);
      setExecutionResult(null);

      try {
        const result =
          await submitCode(
            workspaceState.problemId,
            workspaceState.language,
            workspaceState.code,
            testSuite
          );

        setExecutionResult({
          ...result,

          isSubmit: true,

          testSuite,
        });
      } catch (err) {
        setExecutionResult({
          status:
            'System Error',

          stderr:
            getErrorMessage(
              err,
              'Unable to evaluate code right now. Please try again.'
            ),

          isSubmit: true,

          testSuite,
        });
      } finally {
        setIsSubmitting(false);
      }
    };


  const handleMouseDown =
    (e) => {
      e.preventDefault();
      setIsDragging(true);
    };


  const handleAiAction =
    async (actionType) => {
      if (isAnalyzing) {
        return;
      }

      const problemStatement =
        workspaceState.problemStatement
          .trim();

      const sample =
        workspaceState.sample.trim();

      const constraints =
        workspaceState.constraints.trim();

      const code =
        workspaceState.code;

      if (!problemStatement) {
        setAiAnalysisResult(
          'Please provide a problem statement before using AI analysis.'
        );
        return;
      }

      if (!sample) {
        setAiAnalysisResult(
          'Please provide a sample test case before using this AI action.'
        );
        return;
      }

      setIsAnalyzing(true);
      setAiAnalysisResult(null);
      setAiImprovementResult(null);

      try {
        if (actionType === 'explain') {
          const result =
            await analyzeCode(
              problemStatement,
              sample,
              constraints,
              code,
              workspaceState.language
            );

          setAiAnalysisResult(
            result?.explanation ||
            'No explanation was returned.'
          );
        }


        else if (
          actionType === 'testcases'
        ) {
          if (!workspaceState.problemId) {
            setAiAnalysisResult(
              'Cannot generate test cases without an active problem ID.'
            );

            return;
          }

          const result =
            await generateTestCases(
              workspaceState.problemId,
              problemStatement,
              sample,
              constraints,
              code,
              workspaceState.language
            );

          const newPublicTests =
            normalizeArray(
              result?.public_tests
            );

          const newHiddenCount =
            Number.isInteger(
              result?.hidden_test_count
            )
              ? result.hidden_test_count
              : 0;

          setWorkspaceState(
            (prev) => {
              const newState = {
                ...prev,

                publicTests: [
                  ...normalizeArray(
                    prev.publicTests
                  ),
                  ...newPublicTests,
                ],

                hiddenTestCount:
                  (
                    Number.isInteger(
                      prev.hiddenTestCount
                    )
                      ? prev.hiddenTestCount
                      : 0
                  ) +
                  newHiddenCount,
              };

              saveCurrentWorkspace(
                newState
              );

              return newState;
            }
          );

          setAiAnalysisResult(
            `Generated ${newPublicTests.length} public tests and ${newHiddenCount} hidden tests successfully. They have been added to your workspace evaluation suite.`
          );
        }


        else if (
          actionType === 'improve'
        ) {
          const result =
            await improveCode(
              problemStatement,
              sample,
              constraints,
              code,
              workspaceState.language
            );

          setAiImprovementResult(
            result
          );
        }
      } catch (err) {
        setAiAnalysisResult(
          getErrorMessage(
            err,
            'Failed to contact the AI service.'
          )
        );
      } finally {
        setIsAnalyzing(false);
      }
    };


  const handleApplyImprovement =
    () => {
      const optimizedCode =
        normalizeString(
          aiImprovementResult?.optimized_code
        );

      if (!optimizedCode.trim()) {
        return;
      }

      handleCodeChange(
        optimizedCode
      );

      setAiImprovementResult(null);

      setAiAnalysisResult(
        'Code updated successfully.'
      );
    };


  useEffect(() => {
    const handleMouseMove =
      (e) => {
        if (
          !isDragging ||
          !workspaceRef.current
        ) {
          return;
        }

        const rect =
          workspaceRef.current.getBoundingClientRect();

        if (rect.width <= 0) {
          return;
        }

        const newWidth =
          (
            (e.clientX - rect.left) /
            rect.width
          ) * 100;

        if (
          newWidth > 10 &&
          newWidth < 90
        ) {
          setPanelWidth(
            newWidth
          );
        }
      };


    const handleMouseUp =
      () => {
        setIsDragging(false);
      };


    if (isDragging) {
      document.addEventListener(
        'mousemove',
        handleMouseMove
      );

      document.addEventListener(
        'mouseup',
        handleMouseUp
      );
    }


    return () => {
      document.removeEventListener(
        'mousemove',
        handleMouseMove
      );

      document.removeEventListener(
        'mouseup',
        handleMouseUp
      );
    };
  }, [isDragging]);


  const hasAiContext =
    Boolean(
      workspaceState.problemStatement.trim() &&
      workspaceState.sample.trim()
    );


  return (
    <div className="coding-workspace-container">

      <header className="workspace-header">
        <div className="workspace-header-left">
          <h2>
            {workspaceState.title}
          </h2>

          <select
            value={
              workspaceState.language
            }
            onChange={
              handleLanguageChange
            }
            className="language-selector"
            disabled={
              isRunning ||
              isSubmitting
            }
          >
            <option value="java">
              Java
            </option>

            <option value="python">
              Python
            </option>
          </select>
        </div>
      </header>


      <div
        className="workspace-main"
        ref={workspaceRef}
      >

        <div
          className="workspace-panel problem-panel"
          style={{
            width: `${panelWidth}%`,
            flex: 'none',
          }}
        >
          <h3>
            Problem
          </h3>

          {workspaceState.problemStatement ? (
            <div className="problem-content">

              <p
                style={{
                  whiteSpace: 'pre-wrap',
                }}
              >
                {
                  workspaceState.problemStatement
                }
              </p>


              {workspaceState.inputFormat && (
                <>
                  <h4>
                    Input Format
                  </h4>

                  <p
                    style={{
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {
                      workspaceState.inputFormat
                    }
                  </p>
                </>
              )}


              {workspaceState.outputFormat && (
                <>
                  <h4>
                    Output Format
                  </h4>

                  <p
                    style={{
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {
                      workspaceState.outputFormat
                    }
                  </p>
                </>
              )}


              {workspaceState.constraints && (
                <>
                  <h4>
                    Constraints
                  </h4>

                  <p
                    style={{
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {
                      workspaceState.constraints
                    }
                  </p>
                </>
              )}


              {workspaceState.examples.length > 0 ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems:
                        'center',
                      marginTop: '16px',
                      marginBottom: '12px',
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                      }}
                    >
                      Examples
                    </h4>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        handleRunSuite(
                          'samples'
                        )
                      }
                      disabled={
                        isSubmitting ||
                        isRunning
                      }
                    >
                      Run Samples
                    </Button>
                  </div>


                  {workspaceState.examples.map(
                    (example, index) => (
                      <details
                        key={`example-${index}`}
                        style={{
                          marginBottom:
                            '16px',
                          padding: '12px',
                          background:
                            'var(--color-surface-2)',
                          borderRadius:
                            '6px',
                        }}
                        open={
                          index === 0
                        }
                      >
                        <summary
                          style={{
                            cursor:
                              'pointer',
                            fontWeight:
                              'bold',
                            color:
                              'var(--color-text)',
                            outline:
                              'none',
                          }}
                        >
                          Example{' '}
                          {index + 1}
                        </summary>

                        <div
                          style={{
                            marginTop:
                              '12px',
                          }}
                        >
                          <span
                            style={{
                              color:
                                'var(--color-muted)',
                              fontSize:
                                '0.9em',
                            }}
                          >
                            Input:
                          </span>

                          <br />

                          <pre
                            style={{
                              margin:
                                '4px 0',
                              padding:
                                '8px',
                            }}
                          >
                            {
                              example?.input ||
                              ''
                            }
                          </pre>
                        </div>


                        <div
                          style={{
                            marginTop:
                              '8px',
                          }}
                        >
                          <span
                            style={{
                              color:
                                'var(--color-muted)',
                              fontSize:
                                '0.9em',
                            }}
                          >
                            Output:
                          </span>

                          <br />

                          <pre
                            style={{
                              margin:
                                '4px 0',
                              padding:
                                '8px',
                            }}
                          >
                            {
                              example?.output ||
                              ''
                            }
                          </pre>
                        </div>


                        {example?.explanation && (
                          <div
                            style={{
                              marginTop:
                                '8px',
                            }}
                          >
                            <span
                              style={{
                                color:
                                  'var(--color-muted)',
                                fontSize:
                                  '0.9em',
                              }}
                            >
                              Explanation:
                            </span>

                            <br />

                            <p
                              style={{
                                margin:
                                  '4px 0',
                                whiteSpace:
                                  'pre-wrap',
                              }}
                            >
                              {
                                example.explanation
                              }
                            </p>
                          </div>
                        )}
                      </details>
                    )
                  )}
                </>
              ) : workspaceState.sample ? (
                <>
                  <h4>
                    Sample Test Case
                  </h4>

                  <pre
                    style={{
                      whiteSpace:
                        'pre-wrap',
                      background:
                        'var(--color-surface-2)',
                      padding:
                        '12px',
                      borderRadius:
                        '6px',
                    }}
                  >
                    {
                      workspaceState.sample
                    }
                  </pre>
                </>
              ) : null}


              {workspaceState.publicTests.length > 0 && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems:
                        'center',
                      marginTop: '16px',
                      marginBottom:
                        '12px',
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                      }}
                    >
                      Public Tests (
                      {
                        workspaceState
                          .publicTests
                          .length
                      }
                      )
                    </h4>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        handleRunSuite(
                          'public'
                        )
                      }
                      disabled={
                        isSubmitting ||
                        isRunning
                      }
                    >
                      Run Public Tests
                    </Button>
                  </div>


                  {workspaceState.publicTests.map(
                    (testCase, index) => (
                      <details
                        key={`public-${index}`}
                        style={{
                          marginBottom:
                            '16px',
                          padding:
                            '12px',
                          background:
                            'var(--color-surface-2)',
                          borderRadius:
                            '6px',
                        }}
                      >
                        <summary
                          style={{
                            cursor:
                              'pointer',
                            fontWeight:
                              'bold',
                            color:
                              'var(--color-text)',
                            outline:
                              'none',
                          }}
                        >
                          Test Case{' '}
                          {index + 1}
                        </summary>

                        <div
                          style={{
                            marginTop:
                              '12px',
                          }}
                        >
                          <span
                            style={{
                              color:
                                'var(--color-muted)',
                              fontSize:
                                '0.9em',
                            }}
                          >
                            Input:
                          </span>

                          <br />

                          <pre
                            style={{
                              margin:
                                '4px 0',
                              padding:
                                '8px',
                            }}
                          >
                            {
                              testCase?.input ||
                              ''
                            }
                          </pre>
                        </div>

                        <div
                          style={{
                            marginTop:
                              '8px',
                          }}
                        >
                          <span
                            style={{
                              color:
                                'var(--color-muted)',
                              fontSize:
                                '0.9em',
                            }}
                          >
                            Expected Output:
                          </span>

                          <br />

                          <pre
                            style={{
                              margin:
                                '4px 0',
                              padding:
                                '8px',
                            }}
                          >
                            {
                              testCase?.output ||
                              ''
                            }
                          </pre>
                        </div>
                      </details>
                    )
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="empty-problem">
              <p>
                No problem context
                provided.
              </p>

              <p>
                Write your code
                independently.
              </p>
            </div>
          )}


          <div className="custom-input-section">
            <h4>
              Custom Input
            </h4>

            <textarea
              placeholder="Enter custom input here..."
              style={{
                width: '100%',
                minHeight: '120px',
                resize: 'vertical',
                padding: '12px',
                background:
                  'var(--color-surface-2)',
                border:
                  '1px solid var(--color-border)',
                borderRadius:
                  '6px',
                color:
                  'var(--color-text)',
                fontFamily:
                  'monospace',
              }}
              value={customInput}
              onChange={(e) =>
                setCustomInput(
                  e.target.value
                )
              }
              disabled={
                isRunning ||
                isSubmitting
              }
            />
          </div>
        </div>


        <div
          className="workspace-resizer"
          onMouseDown={
            handleMouseDown
          }
        />


        <div
          className="workspace-panel editor-panel"
          style={{
            width: `${100 - panelWidth}%`,
            flex: 'none',
          }}
        >
          <Editor
            height="100%"
            language={
              workspaceState.language
            }
            theme={theme}
            value={
              workspaceState.code ||
              (
                workspaceState.language ===
                  'java'
                  ? DEFAULT_JAVA_CODE
                  : DEFAULT_PYTHON_CODE
              )
            }
            onChange={
              handleCodeChange
            }
            options={{
              minimap: {
                enabled: false,
              },
              fontSize: 14,
              automaticLayout: true,
              readOnly:
                isRunning ||
                isSubmitting,
            }}
          />
        </div>
      </div>


      <footer className="workspace-footer">

        <div className="toolbar">

          <Button
            variant="secondary"
            onClick={handleRun}
            loading={isRunning}
            disabled={
              isSubmitting
            }
          >
            {isRunning
              ? 'Running...'
              : 'Run'}
          </Button>


          <Button
            variant="success"
            onClick={() =>
              handleRunSuite('all')
            }
            loading={
              isSubmitting
            }
            disabled={
              isRunning ||
              !workspaceState.problemId
            }
            title="Submit code for evaluation"
          >
            {isSubmitting
              ? 'Evaluating...'
              : 'Submit'}
          </Button>


          {workspaceState.sourceMode ===
            'ide' && (
              <Button
                variant="primary"
                className="btn-ghost"
                onClick={() => {
                  setShowAiModal(
                    true
                  );

                  setAiAnalysisResult(
                    null
                  );

                  setAiImprovementResult(
                    null
                  );
                }}
              >
                ✨ AI Analyze
              </Button>
            )}


          {workspaceState.sourceMode ===
            'learn' && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAiModal(
                      true
                    );

                    setAiAnalysisResult(
                      null
                    );

                    setAiImprovementResult(
                      null
                    );

                    handleAiAction(
                      'explain'
                    );
                  }}
                >
                  Explain Code
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAiModal(
                      true
                    );

                    setAiAnalysisResult(
                      null
                    );

                    setAiImprovementResult(
                      null
                    );

                    handleAiAction(
                      'improve'
                    );
                  }}
                >
                  Improve Code
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAiModal(
                      true
                    );

                    setAiAnalysisResult(
                      null
                    );

                    setAiImprovementResult(
                      null
                    );

                    handleAiAction(
                      'testcases'
                    );
                  }}
                >
                  Create Test Cases
                </Button>
              </>
            )}


          <div
            style={{
              marginLeft:
                'auto',
              display:
                'flex',
              alignItems:
                'center',
              gap: '12px',
            }}
          >
            {actionMessage && (
              <div
                className="action-message"
                style={{
                  margin: 0,
                }}
                role="status"
              >
                {actionMessage}
              </div>
            )}

            <Button
              variant="primary"
              onClick={
                handleSave
              }
              disabled={
                isRunning ||
                isSubmitting
              }
            >
              Save
            </Button>
          </div>
        </div>


        <div
          className={`results-resizer ${isDraggingResults
              ? 'dragging'
              : ''
            }`}
          onPointerDown={
            handleResultsPointerDown
          }
          title="Resize test results panel"
        />


        <div
          className="test-results-section"
          style={{
            height: `${resultsHeight}px`,
            display:
              resultsHeight === 0
                ? 'none'
                : 'flex',
            flexDirection:
              'column',
          }}
        >
          <h4
            style={{
              flexShrink: 0,
            }}
          >
            Test / Execution Results
          </h4>


          {!executionResult &&
            !isRunning &&
            !isSubmitting && (
              <p className="test-results-placeholder">
                Click Run to execute
                your code, or Submit
                to evaluate it.
              </p>
            )}


          {(isRunning ||
            isSubmitting) && (
              <p className="test-results-placeholder">
                {isRunning
                  ? 'Executing code...'
                  : 'Evaluating submission...'}
              </p>
            )}


          {executionResult &&
            !executionResult.isSubmit && (
              <div
                className={`execution-result ${executionResult.status
                  }`}
              >
                <div
                  style={{
                    fontWeight:
                      'bold',
                    marginBottom:
                      '8px',
                    color:
                      executionResult.status ===
                        'success'
                        ? 'var(--color-success)'
                        : 'var(--color-error)',
                  }}
                >
                  {executionResult.status ===
                    'success'
                    ? '✓ Execution Successful'
                    : executionResult.status ===
                      'compilation_error'
                      ? 'Compilation Error'
                      : executionResult.status ===
                        'runtime_error'
                        ? 'Runtime Error'
                        : executionResult.status ===
                          'timeout'
                          ? 'Execution Timed Out'
                          : executionResult.status ===
                            'output_limit'
                            ? 'Output Limit Exceeded'
                            : executionResult.status ===
                              'execution_service_unavailable'
                              ? 'Unable to execute code right now. Please try again.'
                              : executionResult.status ===
                                'NETWORK_ERROR'
                                ? 'Unable to connect to the execution service.'
                                : 'Execution Failed'}
                </div>


                {executionResult.stdout && (
                  <>
                    <div
                      style={{
                        fontWeight:
                          '600',
                        marginTop:
                          '12px',
                        color:
                          'var(--color-text)',
                      }}
                    >
                      Output:
                    </div>

                    <pre
                      style={{
                        background:
                          'var(--color-surface-2)',
                        padding:
                          '8px',
                        borderRadius:
                          '4px',
                        marginTop:
                          '4px',
                        whiteSpace:
                          'pre-wrap',
                        wordBreak:
                          'break-word',
                        color:
                          'var(--color-text)',
                      }}
                    >
                      {
                        executionResult.stdout
                      }
                    </pre>
                  </>
                )}


                {executionResult.stderr && (
                  <>
                    <div
                      style={{
                        fontWeight:
                          '600',
                        marginTop:
                          '12px',
                        color:
                          'var(--color-text)',
                      }}
                    >
                      Error:
                    </div>

                    <pre
                      style={{
                        background:
                          'var(--color-surface-2)',
                        padding:
                          '8px',
                        borderRadius:
                          '4px',
                        marginTop:
                          '4px',
                        whiteSpace:
                          'pre-wrap',
                        wordBreak:
                          'break-word',
                        color:
                          'var(--color-error)',
                      }}
                    >
                      {
                        executionResult.stderr
                      }
                    </pre>
                  </>
                )}


                {executionResult.execution_time_ms !==
                  undefined &&
                  executionResult.execution_time_ms >=
                  0 && (
                    <div
                      style={{
                        marginTop:
                          '12px',
                        fontSize:
                          '0.9rem',
                        color:
                          'var(--color-muted)',
                      }}
                    >
                      Execution Time:{' '}
                      {
                        executionResult.execution_time_ms
                      }{' '}
                      ms
                    </div>
                  )}
              </div>
            )}


          {executionResult &&
            executionResult.isSubmit && (
              <div
                className={`execution-result ${[
                    'Accepted',
                    'Tests Passed',
                  ].includes(
                    executionResult.status
                  )
                    ? 'success'
                    : 'error'
                  }`}
              >
                <div
                  style={{
                    fontWeight:
                      'bold',
                    marginBottom:
                      '8px',
                    color:
                      [
                        'Accepted',
                        'Tests Passed',
                      ].includes(
                        executionResult.status
                      )
                        ? 'var(--color-success)'
                        : 'var(--color-error)',
                  }}
                >
                  {[
                    'Accepted',
                    'Tests Passed',
                  ].includes(
                    executionResult.status
                  )
                    ? `✓ ${executionResult.status}`
                    : executionResult.status ===
                      'System Error'
                      ? 'Unable to evaluate code right now. Please try again.'
                      : `✗ ${executionResult.status}`}
                </div>


                {executionResult.status !==
                  'System Error' && (
                    <div
                      style={{
                        color:
                          'var(--color-text)',
                        marginBottom:
                          '16px',
                      }}
                    >
                      {executionResult.testSuite ===
                        'all' && (
                          <div
                            style={{
                              display:
                                'grid',
                              gridTemplateColumns:
                                'repeat(4, 1fr)',
                              gap: '12px',
                              background:
                                'var(--color-surface-2)',
                              padding:
                                '16px',
                              borderRadius:
                                '8px',
                            }}
                          >
                            <div
                              style={{
                                display:
                                  'flex',
                                flexDirection:
                                  'column',
                              }}
                            >
                              <span
                                style={{
                                  color:
                                    'var(--color-muted)',
                                  fontSize:
                                    '0.85em',
                                  textTransform:
                                    'uppercase',
                                  marginBottom:
                                    '4px',
                                }}
                              >
                                Samples
                              </span>

                              <span
                                style={{
                                  fontSize:
                                    '1.2em',
                                  fontWeight:
                                    'bold',
                                }}
                              >
                                {
                                  executionResult.passed_samples ||
                                  0
                                }{' '}
                                /{' '}
                                {
                                  executionResult.total_samples ||
                                  0
                                }
                              </span>
                            </div>


                            <div
                              style={{
                                display:
                                  'flex',
                                flexDirection:
                                  'column',
                              }}
                            >
                              <span
                                style={{
                                  color:
                                    'var(--color-muted)',
                                  fontSize:
                                    '0.85em',
                                  textTransform:
                                    'uppercase',
                                  marginBottom:
                                    '4px',
                                }}
                              >
                                Public
                              </span>

                              <span
                                style={{
                                  fontSize:
                                    '1.2em',
                                  fontWeight:
                                    'bold',
                                }}
                              >
                                {
                                  executionResult.passed_public ||
                                  0
                                }{' '}
                                /{' '}
                                {
                                  executionResult.total_public ||
                                  0
                                }
                              </span>
                            </div>


                            <div
                              style={{
                                display:
                                  'flex',
                                flexDirection:
                                  'column',
                              }}
                            >
                              <span
                                style={{
                                  color:
                                    'var(--color-muted)',
                                  fontSize:
                                    '0.85em',
                                  textTransform:
                                    'uppercase',
                                  marginBottom:
                                    '4px',
                                }}
                              >
                                Hidden
                              </span>

                              <span
                                style={{
                                  fontSize:
                                    '1.2em',
                                  fontWeight:
                                    'bold',
                                }}
                              >
                                {
                                  executionResult.passed_hidden ||
                                  0
                                }{' '}
                                /{' '}
                                {
                                  executionResult.total_hidden ||
                                  0
                                }
                              </span>
                            </div>


                            <div
                              style={{
                                display:
                                  'flex',
                                flexDirection:
                                  'column',
                              }}
                            >
                              <span
                                style={{
                                  color:
                                    'var(--color-primary)',
                                  fontSize:
                                    '0.85em',
                                  textTransform:
                                    'uppercase',
                                  marginBottom:
                                    '4px',
                                  fontWeight:
                                    'bold',
                                }}
                              >
                                Total
                              </span>

                              <span
                                style={{
                                  fontSize:
                                    '1.2em',
                                  fontWeight:
                                    'bold',
                                  color:
                                    'var(--color-primary)',
                                }}
                              >
                                {
                                  executionResult.passed_tests ||
                                  0
                                }{' '}
                                /{' '}
                                {
                                  executionResult.total_tests ||
                                  0
                                }
                              </span>
                            </div>
                          </div>
                        )}


                      {executionResult.testSuite ===
                        'samples' && (
                          <div
                            style={{
                              background:
                                'var(--color-surface-2)',
                              padding:
                                '12px 16px',
                              borderRadius:
                                '8px',
                              display:
                                'inline-block',
                            }}
                          >
                            <span
                              style={{
                                color:
                                  'var(--color-muted)',
                                fontSize:
                                  '0.85em',
                                textTransform:
                                  'uppercase',
                                marginRight:
                                  '12px',
                              }}
                            >
                              Samples
                            </span>

                            <span
                              style={{
                                fontSize:
                                  '1.1em',
                                fontWeight:
                                  'bold',
                              }}
                            >
                              {
                                executionResult.passed_samples ||
                                0
                              }{' '}
                              /{' '}
                              {
                                executionResult.total_samples ||
                                0
                              }
                            </span>
                          </div>
                        )}


                      {executionResult.testSuite ===
                        'public' && (
                          <div
                            style={{
                              background:
                                'var(--color-surface-2)',
                              padding:
                                '12px 16px',
                              borderRadius:
                                '8px',
                              display:
                                'inline-block',
                            }}
                          >
                            <span
                              style={{
                                color:
                                  'var(--color-muted)',
                                fontSize:
                                  '0.85em',
                                textTransform:
                                  'uppercase',
                                marginRight:
                                  '12px',
                              }}
                            >
                              Public Tests
                            </span>

                            <span
                              style={{
                                fontSize:
                                  '1.1em',
                                fontWeight:
                                  'bold',
                              }}
                            >
                              {
                                executionResult.passed_public ||
                                0
                              }{' '}
                              /{' '}
                              {
                                executionResult.total_public ||
                                0
                              }
                            </span>
                          </div>
                        )}
                    </div>
                  )}


                {executionResult.stderr && (
                  <>
                    <div
                      style={{
                        fontWeight:
                          '600',
                        marginTop:
                          '12px',
                        color:
                          'var(--color-text)',
                      }}
                    >
                      Details:
                    </div>

                    <pre
                      style={{
                        background:
                          'var(--color-surface-2)',
                        padding:
                          '8px',
                        borderRadius:
                          '4px',
                        marginTop:
                          '4px',
                        whiteSpace:
                          'pre-wrap',
                        wordBreak:
                          'break-word',
                        color:
                          'var(--color-error)',
                      }}
                    >
                      {
                        executionResult.stderr
                      }
                    </pre>
                  </>
                )}


                {executionResult.hidden_test_failed ? (
                  <div
                    style={{
                      marginTop:
                        '12px',
                      background:
                        'var(--color-surface-2)',
                      padding:
                        '12px',
                      borderRadius:
                        '4px',
                    }}
                  >
                    <div
                      style={{
                        fontWeight:
                          '600',
                        color:
                          'var(--color-text)',
                        marginBottom:
                          '8px',
                      }}
                    >
                      Hidden Test Failed
                    </div>

                    <div
                      style={{
                        color:
                          'var(--color-muted)',
                      }}
                    >
                      A hidden test case
                      did not pass. Try
                      to find edge cases
                      in your logic.
                    </div>
                  </div>
                ) : executionResult.failed_test_input && (
                  <div
                    style={{
                      marginTop:
                        '12px',
                      background:
                        'var(--color-surface-2)',
                      padding:
                        '12px',
                      borderRadius:
                        '4px',
                    }}
                  >
                    <div
                      style={{
                        fontWeight:
                          '600',
                        color:
                          'var(--color-text)',
                        marginBottom:
                          '8px',
                      }}
                    >
                      Public Test Case Failed:
                    </div>

                    <div
                      style={{
                        marginBottom:
                          '8px',
                      }}
                    >
                      <span
                        style={{
                          color:
                            'var(--color-muted)',
                        }}
                      >
                        Input:
                      </span>

                      <br />

                      <pre
                        style={{
                          margin:
                            '4px 0',
                          padding:
                            '8px',
                        }}
                      >
                        {
                          executionResult.failed_test_input
                        }
                      </pre>
                    </div>


                    <div
                      style={{
                        marginBottom:
                          '8px',
                      }}
                    >
                      <span
                        style={{
                          color:
                            'var(--color-muted)',
                        }}
                      >
                        Expected Output:
                      </span>

                      <br />

                      <pre
                        style={{
                          margin:
                            '4px 0',
                          padding:
                            '8px',
                        }}
                      >
                        {
                          executionResult.failed_test_expected
                        }
                      </pre>
                    </div>


                    {executionResult.failed_test_actual && (
                      <div>
                        <span
                          style={{
                            color:
                              'var(--color-muted)',
                          }}
                        >
                          Actual Output:
                        </span>

                        <br />

                        <pre
                          style={{
                            margin:
                              '4px 0',
                            padding:
                              '8px',
                          }}
                        >
                          {
                            executionResult.failed_test_actual
                          }
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
        </div>
      </footer>


      {showAiModal && (
        <div
          className="ai-modal-overlay"
          style={{
            position:
              'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor:
              'rgba(0,0,0,0.5)',
            display:
              'flex',
            justifyContent:
              'center',
            alignItems:
              'center',
            zIndex: 1000,
          }}
        >
          <div
            className="ai-modal-content"
            style={{
              background:
                'var(--color-surface)',
              padding:
                '24px',
              borderRadius:
                '8px',
              width:
                '600px',
              maxWidth:
                '90%',
              maxHeight:
                '80vh',
              overflowY:
                'auto',
              boxShadow:
                '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                marginBottom:
                  '16px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color:
                    'var(--color-primary)',
                }}
              >
                ✨ AI Analyze
              </h3>

              <button
                onClick={() =>
                  setShowAiModal(
                    false
                  )
                }
                style={{
                  background:
                    'none',
                  border:
                    'none',
                  fontSize:
                    '24px',
                  cursor:
                    'pointer',
                  color:
                    'var(--color-text)',
                }}
                aria-label="Close AI analysis"
              >
                &times;
              </button>
            </div>


            {workspaceState.sourceMode ===
              'ide' &&
              !workspaceState.problemStatement && (
                <div
                  style={{
                    marginBottom:
                      '24px',
                  }}
                >
                  <p>
                    Please provide
                    problem context to
                    analyze your code
                    effectively.
                  </p>

                  <div
                    className="form-group"
                    style={{
                      marginBottom:
                        '12px',
                    }}
                  >
                    <label
                      htmlFor="ai-problem-statement"
                      style={{
                        display:
                          'block',
                        marginBottom:
                          '4px',
                        fontWeight:
                          'bold',
                      }}
                    >
                      Problem Statement
                      (Required)
                    </label>

                    <textarea
                      id="ai-problem-statement"
                      value={
                        workspaceState.problemStatement
                      }
                      onChange={(e) =>
                        setWorkspaceState(
                          (prev) => ({
                            ...prev,
                            problemStatement:
                              e.target.value,
                          })
                        )
                      }
                      placeholder="Describe the problem..."
                      rows={4}
                      disabled={
                        isAnalyzing
                      }
                      style={{
                        width:
                          '100%',
                        padding:
                          '8px',
                        border:
                          '1px solid var(--color-border)',
                        borderRadius:
                          '4px',
                        background:
                          'var(--color-surface)',
                        color:
                          'var(--color-text)',
                      }}
                    />
                  </div>


                  <div
                    className="form-group"
                    style={{
                      marginBottom:
                        '12px',
                    }}
                  >
                    <label
                      htmlFor="ai-sample-test"
                      style={{
                        display:
                          'block',
                        marginBottom:
                          '4px',
                        fontWeight:
                          'bold',
                      }}
                    >
                      Sample Test Case
                      (Required)
                    </label>

                    <textarea
                      id="ai-sample-test"
                      value={
                        workspaceState.sample
                      }
                      onChange={(e) =>
                        setWorkspaceState(
                          (prev) => ({
                            ...prev,
                            sample:
                              e.target.value,
                          })
                        )
                      }
                      placeholder="Input: ... Output: ..."
                      rows={2}
                      disabled={
                        isAnalyzing
                      }
                      style={{
                        width:
                          '100%',
                        padding:
                          '8px',
                        border:
                          '1px solid var(--color-border)',
                        borderRadius:
                          '4px',
                        background:
                          'var(--color-surface)',
                        color:
                          'var(--color-text)',
                      }}
                    />
                  </div>


                  <div
                    className="form-group"
                    style={{
                      marginBottom:
                        '16px',
                    }}
                  >
                    <label
                      htmlFor="ai-constraints"
                      style={{
                        display:
                          'block',
                        marginBottom:
                          '4px',
                        fontWeight:
                          'bold',
                      }}
                    >
                      Constraints (Optional)
                    </label>

                    <input
                      id="ai-constraints"
                      type="text"
                      value={
                        workspaceState.constraints
                      }
                      onChange={(e) =>
                        setWorkspaceState(
                          (prev) => ({
                            ...prev,
                            constraints:
                              e.target.value,
                          })
                        )
                      }
                      placeholder="e.g. 1 <= N <= 10^5"
                      disabled={
                        isAnalyzing
                      }
                      style={{
                        width:
                          '100%',
                        padding:
                          '8px',
                        border:
                          '1px solid var(--color-border)',
                        borderRadius:
                          '4px',
                        background:
                          'var(--color-surface)',
                        color:
                          'var(--color-text)',
                      }}
                    />
                  </div>
                </div>
              )}


            <div
              style={{
                display:
                  'flex',
                gap: '12px',
                marginBottom:
                  '24px',
              }}
            >
              <Button
                variant="secondary"
                onClick={() =>
                  handleAiAction(
                    'explain'
                  )
                }
                disabled={
                  isAnalyzing ||
                  !hasAiContext
                }
                style={{
                  flex: 1,
                }}
              >
                Explain Code
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  handleAiAction(
                    'improve'
                  )
                }
                disabled={
                  isAnalyzing ||
                  !hasAiContext
                }
                style={{
                  flex: 1,
                }}
              >
                Improve Code
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  handleAiAction(
                    'testcases'
                  )
                }
                disabled={
                  isAnalyzing ||
                  !hasAiContext ||
                  !workspaceState.problemId
                }
                style={{
                  flex: 1,
                }}
              >
                Create Test Cases
              </Button>
            </div>


            {isAnalyzing && (
              <div
                style={{
                  textAlign:
                    'center',
                  padding:
                    '20px',
                  color:
                    'var(--color-muted)',
                }}
              >
                Analyzing...
                Please wait.
              </div>
            )}


            {!isAnalyzing &&
              aiAnalysisResult && (
                <div
                  style={{
                    background:
                      'var(--color-surface-2)',
                    padding:
                      '16px',
                    borderRadius:
                      '6px',
                    whiteSpace:
                      'pre-wrap',
                    wordBreak:
                      'break-word',
                  }}
                >
                  {
                    aiAnalysisResult
                  }
                </div>
              )}


            {!isAnalyzing &&
              aiImprovementResult && (
                <div
                  style={{
                    background:
                      'var(--color-surface-2)',
                    padding:
                      '16px',
                    borderRadius:
                      '6px',
                  }}
                >
                  <p
                    style={{
                      whiteSpace:
                        'pre-wrap',
                      marginBottom:
                        '16px',
                    }}
                  >
                    {
                      aiImprovementResult.explanation ||
                      ''
                    }
                  </p>


                  {aiImprovementResult.current_complexity && (
                    <p>
                      <strong>
                        Current Complexity:
                      </strong>{' '}
                      {
                        aiImprovementResult.current_complexity
                      }
                    </p>
                  )}


                  {aiImprovementResult.possible_complexity && (
                    <p>
                      <strong>
                        Possible Complexity:
                      </strong>{' '}
                      {
                        aiImprovementResult.possible_complexity
                      }
                    </p>
                  )}


                  {aiImprovementResult.optimized_code && (
                    <div
                      style={{
                        marginTop:
                          '16px',
                      }}
                    >
                      <strong>
                        Optimized Code:
                      </strong>

                      <pre
                        style={{
                          background:
                            '#1e1e1e',
                          color:
                            '#d4d4d4',
                          padding:
                            '12px',
                          borderRadius:
                            '4px',
                          marginTop:
                            '8px',
                          overflowX:
                            'auto',
                          fontSize:
                            '13px',
                        }}
                      >
                        {
                          aiImprovementResult.optimized_code
                        }
                      </pre>

                      <button
                        onClick={
                          handleApplyImprovement
                        }
                        disabled={
                          isAnalyzing
                        }
                        style={{
                          marginTop:
                            '12px',
                          padding:
                            '8px 16px',
                          background:
                            'var(--color-primary)',
                          color:
                            'white',
                          border:
                            'none',
                          borderRadius:
                            '4px',
                          cursor:
                            'pointer',
                        }}
                      >
                        Replace Current Code
                      </button>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}