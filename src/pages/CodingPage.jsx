import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSavedCodes,
  deleteSavedCode,
  clearCurrentWorkspace,
} from '../utils/codingStorage';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import PageHeader from '../components/common/PageHeader';
import './CodingPage.css';


const MAX_SAVED_CODES = 5;


function loadSavedCodes() {
  try {
    const codes = getSavedCodes();

    return Array.isArray(codes)
      ? codes
      : [];
  } catch (error) {
    console.error(
      '[CodingPage] Failed to load saved codes:',
      error
    );

    return [];
  }
}


function formatUpdatedAt(value) {
  if (!value) {
    return 'Unknown';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleString();
}


export default function CodingPage() {
  const navigate = useNavigate();

  const [savedCodes, setSavedCodes] =
    useState([]);


  const refreshSavedCodes =
    useCallback(() => {
      setSavedCodes(
        loadSavedCodes()
      );
    }, []);


  useEffect(() => {
    refreshSavedCodes();

    /*
     * Refresh when the user returns to the tab/page.
     * This keeps the saved-code list in sync with
     * localStorage without changing the UI.
     */
    const handleFocus = () => {
      refreshSavedCodes();
    };

    window.addEventListener(
      'focus',
      handleFocus
    );

    return () => {
      window.removeEventListener(
        'focus',
        handleFocus
      );
    };
  }, [refreshSavedCodes]);


  const handleModeSelect = (
    mode
  ) => {
    const normalizedMode =
      mode === 'ai-learn'
        ? 'ai-learn'
        : 'ide';

    /*
     * Clear any previously recovered workspace
     * when explicitly starting a new workspace.
     */
    try {
      clearCurrentWorkspace();
    } catch (error) {
      console.error(
        '[CodingPage] Failed to clear current workspace:',
        error
      );
    }

    navigate(
      '/coding/workspace',
      {
        state: {
          sourceMode:
            normalizedMode,
          isNew: true,
        },
      }
    );
  };


  const handleModeKeyDown = (
    event,
    mode
  ) => {
    if (
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault();
      handleModeSelect(mode);
    }
  };


  const handleOpenSaved = (
    savedCode
  ) => {
    if (
      !savedCode ||
      !savedCode.id
    ) {
      return;
    }

    const sourceMode =
      savedCode.sourceMode ===
        'ai-learn'
        ? 'ai-learn'
        : 'ide';

    navigate(
      '/coding/workspace',
      {
        state: {
          sourceMode,
          savedCodeId:
            savedCode.id,
          isNew: false,
        },
      }
    );
  };


  const handleDelete = (
    id
  ) => {
    if (!id) {
      return;
    }

    const confirmed =
      window.confirm(
        'Are you sure you want to delete this saved code?'
      );

    if (!confirmed) {
      return;
    }

    try {
      deleteSavedCode(id);

      /*
       * Reload from storage instead of simply filtering
       * the current state. This keeps the UI consistent
       * with the actual persisted data.
       */
      refreshSavedCodes();
    } catch (error) {
      console.error(
        '[CodingPage] Failed to delete saved code:',
        error
      );

      window.alert(
        error?.message ||
        'Unable to delete the saved code. Please try again.'
      );
    }
  };


  return (
    <div className="page-content">
      <PageHeader
        title="Coding"
        subtitle="Learn, practice, test and improve your coding skills."
      />


      <section
        style={{
          marginBottom: '40px',
        }}
      >
        <h2
          style={{
            fontSize:
              'var(--font-size-xl)',
            marginBottom:
              '16px',
          }}
        >
          Select Mode
        </h2>


        <div
          style={{
            display:
              'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >

          <Card
            onClick={() =>
              handleModeSelect(
                'ai-learn'
              )
            }
            onKeyDown={(event) =>
              handleModeKeyDown(
                event,
                'ai-learn'
              )
            }
            role="button"
            tabIndex={0}
            aria-label="Open AI Learn Code mode"
            style={{
              cursor:
                'pointer',
              transition:
                'all 0.2s',
              border:
                '2px solid transparent',
            }}
            className="hover-border-primary"
          >
            <div
              style={{
                fontSize:
                  '32px',
                marginBottom:
                  '12px',
              }}
              aria-hidden="true"
            >
              🤖
            </div>

            <h3
              style={{
                margin:
                  '0 0 8px 0',
                fontSize:
                  'var(--font-size-lg)',
              }}
            >
              AI Learn Code
            </h3>

            <p
              style={{
                margin: 0,
                color:
                  'var(--color-text-secondary)',
                lineHeight:
                  '1.5',
              }}
            >
              Learn a new coding problem with AI. Generate custom test cases, get code explanations, and optimize your solutions.
            </p>
          </Card>


          <Card
            onClick={() =>
              handleModeSelect(
                'ide'
              )
            }
            onKeyDown={(event) =>
              handleModeKeyDown(
                event,
                'ide'
              )
            }
            role="button"
            tabIndex={0}
            aria-label="Open IDE mode"
            style={{
              cursor:
                'pointer',
              transition:
                'all 0.2s',
              border:
                '2px solid transparent',
            }}
            className="hover-border-primary"
          >
            <div
              style={{
                fontSize:
                  '32px',
                marginBottom:
                  '12px',
              }}
              aria-hidden="true"
            >
              💻
            </div>

            <h3
              style={{
                margin:
                  '0 0 8px 0',
                fontSize:
                  'var(--font-size-lg)',
              }}
            >
              IDE
            </h3>

            <p
              style={{
                margin: 0,
                color:
                  'var(--color-text-secondary)',
                lineHeight:
                  '1.5',
              }}
            >
              Practice coding independently in a distraction-free environment. Run your code and debug issues on your own.
            </p>
          </Card>

        </div>
      </section>


      <section className="saved-codes-section">
        <h2
          style={{
            fontSize:
              'var(--font-size-xl)',
            marginBottom:
              '16px',
          }}
        >
          Saved Codes (
          {
            Math.min(
              savedCodes.length,
              MAX_SAVED_CODES
            )
          }
          /{MAX_SAVED_CODES})
        </h2>


        {savedCodes.length === 0 ? (
          <Card
            style={{
              textAlign:
                'center',
              padding:
                '40px',
            }}
          >
            <p
              style={{
                color:
                  'var(--color-muted)',
                marginBottom:
                  '8px',
              }}
            >
              No saved codes yet.
            </p>

            <p
              style={{
                color:
                  'var(--color-muted)',
                margin: 0,
              }}
            >
              Save your coding work from the IDE to see it here.
            </p>
          </Card>
        ) : (
          <div
            style={{
              display:
                'flex',
              flexDirection:
                'column',
              gap:
                '16px',
            }}
          >
            {savedCodes.map(
              (code) => (
                <Card
                  key={code.id}
                  style={{
                    display:
                      'flex',
                    justifyContent:
                      'space-between',
                    alignItems:
                      'center',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin:
                          '0 0 8px 0',
                        fontSize:
                          'var(--font-size-lg)',
                      }}
                    >
                      {
                        code.title ||
                        'Untitled'
                      }
                    </h3>

                    <div
                      style={{
                        display:
                          'flex',
                        gap:
                          '12px',
                        alignItems:
                          'center',
                      }}
                    >
                      <span className="badge badge-gray">
                        {
                          code.language ||
                          'unknown'
                        }
                      </span>

                      <span
                        style={{
                          fontSize:
                            'var(--font-size-sm)',
                          color:
                            'var(--color-muted)',
                        }}
                      >
                        Updated:{' '}
                        {formatUpdatedAt(
                          code.updatedAt
                        )}
                      </span>
                    </div>
                  </div>


                  <div
                    style={{
                      display:
                        'flex',
                      gap:
                        '12px',
                    }}
                  >
                    <Button
                      variant="primary"
                      onClick={() =>
                        handleOpenSaved(
                          code
                        )
                      }
                    >
                      Open
                    </Button>

                    <Button
                      variant="danger"
                      onClick={() =>
                        handleDelete(
                          code.id
                        )
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}