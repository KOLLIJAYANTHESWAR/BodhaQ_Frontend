import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generatePractice, submitQuiz } from '../api/quizApi.js';
import { learnTopic } from '../api/learningApi.js';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import Spinner from '../components/common/Spinner.jsx';
import ProgressBar from '../components/common/ProgressBar.jsx';
import Modal from '../components/common/Modal.jsx';
import { LoadingSteps } from '../components/common/Spinner.jsx';
import { getQuizHistory, removeQuizFromHistory } from '../utils/storage.js';

// ---- Helpers ----------------------------------------------------------------

function getLearningState(accuracy) {
  const numericAccuracy = Number(accuracy);

  if (numericAccuracy >= 80) return 'learned';
  if (numericAccuracy >= 60) return 'improving';
  return 'needs-practice';
}

function stateLabel(state) {
  if (state === 'learned') return 'Learned';
  if (state === 'improving') return 'Improving';
  return 'Needs Practice';
}

function stateBadgeClass(state) {
  if (state === 'learned') return 'badge badge-learned';
  if (state === 'improving') return 'badge badge-improving';
  return 'badge badge-needs-practice';
}

function stateIcon(state) {
  if (state === 'learned') return 'v';
  if (state === 'improving') return 'o';
  return '!';
}

function calculateGapsForQuiz(topicStats, quiz) {
  if (!topicStats || typeof topicStats !== 'object') {
    return [];
  }

  return Object.entries(topicStats)
    .filter(([, stats]) => stats && typeof stats === 'object')
    .map(([topic, stats]) => {
      const total = Number(stats.total) || 0;
      const correct = Number(stats.correct) || 0;
      const accuracy = total > 0
        ? (correct / total) * 100
        : 0;

      return {
        topic,
        accuracy,
        learningState: getLearningState(accuracy),
        source_type: quiz?.sourceType,
        source_id: quiz?.sourceId,
        quiz_count: 1,
      };
    });
}

const PRACTICE_LOADING_STEPS = [
  'Preparing targeted practice...',
  'Finding relevant content...',
  'Writing practice questions...',
  'Almost ready...',
];

const QUESTION_COUNTS = [5, 10, 20, 30, 40, 50];

const TIMER_OPTIONS = [
  { label: 'Unlimited', value: null },
  { label: '2 min', value: 2 * 60 },
  { label: '5 min', value: 5 * 60 },
  { label: '10 min', value: 10 * 60 },
  { label: '15 min', value: 15 * 60 },
  { label: '20 min', value: 20 * 60 },
  { label: '30 min', value: 30 * 60 },
  { label: '45 min', value: 45 * 60 },
  { label: '1 hr', value: 60 * 60 },
];

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(safeSeconds / 60);
  const s = safeSeconds % 60;

  return (
    String(m).padStart(2, '0') +
    ':' +
    String(s).padStart(2, '0')
  );
}

// Inline timer badge
function PracticeTimer({ secondsLeft }) {
  if (secondsLeft === null) {
    return null;
  }

  const isUrgent = secondsLeft <= 30;
  const isWarning = secondsLeft <= 60 && secondsLeft > 30;

  const color = isUrgent
    ? 'var(--color-error)'
    : isWarning
      ? 'var(--color-warning)'
      : 'var(--color-primary)';

  const bg = isUrgent
    ? 'var(--color-error-light)'
    : isWarning
      ? 'var(--color-warning-light)'
      : 'var(--color-primary-light)';

  return (
    <div
      className={
        'quiz-timer' +
        (isUrgent ? ' quiz-timer--urgent' : '')
      }
      role="timer"
      aria-live="polite"
      aria-label={
        'Time remaining: ' +
        formatTime(secondsLeft)
      }
      style={{
        '--timer-color': color,
        '--timer-bg': bg,
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>

      <span
        className="quiz-timer-text"
        style={{ color }}
      >
        {formatTime(secondsLeft)}
      </span>
    </div>
  );
}

// ---- Explanation button -----------------------------------------------------

function ExplanationButton({ explanation }) {
  const [open, setOpen] = useState(false);

  if (!explanation) {
    return null;
  }

  return (
    <div>
      <button
        type="button"
        className="explanation-btn"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>

        {open ? 'Hide' : 'Explanation'}
      </button>

      {open && (
        <div className="explanation-panel" role="note">
          {explanation}
        </div>
      )}
    </div>
  );
}

// ---- Mistake card -----------------------------------------------------------

function MistakeCard({ mistake }) {
  if (!mistake) {
    return null;
  }

  return (
    <Card
      style={{
        borderLeft:
          '3px solid var(--color-error)',
      }}
    >
      {mistake.topic && (
        <span
          className="badge badge-gray"
          style={{
            marginBottom: 8,
            display: 'inline-block',
          }}
        >
          {mistake.topic}
        </span>
      )}

      <p
        style={{
          fontWeight: 600,
          marginBottom: 12,
          lineHeight: 1.5,
        }}
      >
        {mistake.question}
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            background:
              'var(--color-error-light)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            gap: 8,
          }}
        >
          <span
            style={{
              color: 'var(--color-error)',
              fontWeight: 600,
              fontSize: 'var(--font-size-sm)',
            }}
          >
            Your answer:
          </span>

          <span
            style={{
              color: 'var(--color-error)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {mistake.user_answer ?? 'Not answered'}
          </span>
        </div>

        <div
          style={{
            background:
              'var(--color-success-light)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            gap: 8,
          }}
        >
          <span
            style={{
              color: 'var(--color-success)',
              fontWeight: 600,
              fontSize: 'var(--font-size-sm)',
            }}
          >
            Correct answer:
          </span>

          <span
            style={{
              color: 'var(--color-success)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {mistake.correct_answer}
          </span>
        </div>
      </div>

      <ExplanationButton
        explanation={mistake.explanation}
      />
    </Card>
  );
}

// ---- Practice results view --------------------------------------------------

function PracticeResults({
  result,
  topic,
  onContinue,
  onRetry,
}) {
  const score = Number(result?.score) || 0;
  const total = Number(result?.total) || 0;
  const percentage = Number(result?.percentage) || 0;
  const mistakes = Array.isArray(result?.mistakes)
    ? result.mistakes
    : [];

  const state = getLearningState(percentage);

  const scoreColor =
    state === 'learned'
      ? 'var(--color-success)'
      : state === 'improving'
        ? '#3b82f6'
        : 'var(--color-warning)';

  const message =
    state === 'learned'
      ? 'Great job! You have mastered this topic.'
      : state === 'improving'
        ? 'Good progress! Keep practising to solidify your understanding.'
        : 'This topic needs more practice. Keep going!';

  return (
    <div>
      <Card
        style={{
          textAlign: 'center',
          padding: 40,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 'var(--font-size-2xl)',
            marginBottom: 4,
            fontWeight: 800,
            color: scoreColor,
          }}
        >
          {Math.round(percentage)}%
        </div>

        <p
          style={{
            color: 'var(--color-muted)',
            marginBottom: 4,
          }}
        >
          {score} / {total} correct
        </p>

        <div
          style={{
            maxWidth: 280,
            margin: '0 auto 16px',
          }}
        >
          <ProgressBar
            value={score}
            max={total || 1}
          />
        </div>

        <span
          className={stateBadgeClass(state)}
          style={{
            fontSize: 'var(--font-size-sm)',
            padding: '4px 12px',
          }}
        >
          {stateLabel(state)}
        </span>

        <p
          style={{
            marginTop: 14,
            color: 'var(--color-muted)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {message}
        </p>
      </Card>

      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: 32,
        }}
      >
        {state !== 'learned' && (
          <Button
            type="button"
            variant="primary"
            onClick={onRetry}
          >
            Retry Practice
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          onClick={onContinue}
        >
          Back to Learning Gaps
        </Button>
      </div>

      {mistakes.length > 0 && (
        <div>
          <h3
            style={{
              fontSize: 'var(--font-size-lg)',
              marginBottom: 12,
            }}
          >
            Mistakes ({mistakes.length})
          </h3>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {mistakes.map((mistake, index) => (
              <MistakeCard
                key={
                  mistake.question_id ??
                  `mistake-${index}`
                }
                mistake={mistake}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Practice config modal -------------------------------------------------

function PracticeConfigModal({
  isOpen,
  topic,
  onClose,
  onStart,
}) {
  const [difficulty, setDifficulty] =
    useState('medium');

  const [count, setCount] = useState(5);

  const [timerSeconds, setTimerSeconds] =
    useState(null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={'Practice: ' + topic}
    >
      <div className="practice-config-modal">
        <div>
          <span className="form-label">
            Difficulty
          </span>

          <div
            className="pill-selector"
            role="group"
            aria-label="Difficulty"
            style={{ marginTop: 8 }}
          >
            {['easy', 'medium', 'hard'].map(
              (difficultyOption) => (
                <button
                  key={difficultyOption}
                  type="button"
                  className={
                    'pill-btn' +
                    (difficulty ===
                      difficultyOption
                      ? ' active'
                      : '')
                  }
                  onClick={() =>
                    setDifficulty(
                      difficultyOption
                    )
                  }
                  aria-pressed={
                    difficulty ===
                    difficultyOption
                  }
                >
                  {difficultyOption
                    .charAt(0)
                    .toUpperCase() +
                    difficultyOption.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        <div>
          <span className="form-label">
            Number of Questions
          </span>

          <div
            className="pill-selector"
            role="group"
            aria-label="Number of questions"
            style={{
              marginTop: 8,
              flexWrap: 'wrap',
            }}
          >
            {QUESTION_COUNTS.map((number) => (
              <button
                key={number}
                type="button"
                className={
                  'pill-btn' +
                  (count === number
                    ? ' active'
                    : '')
                }
                onClick={() =>
                  setCount(number)
                }
                aria-pressed={
                  count === number
                }
              >
                {number}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="form-label">
            Time Limit

            <span
              style={{
                marginLeft: 8,
                fontSize:
                  'var(--font-size-xs)',
                fontWeight: 400,
                color: 'var(--color-muted)',
                background:
                  'var(--color-surface-2)',
                border:
                  '1px solid var(--color-border)',
                borderRadius: 99,
                padding: '2px 8px',
              }}
            >
              Optional
            </span>
          </span>

          <div
            className="pill-selector"
            role="group"
            aria-label="Time limit"
            style={{
              marginTop: 8,
              flexWrap: 'wrap',
            }}
          >
            {TIMER_OPTIONS.map((option) => (
              <button
                key={String(option.value)}
                type="button"
                className={
                  'pill-btn' +
                  (timerSeconds ===
                    option.value
                    ? ' active'
                    : '')
                }
                onClick={() =>
                  setTimerSeconds(
                    option.value
                  )
                }
                aria-pressed={
                  timerSeconds ===
                  option.value
                }
              >
                {option.label}
              </button>
            ))}
          </div>

          {timerSeconds !== null && (
            <p
              style={{
                marginTop: 6,
                fontSize:
                  'var(--font-size-xs)',
                color: 'var(--color-muted)',
              }}
            >
              ⏱ Practice will auto-submit
              when the timer runs out.
            </p>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            paddingTop: 4,
          }}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() =>
              onStart({
                difficulty,
                count,
                timerSeconds,
              })
            }
          >
            Start Practice
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Concept intro screen --------------------------------------------------

function ConceptIntroScreen({
  topic,
  conceptData,
  loading,
  onTakePractice,
  onBack,
}) {
  const [configOpen, setConfigOpen] =
    useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-muted)',
          fontSize: 'var(--font-size-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 20,
          padding: 0,
        }}
      >
        Back to Learning Gaps
      </button>

      <Card
        style={{
          borderLeft:
            '4px solid var(--color-primary)',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div>
            <h2
              style={{
                fontSize:
                  'var(--font-size-xl)',
                margin: 0,
              }}
            >
              {topic}
            </h2>

            <p
              style={{
                color: 'var(--color-muted)',
                fontSize:
                  'var(--font-size-sm)',
                marginTop: 2,
              }}
            >
              Before you practice
            </p>
          </div>
        </div>

        {loading ? (
          <Spinner label="Loading concept overview..." />
        ) : conceptData ? (
          <div>
            {conceptData.definition && (
              <p
                style={{
                  lineHeight: 1.8,
                  color:
                    'var(--color-text-secondary)',
                  marginBottom: 14,
                }}
              >
                {conceptData.definition}
              </p>
            )}

            {Array.isArray(
              conceptData.key_concepts
            ) &&
              conceptData.key_concepts.length >
              0 && (
                <div className="concept-intro-key-idea">
                  <strong>
                    Key Concepts:{' '}
                  </strong>

                  <ul
                    style={{
                      marginTop: 8,
                      paddingLeft: 20,
                    }}
                  >
                    {conceptData.key_concepts.map(
                      (concept, index) => (
                        <li key={index}>
                          {concept}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

            {conceptData.example &&
              typeof conceptData.example ===
              'object' && (
                <div
                  style={{
                    marginTop: 14,
                  }}
                >
                  <strong
                    style={{
                      fontSize:
                        'var(--font-size-sm)',
                      color:
                        'var(--color-text)',
                    }}
                  >
                    Example Code/Illustration:
                  </strong>

                  <div
                    style={{
                      marginTop: 6,
                      padding: '10px 14px',
                      background:
                        'var(--color-surface-2)',
                      borderRadius:
                        'var(--radius-sm)',
                      fontSize:
                        'var(--font-size-sm)',
                      lineHeight: 1.7,
                      color:
                        'var(--color-text-secondary)',
                    }}
                  >
                    {conceptData.example.code && (
                      <pre
                        style={{
                          margin:
                            '0 0 8px 0',
                          whiteSpace:
                            'pre-wrap',
                          fontFamily:
                            'monospace',
                        }}
                      >
                        {
                          conceptData.example
                            .code
                        }
                      </pre>
                    )}

                    {conceptData.example
                      .explanation && (
                        <p
                          style={{
                            margin: 0,
                          }}
                        >
                          {
                            conceptData.example
                              .explanation
                          }
                        </p>
                      )}
                  </div>
                </div>
              )}
          </div>
        ) : (
          <p
            style={{
              color: 'var(--color-muted)',
            }}
          >
            Practice targeted questions on{' '}
            <strong>{topic}</strong> to
            strengthen your understanding.
          </p>
        )}
      </Card>

      <Card
        style={{
          textAlign: 'center',
          padding: 32,
        }}
      >
        <h3 style={{ marginBottom: 8 }}>
          Ready to practice?
        </h3>

        <p
          style={{
            color: 'var(--color-muted)',
            marginBottom: 20,
            fontSize:
              'var(--font-size-sm)',
          }}
        >
          Test your understanding with
          targeted questions.
        </p>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={() =>
            setConfigOpen(true)
          }
        >
          Take Practice Quiz
        </Button>
      </Card>

      <PracticeConfigModal
        isOpen={configOpen}
        topic={topic}
        onClose={() =>
          setConfigOpen(false)
        }
        onStart={(config) => {
          setConfigOpen(false);
          onTakePractice(config);
        }}
      />
    </div>
  );
}

// ---- Quiz question UI ------------------------------------------------------

function PracticeQuizQuestion({
  question,
  index,
  total,
  selected,
  onSelect,
  onNext,
  isLast,
  submitting,
  secondsLeft,
}) {
  const options = Array.isArray(
    question?.options
  )
    ? question.options
    : [];

  if (!question) {
    return (
      <ErrorState
        title="Practice question unavailable"
        message="This practice question could not be loaded."
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            marginBottom: 8,
            gap: 12,
          }}
        >
          <span
            className="text-muted"
            style={{ fontWeight: 600 }}
          >
            Question {index + 1} of {total}
          </span>

          {secondsLeft !== null && (
            <PracticeTimer
              secondsLeft={secondsLeft}
            />
          )}
        </div>

        <ProgressBar
          value={index + 1}
          max={total}
        />
      </div>

      <Card style={{ marginBottom: 20 }}>
        <p
          style={{
            fontSize:
              'var(--font-size-lg)',
            fontWeight: 600,
            lineHeight: 1.5,
            marginBottom: 24,
          }}
        >
          {question.question}
        </p>

        <fieldset
          style={{
            border: 'none',
            padding: 0,
          }}
        >
          <legend className="sr-only">
            Select your answer
          </legend>

          <div className="radio-group">
            {options.map((option) => (
              <label
                key={option.letter}
                className={
                  'radio-option ' +
                  (selected ===
                    option.letter
                    ? 'selected'
                    : '')
                }
                htmlFor={
                  'pq' +
                  question.id +
                  '-' +
                  option.letter
                }
              >
                <input
                  type="radio"
                  id={
                    'pq' +
                    question.id +
                    '-' +
                    option.letter
                  }
                  name={
                    'pquestion-' +
                    question.id
                  }
                  value={option.letter}
                  checked={
                    selected ===
                    option.letter
                  }
                  onChange={() =>
                    onSelect(
                      option.letter
                    )
                  }
                  aria-label={
                    option.letter +
                    ': ' +
                    option.text
                  }
                />

                <span
                  className="radio-option-letter"
                  aria-hidden="true"
                >
                  {option.letter}
                </span>

                <span className="radio-option-text">
                  {option.text}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        {isLast ? (
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={onNext}
            disabled={!selected || submitting}
            loading={submitting}
          >
            Submit Practice
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={onNext}
            disabled={!selected}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

// ---- Weak topic card -------------------------------------------------------

function WeakTopicCard({
  item,
  onExplain,
  onPractice,
  onClear,
}) {
  const state =
    item.learningState ||
    getLearningState(item.accuracy);

  const isLearned =
    state === 'learned';

  const isImproving =
    state === 'improving';

  const borderColor =
    isLearned
      ? 'var(--color-success)'
      : isImproving
        ? '#3b82f6'
        : 'var(--color-warning)';

  return (
    <Card
      style={{
        borderLeft:
          '3px solid ' + borderColor,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent:
            'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 180,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: isLearned
                  ? 'var(--color-success-light)'
                  : isImproving
                    ? 'rgba(59,130,246,0.12)'
                    : 'var(--color-warning-light)',
                color: isLearned
                  ? 'var(--color-success)'
                  : isImproving
                    ? '#3b82f6'
                    : 'var(--color-warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'center',
                fontSize:
                  'var(--font-size-xs)',
                fontWeight: 700,
              }}
              aria-hidden="true"
            >
              {stateIcon(state)}
            </span>

            <h3
              style={{
                fontSize:
                  'var(--font-size-base)',
                fontWeight: 600,
              }}
            >
              {item.topic}
            </h3>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
            }}
          >
            <span
              className="text-muted"
              style={{
                fontSize:
                  'var(--font-size-sm)',
                minWidth: 88,
              }}
            >
              Accuracy:{' '}
              {Math.round(
                Number(item.accuracy) || 0
              )}
              %
            </span>

            <div
              style={{
                flex: 1,
                maxWidth: 180,
              }}
            >
              <ProgressBar
                value={
                  Number(item.accuracy) || 0
                }
                max={100}
              />
            </div>
          </div>

          <span
            className={stateBadgeClass(state)}
          >
            {stateLabel(state)}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {!isLearned &&
            !isImproving && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onExplain(item)
                  }
                >
                  Explanation
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    onPractice(item)
                  }
                >
                  Practice
                </Button>
              </>
            )}

          {isImproving && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() =>
                onPractice(item)
              }
            >
              Practice
            </Button>
          )}

          {isLearned && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onExplain(item)
                }
              >
                View
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onClear(item)
                }
                title="Remove from active learning gaps"
              >
                Clear
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---- Concept explanation modal ---------------------------------------------

function ConceptExplanationModal({
  isOpen,
  item,
  conceptData,
  loading,
  onClose,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? item.topic : ''}
    >
      {loading ? (
        <Spinner label="Fetching explanation..." />
      ) : conceptData ? (
        <div style={{ lineHeight: 1.8 }}>
          {conceptData.definition && (
            <p
              style={{
                color:
                  'var(--color-text-secondary)',
                marginBottom: 14,
              }}
            >
              {conceptData.definition}
            </p>
          )}

          {Array.isArray(
            conceptData.key_concepts
          ) &&
            conceptData.key_concepts.length >
            0 && (
              <div
                className="concept-intro-key-idea"
                style={{
                  marginBottom: 14,
                }}
              >
                <strong>
                  Key Concepts:{' '}
                </strong>

                <ul
                  style={{
                    marginTop: 6,
                    paddingLeft: 20,
                  }}
                >
                  {conceptData.key_concepts.map(
                    (concept, index) => (
                      <li key={index}>
                        {concept}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

          {Array.isArray(
            conceptData.important_points
          ) &&
            conceptData
              .important_points.length > 0 && (
              <ul
                style={{
                  marginTop: 10,
                  paddingLeft: 20,
                  color:
                    'var(--color-text-secondary)',
                  fontSize:
                    'var(--font-size-sm)',
                }}
              >
                {conceptData.important_points.map(
                  (point, index) => (
                    <li
                      key={index}
                      style={{
                        marginBottom: 4,
                      }}
                    >
                      {point}
                    </li>
                  )
                )}
              </ul>
            )}

          {conceptData.example &&
            typeof conceptData.example ===
            'object' && (
              <div
                style={{
                  marginTop: 12,
                }}
              >
                <strong
                  style={{
                    fontSize:
                      'var(--font-size-sm)',
                  }}
                >
                  Example:{' '}
                </strong>

                <div
                  style={{
                    fontSize:
                      'var(--font-size-sm)',
                    color:
                      'var(--color-text-secondary)',
                    background:
                      'var(--color-surface-2)',
                    padding: '10px 14px',
                    borderRadius:
                      'var(--radius-sm)',
                    marginTop: 8,
                  }}
                >
                  {conceptData.example.code && (
                    <pre
                      style={{
                        margin:
                          '0 0 8px 0',
                        whiteSpace:
                          'pre-wrap',
                        fontFamily:
                          'monospace',
                      }}
                    >
                      {
                        conceptData.example
                          .code
                      }
                    </pre>
                  )}

                  {conceptData.example
                    .explanation && (
                      <p
                        style={{ margin: 0 }}
                      >
                        {
                          conceptData.example
                            .explanation
                        }
                      </p>
                    )}
                </div>
              </div>
            )}
        </div>
      ) : (
        <p
          style={{
            color: 'var(--color-muted)',
          }}
        >
          Unable to load explanation.
          Please try again.
        </p>
      )}

      <div
        style={{
          marginTop: 20,
          textAlign: 'right',
        }}
      >
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </Modal>
  );
}

// ---- Main page --------------------------------------------------------------

export default function WeakTopicsPage() {
  const navigate = useNavigate();

  const [recentQuizzes, setRecentQuizzes] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [expandedQuizzes, setExpandedQuizzes] =
    useState(new Set());

  // Concept explanation modal
  const [explainItem, setExplainItem] =
    useState(null);

  const [conceptData, setConceptData] =
    useState(null);

  const [conceptLoading, setConceptLoading] =
    useState(false);

  const [conceptModalOpen, setConceptModalOpen] =
    useState(false);

  // Practice intro
  const [practiceItem, setPracticeItem] =
    useState(null);

  const [
    practiceConceptData,
    setPracticeConceptData,
  ] = useState(null);

  const [
    practiceConceptLoading,
    setPracticeConceptLoading,
  ] = useState(false);

  // Practice quiz
  const [practicePhase, setPracticePhase] =
    useState('idle');

  const [
    practiceLoadingStep,
    setPracticeLoadingStep,
  ] = useState(0);

  const [practiceQuiz, setPracticeQuiz] =
    useState(null);

  const [
    practiceAnswers,
    setPracticeAnswers,
  ] = useState({});

  const [practiceIndex, setPracticeIndex] =
    useState(0);

  const [
    practiceResult,
    setPracticeResult,
  ] = useState(null);

  const [
    practiceError,
    setPracticeError,
  ] = useState(null);

  const [
    practiceSubmitting,
    setPracticeSubmitting,
  ] = useState(false);

  // Practice timer
  const [
    practiceSecondsLeft,
    setPracticeSecondsLeft,
  ] = useState(null);

  const practiceTimerRef = useRef(null);
  const practiceLoadingTimerRef =
    useRef(null);

  const practiceSubmitRef = useRef({
    practiceAnswers: {},
    practiceQuiz: null,
  });

  const mountedRef = useRef(true);

  // Cleared topics
  const [clearedTopics, setClearedTopics] =
    useState(() => {
      try {
        const stored =
          localStorage.getItem(
            'bodhaq_cleared_topics'
          );

        const parsed = JSON.parse(
          stored || '[]'
        );

        return Array.isArray(parsed)
          ? parsed
          : [];
      } catch {
        return [];
      }
    });

  useEffect(() => {
    localStorage.setItem(
      'bodhaq_cleared_topics',
      JSON.stringify(clearedTopics)
    );
  }, [clearedTopics]);

  // State overrides
  const [stateOverrides, setStateOverrides] =
    useState(() => {
      try {
        const stored =
          localStorage.getItem(
            'bodhaq_topic_states'
          );

        const parsed = JSON.parse(
          stored || '{}'
        );

        return parsed &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed)
          ? parsed
          : {};
      } catch {
        return {};
      }
    });

  useEffect(() => {
    localStorage.setItem(
      'bodhaq_topic_states',
      JSON.stringify(stateOverrides)
    );
  }, [stateOverrides]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      clearInterval(
        practiceTimerRef.current
      );

      clearInterval(
        practiceLoadingTimerRef.current
      );
    };
  }, []);

  const fetchWeakTopics =
    useCallback(() => {
      setLoading(true);
      setError(null);

      try {
        const quizzes =
          getQuizHistory();

        setRecentQuizzes(
          Array.isArray(quizzes)
            ? quizzes
            : []
        );
      } catch (err) {
        setError(
          err?.message ||
          'Unable to load quiz history.'
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchWeakTopics();
  }, [fetchWeakTopics]);

  const handleDeleteQuiz = (
    quizId
  ) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this quiz result?'
      )
    ) {
      return;
    }

    try {
      removeQuizFromHistory(quizId);

      setExpandedQuizzes((previous) => {
        const next =
          new Set(previous);

        next.delete(quizId);

        return next;
      });

      fetchWeakTopics();
    } catch (err) {
      setError(
        err?.message ||
        'Unable to delete quiz result.'
      );
    }
  };

  const toggleLearningGaps = (
    quizId
  ) => {
    setExpandedQuizzes((previous) => {
      const next =
        new Set(previous);

      if (next.has(quizId)) {
        next.delete(quizId);
      } else {
        next.add(quizId);
      }

      return next;
    });
  };

  // Keep timer submission data current.
  useEffect(() => {
    practiceSubmitRef.current = {
      practiceAnswers,
      practiceQuiz,
    };
  }, [
    practiceAnswers,
    practiceQuiz,
  ]);

  // Submit practice quiz.
  const submitPractice = useCallback(
    async (quizOverride = null) => {
      const quiz =
        quizOverride ||
        practiceSubmitRef.current
          .practiceQuiz;

      const answers =
        practiceSubmitRef.current
          .practiceAnswers;

      if (
        !quiz ||
        !quiz.quiz_id ||
        !practiceItem ||
        practiceSubmitting
      ) {
        return;
      }

      clearInterval(
        practiceTimerRef.current
      );

      setPracticeSubmitting(true);
      setPracticeError(null);

      try {
        const formattedAnswers = {};

        Object.entries(
          answers || {}
        ).forEach(
          ([questionId, letter]) => {
            formattedAnswers[
              String(questionId)
            ] = letter;
          }
        );

        const evalResult =
          await submitQuiz(
            quiz.quiz_id,
            formattedAnswers
          );

        if (!mountedRef.current) {
          return;
        }

        if (
          !evalResult ||
          typeof evalResult !==
          'object'
        ) {
          throw new Error(
            'The quiz evaluation returned an invalid response.'
          );
        }

        setPracticeResult(
          evalResult
        );

        setPracticePhase(
          'results'
        );

        const percentage =
          Number(
            evalResult.percentage
          ) || 0;

        const newState =
          getLearningState(
            percentage
          );

        setStateOverrides(
          (previous) => ({
            ...previous,
            [practiceItem.topic]: {
              state: newState,
              accuracy: percentage,
            },
          })
        );
      } catch (err) {
        if (!mountedRef.current) {
          return;
        }

        setPracticeError(
          err?.message ||
          'Unable to submit practice quiz.'
        );
      } finally {
        if (mountedRef.current) {
          setPracticeSubmitting(
            false
          );
        }
      }
    },
    [
      practiceItem,
      practiceSubmitting,
    ]
  );

  // Practice countdown timer.
  useEffect(() => {
    clearInterval(
      practiceTimerRef.current
    );

    if (
      practicePhase !== 'quiz' ||
      practiceSecondsLeft === null ||
      practiceSubmitting
    ) {
      return undefined;
    }

    if (
      Number(practiceSecondsLeft) <=
      0
    ) {
      submitPractice();
      return undefined;
    }

    practiceTimerRef.current =
      setInterval(() => {
        setPracticeSecondsLeft(
          (previous) => {
            if (
              previous === null ||
              previous <= 1
            ) {
              return 0;
            }

            return previous - 1;
          }
        );
      }, 1000);

    return () => {
      clearInterval(
        practiceTimerRef.current
      );
    };
  }, [
    practicePhase,
    practiceSecondsLeft,
    practiceSubmitting,
    submitPractice,
  ]);

  // Auto-submit once the countdown reaches zero.
  useEffect(() => {
    if (
      practicePhase === 'quiz' &&
      practiceSecondsLeft === 0 &&
      !practiceSubmitting
    ) {
      submitPractice();
    }
  }, [
    practicePhase,
    practiceSecondsLeft,
    practiceSubmitting,
    submitPractice,
  ]);

  // Concept explanation modal.
  async function handleExplain(item) {
    if (!item?.topic) {
      return;
    }

    setExplainItem(item);
    setConceptModalOpen(true);
    setConceptData(null);
    setConceptLoading(true);

    try {
      const data =
        await learnTopic(
          item.topic
        );

      if (!mountedRef.current) {
        return;
      }

      setConceptData(
        data &&
          typeof data === 'object'
          ? data
          : null
      );
    } catch {
      if (mountedRef.current) {
        setConceptData(null);
      }
    } finally {
      if (mountedRef.current) {
        setConceptLoading(false);
      }
    }
  }

  function handleCloseExplain() {
    setConceptModalOpen(false);
    setExplainItem(null);
    setConceptData(null);
  }

  // Practice flow.
  async function handlePractice(item) {
    if (!item?.topic) {
      return;
    }

    clearInterval(
      practiceTimerRef.current
    );

    clearInterval(
      practiceLoadingTimerRef.current
    );

    setPracticeItem(item);
    setPracticePhase('intro');
    setPracticeConceptData(null);
    setPracticeConceptLoading(true);
    setPracticeResult(null);
    setPracticeError(null);
    setPracticeQuiz(null);
    setPracticeAnswers({});
    setPracticeIndex(0);
    setPracticeSecondsLeft(null);
    setPracticeSubmitting(false);

    try {
      const data =
        await learnTopic(
          item.topic
        );

      if (!mountedRef.current) {
        return;
      }

      setPracticeConceptData(
        data &&
          typeof data === 'object'
          ? data
          : null
      );
    } catch {
      if (mountedRef.current) {
        setPracticeConceptData(null);
      }
    } finally {
      if (mountedRef.current) {
        setPracticeConceptLoading(
          false
        );
      }
    }
  }

  async function handleStartPracticeQuiz(
    config
  ) {
    if (
      !practiceItem ||
      !config ||
      typeof config !== 'object'
    ) {
      return;
    }

    const difficulty =
      config.difficulty || 'medium';

    const count =
      Number(config.count) || 5;

    const timerSeconds =
      config.timerSeconds ?? null;

    setPracticePhase('loading');
    setPracticeError(null);
    setPracticeLoadingStep(0);

    clearInterval(
      practiceTimerRef.current
    );

    clearInterval(
      practiceLoadingTimerRef.current
    );

    practiceLoadingTimerRef.current =
      setInterval(() => {
        setPracticeLoadingStep(
          (currentStep) =>
            Math.min(
              currentStep + 1,
              PRACTICE_LOADING_STEPS.length -
              1
            )
        );
      }, 700);

    const documentId =
      practiceItem.source_type ===
        'document'
        ? practiceItem.source_id
        : undefined;

    try {
      const data =
        await generatePractice(
          practiceItem.topic,
          documentId,
          difficulty,
          count
        );

      if (!mountedRef.current) {
        return;
      }

      if (
        !data ||
        typeof data !== 'object' ||
        !Array.isArray(
          data.questions
        ) ||
        data.questions.length === 0 ||
        !data.quiz_id
      ) {
        throw new Error(
          'The practice generator returned an invalid quiz.'
        );
      }

      setPracticeQuiz(data);
      setPracticeAnswers({});
      setPracticeIndex(0);
      setPracticeResult(null);
      setPracticeError(null);
      setPracticeSecondsLeft(
        timerSeconds
      );
      setPracticePhase('quiz');
    } catch (err) {
      if (mountedRef.current) {
        setPracticeError(
          err?.message ||
          'Unable to generate practice questions.'
        );

        setPracticePhase('intro');
      }
    } finally {
      clearInterval(
        practiceLoadingTimerRef.current
      );
      practiceLoadingTimerRef.current =
        null;
    }
  }

  async function handlePracticeNext() {
    if (
      !practiceQuiz ||
      !Array.isArray(
        practiceQuiz.questions
      ) ||
      practiceSubmitting
    ) {
      return;
    }

    const questions =
      practiceQuiz.questions;

    if (
      practiceIndex <
      questions.length - 1
    ) {
      setPracticeIndex(
        (index) => index + 1
      );

      return;
    }

    await submitPractice();
  }

  function handleBackToList() {
    clearInterval(
      practiceTimerRef.current
    );

    clearInterval(
      practiceLoadingTimerRef.current
    );

    setPracticeSecondsLeft(null);
    setPracticeItem(null);
    setPracticePhase('idle');
    setPracticeResult(null);
    setPracticeError(null);
    setPracticeQuiz(null);
    setPracticeAnswers({});
    setPracticeIndex(0);
    setPracticeSubmitting(false);
  }

  function handleClear(item) {
    if (!item?.topic) {
      return;
    }

    setClearedTopics(
      (previous) =>
        previous.includes(item.topic)
          ? previous
          : [...previous, item.topic]
    );
  }

  // ---- Render: practice intro
  if (
    practicePhase === 'intro' &&
    practiceItem
  ) {
    return (
      <div className="page-content">
        <PageHeader
          title="Practice"
          subtitle={
            'Focusing on: ' +
            practiceItem.topic
          }
        />

        {practiceError && (
          <div
            style={{
              marginBottom: 16,
            }}
          >
            <ErrorState
              title="Practice error"
              message={practiceError}
              onRetry={() =>
                setPracticeError(
                  null
                )
              }
            />
          </div>
        )}

        <ConceptIntroScreen
          topic={practiceItem.topic}
          conceptData={
            practiceConceptData
          }
          loading={
            practiceConceptLoading
          }
          onTakePractice={
            handleStartPracticeQuiz
          }
          onBack={handleBackToList}
        />
      </div>
    );
  }

  // ---- Render: practice loading
  if (
    practicePhase === 'loading'
  ) {
    return (
      <div className="page-content">
        <PageHeader
          title="Practice"
          subtitle={
            'Preparing questions for: ' +
            (practiceItem
              ? practiceItem.topic
              : '')
          }
        />

        <LoadingSteps
          steps={
            PRACTICE_LOADING_STEPS
          }
          currentStep={
            practiceLoadingStep
          }
        />
      </div>
    );
  }

  // ---- Render: practice quiz
  if (
    practicePhase === 'quiz' &&
    practiceQuiz &&
    Array.isArray(
      practiceQuiz.questions
    ) &&
    practiceQuiz.questions.length >
    0
  ) {
    const currentQuestion =
      practiceQuiz.questions[
      practiceIndex
      ];

    return (
      <div className="page-content">
        <PageHeader
          title="Practice Quiz"
          subtitle={
            'Topic: ' +
            (practiceItem
              ? practiceItem.topic
              : '')
          }
        />

        {practiceError && (
          <div
            style={{
              marginBottom: 16,
            }}
          >
            <ErrorState
              title="Error"
              message={practiceError}
              onRetry={() =>
                setPracticeError(
                  null
                )
              }
            />
          </div>
        )}

        <PracticeQuizQuestion
          question={currentQuestion}
          index={practiceIndex}
          total={
            practiceQuiz.questions
              .length
          }
          selected={
            practiceAnswers[
            currentQuestion.id
            ] || ''
          }
          onSelect={(letter) =>
            setPracticeAnswers(
              (previous) => ({
                ...previous,
                [currentQuestion.id]:
                  letter,
              })
            )
          }
          onNext={
            handlePracticeNext
          }
          isLast={
            practiceIndex ===
            practiceQuiz.questions
              .length - 1
          }
          submitting={
            practiceSubmitting
          }
          secondsLeft={
            practiceSecondsLeft
          }
        />
      </div>
    );
  }

  // ---- Render: practice results
  if (
    practicePhase === 'results' &&
    practiceResult
  ) {
    return (
      <div className="page-content">
        <PageHeader
          title="Practice Complete"
          subtitle={
            'Topic: ' +
            (practiceItem
              ? practiceItem.topic
              : '')
          }
        />

        <PracticeResults
          result={practiceResult}
          topic={
            practiceItem
              ? practiceItem.topic
              : ''
          }
          onContinue={
            handleBackToList
          }
          onRetry={() => {
            setPracticeError(null);
            setPracticeResult(null);
            setPracticePhase('intro');
          }}
        />
      </div>
    );
  }

  // ---- Render: main list
  return (
    <div className="page-content">
      <PageHeader
        title="Learning Gaps"
        subtitle="Areas to improve from your recent quizzes."
      />

      {loading && (
        <Spinner label="Loading assessments..." />
      )}

      {error && !loading && (
        <ErrorState
          title="Could not load learning gaps"
          message={error}
          onRetry={fetchWeakTopics}
        />
      )}

      {!loading &&
        !error &&
        recentQuizzes.length === 0 && (
          <Card>
            <p
              style={{
                color:
                  'var(--color-muted)',
              }}
            >
              No quizzes completed yet.
              Please complete a quiz
              first to see your learning
              gaps.
            </p>

            <Button
              type="button"
              variant="primary"
              style={{
                marginTop: 12,
              }}
              onClick={() =>
                navigate('/quizzes')
              }
            >
              Take a Quiz
            </Button>
          </Card>
        )}

      {!loading &&
        !error &&
        recentQuizzes.length > 0 && (
          <div>
            {practiceError && (
              <div
                style={{
                  marginBottom: 16,
                }}
              >
                <ErrorState
                  title="Practice error"
                  message={
                    practiceError
                  }
                  onRetry={() =>
                    setPracticeError(
                      null
                    )
                  }
                />
              </div>
            )}

            <h2 className="gap-section-title">
              Recent Assessments
            </h2>

            <div
              style={{
                display: 'flex',
                flexDirection:
                  'column',
                gap: 16,
              }}
            >
              {recentQuizzes.map(
                (quiz, quizIndex) => {
                  const quizId =
                    quiz?.quizId ??
                    quiz?.quiz_id ??
                    `quiz-${quizIndex}`;

                  const isExpanded =
                    expandedQuizzes.has(
                      quizId
                    );

                  const rawGaps =
                    calculateGapsForQuiz(
                      quiz?.topicStats,
                      quiz
                    );

                  const augmentedGaps =
                    rawGaps
                      .map((topic) => {
                        const override =
                          stateOverrides[
                          topic.topic
                          ];

                        return {
                          ...topic,
                          accuracy:
                            override
                              ? override.accuracy
                              : topic.accuracy,
                          learningState:
                            override
                              ? override.state
                              : topic.learningState,
                        };
                      })
                      .filter(
                        (topic) =>
                          !clearedTopics.includes(
                            topic.topic
                          )
                      );

                  const needsPractice =
                    augmentedGaps.filter(
                      (topic) =>
                        topic.learningState ===
                        'needs-practice'
                    );

                  const improving =
                    augmentedGaps.filter(
                      (topic) =>
                        topic.learningState ===
                        'improving'
                    );

                  const learned =
                    augmentedGaps.filter(
                      (topic) =>
                        topic.learningState ===
                        'learned'
                    );

                  const quizPercentage =
                    Number(
                      quiz?.percentage
                    ) || 0;

                  const quizState =
                    getLearningState(
                      quizPercentage
                    );

                  const quizColor =
                    quizState ===
                      'learned'
                      ? 'var(--color-success)'
                      : quizState ===
                        'improving'
                        ? '#3b82f6'
                        : 'var(--color-warning)';

                  return (
                    <div
                      key={quizId}
                    >
                      <Card
                        style={{
                          padding:
                            '16px 20px',
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
                            flexWrap:
                              'wrap',
                            gap: 16,
                          }}
                        >
                          <div>
                            <h3
                              style={{
                                fontSize:
                                  'var(--font-size-base)',
                                marginBottom: 4,
                              }}
                            >
                              {quiz?.filename ||
                                quiz?.sourceId ||
                                'Assessment'}
                            </h3>

                            <div
                              style={{
                                fontSize:
                                  'var(--font-size-sm)',
                                color:
                                  'var(--color-muted)',
                              }}
                            >
                              {quiz?.completedAt
                                ? new Date(
                                  quiz.completedAt
                                ).toLocaleString()
                                : 'Date unavailable'}
                            </div>
                          </div>

                          <div
                            style={{
                              textAlign:
                                'right',
                              display:
                                'flex',
                              flexDirection:
                                'column',
                              alignItems:
                                'flex-end',
                              gap: 6,
                            }}
                          >
                            <div
                              style={{
                                fontSize:
                                  'var(--font-size-lg)',
                                fontWeight: 700,
                                color:
                                  quizColor,
                              }}
                            >
                              {Math.round(
                                quizPercentage
                              )}
                              %
                            </div>

                            <div
                              style={{
                                fontSize:
                                  'var(--font-size-sm)',
                                color:
                                  'var(--color-muted)',
                              }}
                            >
                              {quiz?.score ??
                                0}{' '}
                              /{' '}
                              {quiz?.totalQuestions ??
                                0}{' '}
                              correct
                            </div>

                            <div
                              style={{
                                display:
                                  'flex',
                                gap: 8,
                                marginTop: 4,
                                flexWrap:
                                  'wrap',
                              }}
                            >
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    `/quiz-results?quizId=${encodeURIComponent(
                                      quizId
                                    )}`,
                                    {
                                      state: {
                                        evaluation:
                                        {
                                          ...quiz,
                                          total:
                                            quiz?.totalQuestions,
                                        },
                                        quizId,
                                        sourceType:
                                          quiz?.sourceType,
                                        sourceId:
                                          quiz?.sourceId,
                                        filename:
                                          quiz?.filename,
                                      },
                                    }
                                  )
                                }
                              >
                                Review Results
                              </Button>

                              <Button
                                type="button"
                                variant={
                                  isExpanded
                                    ? 'primary'
                                    : 'secondary'
                                }
                                size="sm"
                                onClick={() =>
                                  toggleLearningGaps(
                                    quizId
                                  )
                                }
                              >
                                {isExpanded
                                  ? 'Hide Learning Gaps'
                                  : 'Learning Gaps'}
                              </Button>

                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                  handleDeleteQuiz(
                                    quizId
                                  )
                                }
                                style={{
                                  background:
                                    'transparent',
                                  color:
                                    'var(--color-danger)',
                                  border:
                                    '1px solid var(--color-danger)',
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>

                      {isExpanded && (
                        <div
                          style={{
                            marginTop: 8,
                            padding:
                              '20px 24px',
                            background:
                              'var(--color-surface-2)',
                            borderRadius:
                              'var(--radius-lg)',
                            border:
                              '1px solid var(--color-border)',
                            marginLeft: 12,
                            marginRight: 12,
                          }}
                        >
                          <h3
                            style={{
                              marginBottom: 16,
                              fontSize:
                                'var(--font-size-lg)',
                            }}
                          >
                            Learning Gaps for
                            this assessment
                          </h3>

                          {augmentedGaps.length ===
                            0 ? (
                            <p
                              style={{
                                color:
                                  'var(--color-muted)',
                              }}
                            >
                              No topics recorded
                              for this assessment
                              or all topics
                              cleared.
                            </p>
                          ) : (
                            <>
                              {needsPractice.length >
                                0 && (
                                  <div
                                    style={{
                                      marginBottom:
                                        24,
                                    }}
                                  >
                                    <h4
                                      style={{
                                        fontSize:
                                          'var(--font-size-base)',
                                        fontWeight: 600,
                                        marginBottom:
                                          12,
                                        color:
                                          'var(--color-warning)',
                                      }}
                                    >
                                      Needs Practice
                                    </h4>

                                    <div
                                      style={{
                                        display:
                                          'flex',
                                        flexDirection:
                                          'column',
                                        gap: 8,
                                      }}
                                    >
                                      {needsPractice.map(
                                        (item) => (
                                          <WeakTopicCard
                                            key={
                                              item.topic
                                            }
                                            item={item}
                                            onExplain={
                                              handleExplain
                                            }
                                            onPractice={
                                              handlePractice
                                            }
                                            onClear={
                                              handleClear
                                            }
                                          />
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              {improving.length >
                                0 && (
                                  <div
                                    style={{
                                      marginBottom:
                                        24,
                                    }}
                                  >
                                    <h4
                                      style={{
                                        fontSize:
                                          'var(--font-size-base)',
                                        fontWeight: 600,
                                        marginBottom:
                                          12,
                                        color:
                                          '#3b82f6',
                                      }}
                                    >
                                      Improving
                                    </h4>

                                    <div
                                      style={{
                                        display:
                                          'flex',
                                        flexDirection:
                                          'column',
                                        gap: 8,
                                      }}
                                    >
                                      {improving.map(
                                        (item) => (
                                          <WeakTopicCard
                                            key={
                                              item.topic
                                            }
                                            item={item}
                                            onExplain={
                                              handleExplain
                                            }
                                            onPractice={
                                              handlePractice
                                            }
                                            onClear={
                                              handleClear
                                            }
                                          />
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              {learned.length >
                                0 && (
                                  <div
                                    style={{
                                      marginBottom:
                                        12,
                                    }}
                                  >
                                    <h4
                                      style={{
                                        fontSize:
                                          'var(--font-size-base)',
                                        fontWeight: 600,
                                        marginBottom:
                                          12,
                                        color:
                                          'var(--color-success)',
                                      }}
                                    >
                                      Learned
                                    </h4>

                                    <div
                                      style={{
                                        display:
                                          'flex',
                                        flexDirection:
                                          'column',
                                        gap: 8,
                                      }}
                                    >
                                      {learned.map(
                                        (item) => (
                                          <WeakTopicCard
                                            key={
                                              item.topic
                                            }
                                            item={item}
                                            onExplain={
                                              handleExplain
                                            }
                                            onPractice={
                                              handlePractice
                                            }
                                            onClear={
                                              handleClear
                                            }
                                          />
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>

            <div
              style={{
                marginTop: 24,
                display: 'flex',
                gap: 12,
              }}
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  navigate('/')
                }
              >
                Home
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  navigate('/quizzes')
                }
              >
                Take New Quiz
              </Button>
            </div>
          </div>
        )}

      <ConceptExplanationModal
        isOpen={conceptModalOpen}
        item={explainItem}
        conceptData={conceptData}
        loading={conceptLoading}
        onClose={handleCloseExplain}
      />
    </div>
  );
}