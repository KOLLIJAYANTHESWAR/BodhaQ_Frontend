import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { generateQuiz, submitQuiz } from '../api/quizApi.js';
import { generateResumeQuiz, submitResumeQuiz } from '../api/resumeApi.js';
import { listDocuments } from '../api/documentApi.js';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import ProgressBar from '../components/common/ProgressBar.jsx';
import { LoadingSteps } from '../components/common/Spinner.jsx';

import {
  getResumeQuizProgress,
  setResumeQuizProgress,
  clearResumeQuizProgress,
  addQuizToHistory,
} from '../utils/storage.js';
import { recalculateLearningGaps } from '../utils/gaps.js';

const LOADING_STEPS_QUIZ = [
  'Preparing your quiz...',
  'Writing questions...',
  'Crafting answer options...',
  'Finalising quiz...',
];

// Timer presets: label → seconds (null = unlimited)
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

const QUESTION_COUNTS = [5, 10, 20, 30, 40, 50];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Source Toggle ─────────────────────────────────────────────────────────────

function SourceToggle({ value, onChange, disabled = false }) {
  return (
    <div
      className="source-toggle"
      role="group"
      aria-label="Choose study source"
    >
      {[
        { id: 'document', label: 'Specific Document' },
        { id: 'topic', label: 'Topic' },
      ].map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={`source-toggle-btn${value === id ? ' active' : ''}`}
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          disabled={disabled}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Learning Gaps Callout ─────────────────────────────────────────────────────

function LearningGapsCallout({ quizId, sourceType, sourceId, filename, weakCount }) {
  const navigate = useNavigate();

  if (!quizId || weakCount === 0) return null;

  return (
    <div
      className="learning-gaps-callout"
      role="complementary"
      aria-label="Learning gaps"
    >
      <div className="learning-gaps-callout-meta">
        <span className="learning-gaps-callout-title">
          Your Learning Gaps
        </span>

        <span className="learning-gaps-callout-desc">
          {weakCount} topic{weakCount !== 1 ? 's' : ''} need
          {weakCount === 1 ? 's' : ''} practice from your last quiz.
        </span>
      </div>

      <Button
        variant="secondary"
        onClick={() => navigate('/weak-topics')}
      >
        Practice Weak Topics
      </Button>
    </div>
  );
}

// ── Timer Selector ────────────────────────────────────────────────────────────

function TimerSelector({ value, onChange }) {
  return (
    <div className="form-group" style={{ marginBottom: 24 }}>
      <span className="form-label">
        Time Limit

        <span
          style={{
            marginLeft: 8,
            fontSize: 'var(--font-size-xs)',
            fontWeight: 400,
            color: 'var(--color-muted)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
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
        {TIMER_OPTIONS.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            className={`pill-btn${value === opt.value ? ' active' : ''}`}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {value !== null && (
        <p
          style={{
            marginTop: 8,
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-muted)',
          }}
        >
          ⏱ Quiz will auto-submit when the timer runs out.
        </p>
      )}
    </div>
  );
}

// ── Quiz Config Form ──────────────────────────────────────────────────────────

function QuizConfig({
  initialSourceType,
  initialSourceId,
  initialFilename,
  priorQuizId,
  priorWeakCount,
  onStart,
  loading,
  resumeItem = null,
}) {
  const isResumeAssessment = Boolean(resumeItem);
  const hasPreFill = Boolean(initialSourceId?.trim());

  const [sourceMode, setSourceMode] = useState(
    isResumeAssessment
      ? 'resume_item'
      : hasPreFill
        ? (initialSourceType || 'topic')
        : 'topic'
  );

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const [selectedDocId, setSelectedDocId] = useState(
    hasPreFill && initialSourceType === 'document'
      ? initialSourceId
      : ''
  );

  const [selectedDocName, setSelectedDocName] = useState(
    hasPreFill && initialSourceType === 'document'
      ? (initialFilename || '')
      : ''
  );

  const [topicInput, setTopicInput] = useState(
    hasPreFill && initialSourceType === 'topic'
      ? initialSourceId
      : ''
  );

  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [timerSeconds, setTimerSeconds] = useState(null);

  useEffect(() => {
    // Resume assessments do not need the normal document list.
    if (isResumeAssessment) {
      return;
    }

    let cancelled = false;

    setDocsLoading(true);

    listDocuments()
      .then((data) => {
        if (!cancelled) {
          setDocuments(data.documents || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDocuments([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDocsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isResumeAssessment]);

  const effectiveSourceId =
    sourceMode === 'document'
      ? selectedDocId
      : topicInput.trim();

  const canStart =
    isResumeAssessment
      ? Boolean(resumeItem?.id) && !loading
      : Boolean(effectiveSourceId) && !loading;

  function handleDocChange(e) {
    const id = e.target.value;

    setSelectedDocId(id);

    const doc = documents.find(
      (d) => d.document_id === id
    );

    setSelectedDocName(
      doc ? doc.filename : ''
    );
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!canStart) {
      return;
    }

    if (isResumeAssessment) {
      onStart({
        sourceType: 'resume_item',
        sourceId: resumeItem.id,
        count,
        difficulty,
        filename: resumeItem.name,
        timerSeconds,
        resumeItem,
      });

      return;
    }

    onStart({
      sourceType: sourceMode,
      sourceId: effectiveSourceId,
      count,
      difficulty,
      filename: selectedDocName,
      timerSeconds,
    });
  }

  return (
    <Card>
      <h2
        style={{
          fontSize: 'var(--font-size-lg)',
          marginBottom: 6,
        }}
      >
        {isResumeAssessment
          ? 'Configure your assessment'
          : 'Choose your source'}
      </h2>

      <p
        style={{
          color: 'var(--color-muted)',
          fontSize: 'var(--font-size-sm)',
          marginBottom: 20,
        }}
      >
        {isResumeAssessment
          ? `Choose how you want to be assessed on "${resumeItem.name}".`
          : 'Select what you want to be quizzed on.'}
      </p>

      {!isResumeAssessment && (
        <div style={{ marginBottom: 24 }}>
          <SourceToggle
            value={sourceMode}
            onChange={setSourceMode}
          />
        </div>
      )}

      {isResumeAssessment && (
        <div
          className="inline-notice"
          style={{
            marginBottom: 24,
          }}
        >
          <span aria-hidden="true">✓</span>

          <span>
            <strong>{resumeItem.name}</strong>
            <br />
            This assessment is grounded in the information extracted
            from your uploaded resume.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {!isResumeAssessment && sourceMode === 'document' && (
          <div className="form-group">
            <label
              htmlFor="quiz-doc-select"
              className="form-label"
            >
              Select Study Material
            </label>

            {docsLoading ? (
              <p
                style={{
                  color: 'var(--color-muted)',
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                Loading documents...
              </p>
            ) : documents.length === 0 ? (
              <div className="inline-notice warning">
                <span aria-hidden="true">!</span>

                <span>
                  No study materials available. Upload a PDF, PPTX,
                  or DOCX to create a document-based quiz.{' '}
                  <a
                    href="/materials"
                    style={{
                      color: 'var(--color-warning)',
                      fontWeight: 600,
                    }}
                  >
                    Upload Material
                  </a>
                </span>
              </div>
            ) : (
              <select
                id="quiz-doc-select"
                className="form-select"
                value={selectedDocId}
                onChange={handleDocChange}
              >
                <option value="">
                  -- Select a document --
                </option>

                {documents.map((d) => (
                  <option
                    key={d.document_id}
                    value={d.document_id}
                  >
                    {d.filename ||
                      d.title ||
                      'Untitled Document'}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {!isResumeAssessment && sourceMode === 'topic' && (
          <div className="form-group">
            <label
              htmlFor="quiz-topic-input"
              className="form-label"
            >
              What do you want to practice?
            </label>

            <input
              id="quiz-topic-input"
              type="text"
              className="form-input"
              value={topicInput}
              onChange={(e) =>
                setTopicInput(e.target.value)
              }
              placeholder="e.g. Java HashMap, Binary Trees, SQL Joins..."
            />
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 24,
            flexWrap: 'wrap',
            marginBottom: 24,
          }}
        >
          <div
            className="form-group"
            style={{
              flex: 1,
              minWidth: 200,
              marginBottom: 0,
            }}
          >
            <span className="form-label">
              Number of Questions
            </span>

            <div
              className="pill-selector"
              role="group"
              aria-label="Number of questions"
              style={{ marginTop: 8 }}
            >
              {QUESTION_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`pill-btn${count === n ? ' active' : ''
                    }`}
                  onClick={() => setCount(n)}
                  aria-pressed={count === n}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div
            className="form-group"
            style={{
              flex: 1,
              minWidth: 200,
              marginBottom: 0,
            }}
          >
            <span className="form-label">
              Difficulty
            </span>

            <div
              className="pill-selector"
              role="group"
              aria-label="Difficulty"
              style={{ marginTop: 8 }}
            >
              {['easy', 'medium', 'hard'].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`pill-btn${difficulty === d ? ' active' : ''
                    }`}
                  onClick={() => setDifficulty(d)}
                  aria-pressed={difficulty === d}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <TimerSelector
          value={timerSeconds}
          onChange={setTimerSeconds}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          disabled={!canStart}
        >
          {isResumeAssessment
            ? 'Start Assessment'
            : 'Start Quiz'}
        </Button>
      </form>

      {!isResumeAssessment &&
        priorQuizId &&
        priorWeakCount > 0 && (
          <LearningGapsCallout
            quizId={priorQuizId}
            sourceType={initialSourceType}
            sourceId={initialSourceId}
            filename={initialFilename}
            weakCount={priorWeakCount}
          />
        )}
    </Card>
  );
}

// ── Quiz Timer Display ────────────────────────────────────────────────────────

function QuizTimer({ secondsLeft }) {
  const isUrgent =
    secondsLeft !== null &&
    secondsLeft <= 30;

  const isWarning =
    secondsLeft !== null &&
    secondsLeft <= 60 &&
    secondsLeft > 30;

  const color =
    isUrgent
      ? 'var(--color-error)'
      : isWarning
        ? 'var(--color-warning)'
        : 'var(--color-primary)';

  const bg =
    isUrgent
      ? 'var(--color-error-light)'
      : isWarning
        ? 'var(--color-warning-light)'
        : 'var(--color-primary-light)';

  return (
    <div
      className={`quiz-timer${isUrgent ? ' quiz-timer--urgent' : ''
        }`}
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining: ${formatTime(secondsLeft)}`}
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

// ── Quiz Question UI ──────────────────────────────────────────────────────────

function QuizQuestion({
  question,
  index,
  total,
  selected,
  onSelect,
  onNext,
  isLast,
  submitting,
  secondsLeft,
  onExit,
  isResumeItem,
}) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
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

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {question.topic && (
              <span className="badge badge-gray">
                {question.topic}
              </span>
            )}

            {secondsLeft !== null && (
              <QuizTimer secondsLeft={secondsLeft} />
            )}
          </div>
        </div>

        <ProgressBar
          value={index + 1}
          max={total}
        />
      </div>

      <Card style={{ marginBottom: 20 }}>
        <p
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 600,
            color: 'var(--color-text)',
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

          <div
            className="radio-group"
            role="radiogroup"
          >
            {question.options.map((option) => (
              <label
                key={option.letter}
                className={`radio-option ${selected === option.letter
                    ? 'selected'
                    : ''
                  }`}
                htmlFor={`q${question.id}-${option.letter}`}
              >
                <input
                  type="radio"
                  id={`q${question.id}-${option.letter}`}
                  name={`question-${question.id}`}
                  value={option.letter}
                  checked={
                    selected === option.letter
                  }
                  onChange={() =>
                    onSelect(option.letter)
                  }
                  aria-label={`${option.letter}: ${option.text}`}
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
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {isResumeItem ? (
          <Button
            variant="ghost"
            onClick={onExit}
          >
            ← Save & Return to Queue
          </Button>
        ) : (
          <div />
        )}

        {isLast ? (
          <Button
            variant="primary"
            size="lg"
            onClick={onNext}
            disabled={
              !selected || submitting
            }
            loading={submitting}
          >
            {isResumeItem
              ? 'Submit Assessment'
              : 'Submit Quiz'}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={onNext}
            disabled={!selected}
          >
            Next Question
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QuizzesPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const stateSource = location.state || {};

  const urlSourceType =
    searchParams.get('source_type') || '';

  const urlSourceId =
    searchParams.get('source_id') || '';

  const urlFilename =
    searchParams.get('filename') || '';

  const initialSourceType =
    urlSourceType ||
    stateSource.source_type ||
    '';

  const initialSourceId =
    urlSourceId ||
    stateSource.source_id ||
    '';

  const initialFilename =
    urlFilename ||
    stateSource.filename ||
    '';

  // Prior quiz context — used to display
  // 'Practice Weak Topics' callout.
  const priorQuizId =
    stateSource.quizId ||
    searchParams.get('quiz_id') ||
    '';

  const priorWeakCount =
    stateSource.weakCount || 0;

  const resumeItem =
    stateSource.resumeItem || null;

  /*
   * IMPORTANT:
   *
   * Resume Prep must NOT automatically generate a quiz.
   *
   * It should first open the same QuizConfig used by
   * normal quizzes so the user can choose:
   *
   * - number of questions
   * - difficulty
   * - timer
   *
   * The resume item itself is already known and remains fixed.
   */
  const [phase, setPhase] = useState('config');

  const [loadingStep, setLoadingStep] =
    useState(0);

  const [quizLoading, setQuizLoading] =
    useState(false);

  const [quiz, setQuiz] =
    useState(null);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [answers, setAnswers] =
    useState({});

  const [error, setError] =
    useState(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [configMeta, setConfigMeta] =
    useState({
      filename:
        resumeItem?.name ||
        initialFilename,
    });

  // Timer state
  const [secondsLeft, setSecondsLeft] =
    useState(null);

  const timerRef = useRef(null);

  // Stable submit ref to avoid stale closure in timer callback.
  const submitRef = useRef(null);

  // Restore progress if returning to an existing resume quiz.
  useEffect(() => {
    if (
      resumeItem &&
      phase === 'quiz'
    ) {
      const saved = getResumeQuizProgress(resumeItem.id);

      if (saved) {
        if (
          saved.quizId ===
          quiz?.quiz_id
        ) {
          setAnswers(
            saved.answers || {}
          );

          setCurrentIndex(
            saved.currentIndex || 0
          );
        }
      }
    }
  }, [
    phase,
    quiz,
    resumeItem,
  ]);

  // Save progress on change.
  useEffect(() => {
    if (
      resumeItem &&
      phase === 'quiz' &&
      quiz
    ) {
      setResumeQuizProgress(resumeItem.id, {
        quizId: quiz.quiz_id,
        answers,
        currentIndex,
      });
    }
  }, [
    answers,
    currentIndex,
    phase,
    quiz,
    resumeItem,
  ]);

  const doSubmit = useCallback(
    async (
      currentAnswers,
      currentQuiz,
      currentConfigMeta
    ) => {
      if (submitting) return;

      setSubmitting(true);

      try {
        const formattedAnswers = {};

        Object.entries(
          currentAnswers
        ).forEach(
          ([qId, letter]) => {
            formattedAnswers[
              String(qId)
            ] = letter;
          }
        );

        let evalResult;
        
        if (resumeItem) {
          evalResult =
            await submitResumeQuiz(
              currentQuiz.quiz_id,
              formattedAnswers
            );

          clearResumeQuizProgress(resumeItem.id);
        } else {
          evalResult =
            await submitQuiz(
              currentQuiz.quiz_id,
              formattedAnswers
            );
        }

        // Calculate topic stats for learning gaps
        const topicStats = {};
        if (currentQuiz.questions) {
          currentQuiz.questions.forEach(q => {
            const topic = q.topic || 'General';
            if (!topicStats[topic]) topicStats[topic] = { total: 0, correct: 0 };
            topicStats[topic].total += 1;
            
            const isMistake = evalResult.mistakes?.some(m => m.question_id === q.id);
            if (!isMistake) {
              topicStats[topic].correct += 1;
            }
          });
        }

        // Add to history
        const historyItem = {
          quizId: currentQuiz.quiz_id,
          completedAt: new Date().toISOString(),
          sourceType: resumeItem ? 'resume_item' : currentQuiz.source_type,
          sourceId: resumeItem ? resumeItem.id : currentQuiz.source_id,
          filename: resumeItem ? resumeItem.name : currentConfigMeta.filename,
          score: evalResult.score,
          totalQuestions: evalResult.total,
          percentage: evalResult.percentage,
          mistakes: evalResult.mistakes,
          topicStats
        };
        addQuizToHistory(historyItem);
        recalculateLearningGaps();

        navigate(
          `/quiz-results?quizId=${currentQuiz.quiz_id}`,
          {
            state: {
              evaluation: evalResult,
              quizId: currentQuiz.quiz_id,
              sourceType: historyItem.sourceType,
              sourceId: historyItem.sourceId,
              filename: historyItem.filename,
              isResumeItem: Boolean(resumeItem),
              resumeItem: resumeItem || undefined,
            },
          }
        );
      } catch (err) {
        setError(err.message);
        setSubmitting(false);
      }
    },
    [resumeItem, submitting, navigate]
  );

  // Keep ref up-to-date for timer callback.
  useEffect(() => {
    submitRef.current = {
      answers,
      quiz,
      configMeta,
    };
  }, [
    answers,
    quiz,
    configMeta,
  ]);

  // Countdown timer effect.
  useEffect(() => {
    if (
      phase !== 'quiz' ||
      secondsLeft === null
    ) {
      clearInterval(
        timerRef.current
      );
      return;
    }

    timerRef.current =
      setInterval(() => {
        setSecondsLeft(
          (prev) => {
            if (prev <= 1) {
              clearInterval(
                timerRef.current
              );

              const {
                answers: ans,
                quiz: q,
                configMeta: meta,
              } =
                submitRef.current;

              if (q) {
                doSubmit(
                  ans,
                  q,
                  meta
                );
              }

              return 0;
            }

            return prev - 1;
          }
        );
      }, 1000);

    return () =>
      clearInterval(
        timerRef.current
      );
  }, [
    phase,
    secondsLeft === null,
    doSubmit,
  ]);

  async function handleStart({
    sourceType,
    sourceId,
    count,
    difficulty,
    filename,
    timerSeconds,
  }) {
    setPhase('loading');
    setError(null);
    setLoadingStep(0);
    setQuizLoading(true);

    setConfigMeta({
      filename:
        filename ||
        initialFilename ||
        resumeItem?.name ||
        '',
    });

    const stepInterval =
      setInterval(() => {
        setLoadingStep(
          (s) =>
            Math.min(
              s + 1,
              LOADING_STEPS_QUIZ.length - 1
            )
        );
      }, 700);

    try {
      let data;

      if (
        sourceType ===
        'resume_item'
      ) {
        data =
          await generateResumeQuiz(
            sourceId,
            difficulty,
            count
          );
      } else {
        data =
          await generateQuiz(
            sourceType,
            sourceId,
            count,
            difficulty
          );
      }

      setQuiz(data);
      setAnswers({});
      setCurrentIndex(0);

      // Set up timer.
      setSecondsLeft(
        timerSeconds !== undefined
          ? timerSeconds
          : null
      );

      setPhase('quiz');
    } catch (err) {
      setError(err.message);

      // Return to configuration so
      // the user can adjust settings
      // and retry.
      setPhase('config');
    } finally {
      clearInterval(
        stepInterval
      );

      setQuizLoading(false);
    }
  }

  async function handleNext() {
    const questions =
      quiz.questions;

    if (
      currentIndex <
      questions.length - 1
    ) {
      setCurrentIndex(
        (i) => i + 1
      );

      return;
    }

    clearInterval(
      timerRef.current
    );

    await doSubmit(
      answers,
      quiz,
      configMeta
    );
  }

  if (phase === 'loading') {
    return (
      <div className="page-content">
        <PageHeader
          title={
            resumeItem
              ? 'Resume Interview Assessment'
              : 'Quiz and Practice'
          }
          subtitle={
            resumeItem
              ? `Formulating tailored interview questions on "${resumeItem.name}"...`
              : undefined
          }
        />

        <LoadingSteps
          steps={LOADING_STEPS_QUIZ}
          currentStep={loadingStep}
        />
      </div>
    );
  }

  const currentQuestion =
    quiz?.questions?.[currentIndex];

  return (
    <div className="page-content">
      <PageHeader
        title={
          resumeItem
            ? 'Resume Interview Assessment'
            : 'Quiz and Practice'
        }
        subtitle={
          phase === 'quiz'
            ? (
              resumeItem
                ? `Assessing: ${resumeItem.name} • Grounded in your uploaded resume`
                : quiz.source_type ===
                  'document'
                  ? (
                    'Document: ' +
                    (
                      configMeta.filename ||
                      'Document'
                    )
                  )
                  : (
                    'Topic: ' +
                    quiz.source_id
                  )
            )
            : resumeItem
              ? `Configure your assessment for "${resumeItem.name}".`
              : 'Test your knowledge or practice a topic.'
        }
      />

      {error && (
        <div
          style={{
            marginBottom: 20,
          }}
        >
          <ErrorState
            title="Quiz error"
            message={error}
            onRetry={() => {
              setError(null);

              if (resumeItem) {
                setPhase('config');
              }
            }}
          />
        </div>
      )}

      {phase === 'config' && (
        <QuizConfig
          initialSourceType={
            initialSourceType
          }
          initialSourceId={
            initialSourceId
          }
          initialFilename={
            initialFilename
          }
          priorQuizId={
            priorQuizId
          }
          priorWeakCount={
            priorWeakCount
          }
          onStart={
            handleStart
          }
          loading={
            quizLoading
          }
          resumeItem={
            resumeItem
          }
        />
      )}

      {phase === 'error' &&
        !error && (
          <div
            style={{
              marginBottom: 20,
            }}
          >
            <ErrorState
              title="Error"
              message="Failed to load quiz"
              onRetry={() =>
                navigate(
                  '/resume-prep'
                )
              }
            />
          </div>
        )}

      {phase === 'quiz' && currentQuestion && (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 500px', minWidth: 0 }}>
            <QuizQuestion
              question={currentQuestion}
              index={currentIndex}
              total={quiz.questions.length}
              selected={answers[currentQuestion.id] || ''}
              onSelect={(letter) =>
                setAnswers((prev) => ({
                  ...prev,
                  [currentQuestion.id]: letter,
                }))
              }
              onNext={handleNext}
              isLast={currentIndex === quiz.questions.length - 1}
              submitting={submitting}
              secondsLeft={secondsLeft}
              onExit={() => navigate('/resume-prep')}
              isResumeItem={Boolean(resumeItem)}
            />
          </div>
          
          <div className="quiz-navigator" style={{ 
            flex: '0 0 280px', 
            background: 'var(--color-surface)', 
            borderRadius: '12px', 
            border: '1px solid var(--color-border)',
            padding: '20px',
            position: 'sticky',
            top: '80px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--color-text)' }}>
              Questions List
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {quiz.questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    style={{
                      padding: '8px 0',
                      borderRadius: '6px',
                      border: `1px solid ${isCurrent ? 'var(--color-primary)' : (isAnswered ? 'var(--color-primary-muted)' : 'var(--color-border)')}`,
                      background: isCurrent ? 'var(--color-primary)' : (isAnswered ? 'var(--color-primary-light)' : 'var(--color-surface)'),
                      color: isCurrent ? 'white' : 'var(--color-text)',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                    title={`Question ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
              <Button 
                variant="primary" 
                onClick={() => doSubmit(answers, quiz, configMeta)} 
                disabled={submitting}
                loading={submitting}
                style={{ width: '100%' }}
              >
                Submit Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}