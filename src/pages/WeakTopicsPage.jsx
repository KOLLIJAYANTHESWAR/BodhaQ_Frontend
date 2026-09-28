import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { generatePractice, submitQuiz } from '../api/quizApi.js';
import { learnTopic } from '../api/learningApi.js';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import Spinner from '../components/common/Spinner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ProgressBar from '../components/common/ProgressBar.jsx';
import Modal from '../components/common/Modal.jsx';
import { LoadingSteps } from '../components/common/Spinner.jsx';

import { getQuizHistory, removeQuizFromHistory } from '../utils/storage.js';

// ---- Helpers ----------------------------------------------------------------

function getLearningState(accuracy) {
  if (accuracy >= 80) return 'learned';
  if (accuracy >= 60) return 'improving';
  return 'needs-practice';
}

function stateLabel(state) {
  if (state === 'learned')   return 'Learned';
  if (state === 'improving') return 'Improving';
  return 'Needs Practice';
}

function stateBadgeClass(state) {
  if (state === 'learned')   return 'badge badge-learned';
  if (state === 'improving') return 'badge badge-improving';
  return 'badge badge-needs-practice';
}

function stateIcon(state) {
  if (state === 'learned')   return 'v';
  if (state === 'improving') return 'o';
  return '!';
}

function calculateGapsForQuiz(topicStats, quiz) {
  if (!topicStats) return [];
  return Object.entries(topicStats).map(([topic, stats]) => {
    const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    return {
      topic,
      accuracy,
      learningState: getLearningState(accuracy),
      source_type: quiz.sourceType,
      source_id: quiz.sourceId,
      quiz_count: 1
    };
  });
}

const PRACTICE_LOADING_STEPS = [
  'Preparing targeted practice...',
  'Finding relevant content...',
  'Writing practice questions...',
  'Almost ready...',
];

// Shared question counts (matches QuizzesPage)
const QUESTION_COUNTS = [5, 10, 20, 30, 40, 50];

// Timer presets (matches QuizzesPage)
const TIMER_OPTIONS = [
  { label: 'Unlimited', value: null },
  { label: '2 min',     value: 2  * 60 },
  { label: '5 min',     value: 5  * 60 },
  { label: '10 min',    value: 10 * 60 },
  { label: '15 min',    value: 15 * 60 },
  { label: '20 min',    value: 20 * 60 },
  { label: '30 min',    value: 30 * 60 },
  { label: '45 min',    value: 45 * 60 },
  { label: '1 hr',      value: 60 * 60 },
];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// Inline timer badge (same design as QuizzesPage QuizTimer)
function PracticeTimer({ secondsLeft }) {
  if (secondsLeft === null) return null;
  const isUrgent  = secondsLeft <= 30;
  const isWarning = secondsLeft <= 60 && secondsLeft > 30;
  const color = isUrgent ? 'var(--color-error)' : isWarning ? 'var(--color-warning)' : 'var(--color-primary)';
  const bg    = isUrgent ? 'var(--color-error-light)' : isWarning ? 'var(--color-warning-light)' : 'var(--color-primary-light)';
  return (
    <div
      className={'quiz-timer' + (isUrgent ? ' quiz-timer--urgent' : '')}
      role="timer"
      aria-live="polite"
      aria-label={'Time remaining: ' + formatTime(secondsLeft)}
      style={{ '--timer-color': color, '--timer-bg': bg }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span className="quiz-timer-text" style={{ color }}>{formatTime(secondsLeft)}</span>
    </div>
  );
}

// ---- Explanation button (inline toggle) ------------------------------------

function ExplanationButton({ explanation }) {
  const [open, setOpen] = useState(false);
  if (!explanation) return null;
  return (
    <div>
      <button
        type="button"
        className="explanation-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

// ---- Mistake card (for practice results) -----------------------------------

function MistakeCard({ mistake }) {
  return (
    <Card style={{ borderLeft: '3px solid var(--color-error)' }}>
      {mistake.topic && (
        <span className="badge badge-gray" style={{ marginBottom: 8, display: 'inline-block' }}>
          {mistake.topic}
        </span>
      )}
      <p style={{ fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>{mistake.question}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
        <div style={{ background: 'var(--color-error-light)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', display: 'flex', gap: 8 }}>
          <span style={{ color: 'var(--color-error)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Your answer:</span>
          <span style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>{mistake.user_answer}</span>
        </div>
        <div style={{ background: 'var(--color-success-light)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', display: 'flex', gap: 8 }}>
          <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Correct answer:</span>
          <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-sm)' }}>{mistake.correct_answer}</span>
        </div>
      </div>
      <ExplanationButton explanation={mistake.explanation} />
    </Card>
  );
}

// ---- Practice results view -------------------------------------------------

function PracticeResults({ result, topic, onContinue, onRetry }) {
  const { score, total, percentage, mistakes } = result;
  const state = getLearningState(percentage);

  const scoreColor =
    state === 'learned'   ? 'var(--color-success)' :
    state === 'improving' ? '#3b82f6' :
    'var(--color-warning)';

  const message =
    state === 'learned'   ? 'Great job! You have mastered this topic.' :
    state === 'improving' ? 'Good progress! Keep practising to solidify your understanding.' :
    'This topic needs more practice. Keep going!';

  return (
    <div>
      <Card style={{ textAlign: 'center', padding: 40, marginBottom: 24 }}>
        <div style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 4, fontWeight: 800, color: scoreColor }}>
          {Math.round(percentage)}%
        </div>
        <p style={{ color: 'var(--color-muted)', marginBottom: 4 }}>{score} / {total} correct</p>
        <div style={{ maxWidth: 280, margin: '0 auto 16px' }}>
          <ProgressBar value={score} max={total} />
        </div>
        <span className={stateBadgeClass(state)} style={{ fontSize: 'var(--font-size-sm)', padding: '4px 12px' }}>
          {stateLabel(state)}
        </span>
        <p style={{ marginTop: 14, color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>{message}</p>
      </Card>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
        {state !== 'learned' && (
          <Button variant="primary" onClick={onRetry}>Retry Practice</Button>
        )}
        <Button variant="ghost" onClick={onContinue}>Back to Learning Gaps</Button>
      </div>

      {mistakes && mistakes.length > 0 && (
        <div>
          <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 12 }}>
            Mistakes ({mistakes.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mistakes.map((m) => (
              <MistakeCard key={m.question_id} mistake={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Practice config modal -------------------------------------------------

function PracticeConfigModal({ isOpen, topic, onClose, onStart }) {
  const [difficulty,    setDifficulty]   = useState('medium');
  const [count,         setCount]        = useState(5);
  const [timerSeconds,  setTimerSeconds] = useState(null); // null = unlimited

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={'Practice: ' + topic}>
      <div className="practice-config-modal">
        <div>
          <span className="form-label">Difficulty</span>
          <div className="pill-selector" role="group" aria-label="Difficulty" style={{ marginTop: 8 }}>
            {['easy', 'medium', 'hard'].map((d) => (
              <button
                key={d}
                type="button"
                className={'pill-btn' + (difficulty === d ? ' active' : '')}
                onClick={() => setDifficulty(d)}
                aria-pressed={difficulty === d}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="form-label">Number of Questions</span>
          <div className="pill-selector" role="group" aria-label="Number of questions" style={{ marginTop: 8, flexWrap: 'wrap' }}>
            {QUESTION_COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                className={'pill-btn' + (count === n ? ' active' : '')}
                onClick={() => setCount(n)}
                aria-pressed={count === n}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="form-label">
            Time Limit
            <span style={{ marginLeft: 8, fontSize: 'var(--font-size-xs)', fontWeight: 400, color: 'var(--color-muted)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 99, padding: '2px 8px' }}>Optional</span>
          </span>
          <div className="pill-selector" role="group" aria-label="Time limit" style={{ marginTop: 8, flexWrap: 'wrap' }}>
            {TIMER_OPTIONS.map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                className={'pill-btn' + (timerSeconds === opt.value ? ' active' : '')}
                onClick={() => setTimerSeconds(opt.value)}
                aria-pressed={timerSeconds === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {timerSeconds !== null && (
            <p style={{ marginTop: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)' }}>
              ⏱ Practice will auto-submit when the timer runs out.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onStart({ difficulty, count, timerSeconds })}>Start Practice</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Concept intro screen --------------------------------------------------

function ConceptIntroScreen({ topic, conceptData, loading, onTakePractice, onBack }) {
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)',
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20,
          padding: 0,
        }}
      >
        Back to Learning Gaps
      </button>

      <Card style={{ borderLeft: '4px solid var(--color-primary)', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 'var(--font-size-xl)', margin: 0 }}>{topic}</h2>
            <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)', marginTop: 2 }}>
              Before you practice
            </p>
          </div>
        </div>

        {loading ? (
          <Spinner label="Loading concept overview..." />
        ) : conceptData ? (
          <div>
            {conceptData.definition && (
              <p style={{ lineHeight: 1.8, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                {conceptData.definition}
              </p>
            )}
            {conceptData.key_concepts && conceptData.key_concepts.length > 0 && (
              <div className="concept-intro-key-idea">
                <strong>Key Concepts: </strong>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {conceptData.key_concepts.map((kc, i) => (
                    <li key={i}>{kc}</li>
                  ))}
                </ul>
              </div>
            )}
            {conceptData.example && (
              <div style={{ marginTop: 14 }}>
                <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>Example Code/Illustration:</strong>
                <div style={{
                  marginTop: 6,
                  padding: '10px 14px',
                  background: 'var(--color-surface-2)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-sm)',
                  lineHeight: 1.7,
                  color: 'var(--color-text-secondary)',
                }}>
                  <pre style={{ margin: '0 0 8px 0', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {conceptData.example.code}
                  </pre>
                  <p style={{ margin: 0 }}>{conceptData.example.explanation}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: 'var(--color-muted)' }}>
            Practice targeted questions on <strong>{topic}</strong> to strengthen your understanding.
          </p>
        )}
      </Card>

      <Card style={{ textAlign: 'center', padding: 32 }}>
        <h3 style={{ marginBottom: 8 }}>Ready to practice?</h3>
        <p style={{ color: 'var(--color-muted)', marginBottom: 20, fontSize: 'var(--font-size-sm)' }}>
          Test your understanding with targeted questions.
        </p>
        <Button variant="primary" size="lg" onClick={() => setConfigOpen(true)}>
          Take Practice Quiz
        </Button>
      </Card>

      <PracticeConfigModal
        isOpen={configOpen}
        topic={topic}
        onClose={() => setConfigOpen(false)}
        onStart={(cfg) => {
          setConfigOpen(false);
          onTakePractice(cfg);
        }}
      />
    </div>
  );
}

// ---- Quiz question UI (reused for practice) --------------------------------

function PracticeQuizQuestion({ question, index, total, selected, onSelect, onNext, isLast, submitting, secondsLeft }) {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 }}>
          <span className="text-muted" style={{ fontWeight: 600 }}>Question {index + 1} of {total}</span>
          {secondsLeft !== null && <PracticeTimer secondsLeft={secondsLeft} />}
        </div>
        <ProgressBar value={index + 1} max={total} />
      </div>

      <Card style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, lineHeight: 1.5, marginBottom: 24 }}>
          {question.question}
        </p>
        <fieldset style={{ border: 'none', padding: 0 }}>
          <legend className="sr-only">Select your answer</legend>
          <div className="radio-group">
            {question.options.map((option) => (
              <label
                key={option.letter}
                className={'radio-option ' + (selected === option.letter ? 'selected' : '')}
                htmlFor={'pq' + question.id + '-' + option.letter}
              >
                <input
                  type="radio"
                  id={'pq' + question.id + '-' + option.letter}
                  name={'pquestion-' + question.id}
                  value={option.letter}
                  checked={selected === option.letter}
                  onChange={() => onSelect(option.letter)}
                  aria-label={option.letter + ': ' + option.text}
                />
                <span className="radio-option-letter" aria-hidden="true">{option.letter}</span>
                <span className="radio-option-text">{option.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {isLast ? (
          <Button variant="primary" size="lg" onClick={onNext} disabled={!selected || submitting} loading={submitting}>
            Submit Practice
          </Button>
        ) : (
          <Button variant="primary" onClick={onNext} disabled={!selected}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

// ---- Weak topic card -------------------------------------------------------

function WeakTopicCard({ item, onExplain, onPractice, onClear }) {
  const state = item.learningState || getLearningState(item.accuracy);
  const isLearned   = state === 'learned';
  const isImproving = state === 'improving';

  const borderColor =
    isLearned     ? 'var(--color-success)' :
    isImproving   ? '#3b82f6' :
    'var(--color-warning)';

  return (
    <Card style={{ borderLeft: '3px solid ' + borderColor, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: isLearned ? 'var(--color-success-light)' : isImproving ? 'rgba(59,130,246,0.12)' : 'var(--color-warning-light)',
              color: isLearned ? 'var(--color-success)' : isImproving ? '#3b82f6' : 'var(--color-warning)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'var(--font-size-xs)', fontWeight: 700,
            }} aria-hidden="true">
              {stateIcon(state)}
            </span>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{item.topic}</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span className="text-muted" style={{ fontSize: 'var(--font-size-sm)', minWidth: 88 }}>
              Accuracy: {Math.round(item.accuracy)}%
            </span>
            <div style={{ flex: 1, maxWidth: 180 }}>
              <ProgressBar value={item.accuracy} max={100} />
            </div>
          </div>

          <span className={stateBadgeClass(state)}>{stateLabel(state)}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Needs Practice: Explanation + Practice */}
          {!isLearned && !isImproving && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onExplain(item)}>
                Explanation
              </Button>
              <Button variant="primary" size="sm" onClick={() => onPractice(item)}>
                Practice
              </Button>
            </>
          )}

          {/* Improving: Practice only (streamlined) */}
          {isImproving && (
            <Button variant="primary" size="sm" onClick={() => onPractice(item)}>
              Practice
            </Button>
          )}

          {/* Learned: View concept + Clear */}
          {isLearned && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onExplain(item)}>
                View
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onClear(item)} title="Remove from active learning gaps">
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

function ConceptExplanationModal({ isOpen, item, conceptData, loading, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item ? item.topic : ''}>
      {loading ? (
        <Spinner label="Fetching explanation..." />
      ) : conceptData ? (
        <div style={{ lineHeight: 1.8 }}>
          {conceptData.definition && (
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 14 }}>{conceptData.definition}</p>
          )}
          {conceptData.key_concepts && conceptData.key_concepts.length > 0 && (
            <div className="concept-intro-key-idea" style={{ marginBottom: 14 }}>
              <strong>Key Concepts: </strong>
              <ul style={{ marginTop: 6, paddingLeft: 20 }}>
                {conceptData.key_concepts.map((kc, i) => (
                  <li key={i}>{kc}</li>
                ))}
              </ul>
            </div>
          )}
          {conceptData.important_points && conceptData.important_points.length > 0 && (
            <ul style={{ marginTop: 10, paddingLeft: 20, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              {conceptData.important_points.map((pt, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{pt}</li>
              ))}
            </ul>
          )}
          {conceptData.example && (
            <div style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 'var(--font-size-sm)' }}>Example: </strong>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', background: 'var(--color-surface-2)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginTop: 8 }}>
                <pre style={{ margin: '0 0 8px 0', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {conceptData.example.code}
                </pre>
                <p style={{ margin: 0 }}>{conceptData.example.explanation}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p style={{ color: 'var(--color-muted)' }}>Unable to load explanation. Please try again.</p>
      )}
      <div style={{ marginTop: 20, textAlign: 'right' }}>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

// ---- Main page --------------------------------------------------------------

export default function WeakTopicsPage() {
  const navigate       = useNavigate();

  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  
  const [expandedQuizzes, setExpandedQuizzes] = useState(new Set());

  // Concept explanation modal
  const [explainItem,      setExplainItem]      = useState(null);
  const [conceptData,      setConceptData]      = useState(null);
  const [conceptLoading,   setConceptLoading]   = useState(false);
  const [conceptModalOpen, setConceptModalOpen] = useState(false);

  // Practice intro
  const [practiceItem,           setPracticeItem]           = useState(null);
  const [practiceConceptData,    setPracticeConceptData]    = useState(null);
  const [practiceConceptLoading, setPracticeConceptLoading] = useState(false);

  // Practice quiz
  const [practicePhase,       setPracticePhase]       = useState('idle');
  const [practiceLoadingStep, setPracticeLoadingStep] = useState(0);
  const [practiceQuiz,        setPracticeQuiz]        = useState(null);
  const [practiceAnswers,     setPracticeAnswers]     = useState({});
  const [practiceIndex,       setPracticeIndex]       = useState(0);
  const [practiceResult,      setPracticeResult]      = useState(null);
  const [practiceError,       setPracticeError]       = useState(null);
  const [practiceSubmitting,  setPracticeSubmitting]  = useState(false);

  // Practice timer
  const [practiceSecondsLeft,  setPracticeSecondsLeft] = useState(null);
  const practiceTimerRef = useRef(null);
  const practiceSubmitRef = useRef(null);

  // Cleared topics (localStorage)
  const [clearedTopics, setClearedTopics] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bodhaq_cleared_topics') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('bodhaq_cleared_topics', JSON.stringify(clearedTopics));
  }, [clearedTopics]);

  // State overrides (persisted accuracy/state after practice)
  const [stateOverrides, setStateOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bodhaq_topic_states') || '{}'); }
    catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('bodhaq_topic_states', JSON.stringify(stateOverrides));
  }, [stateOverrides]);

  const fetchWeakTopics = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const quizzes = getQuizHistory();
      setRecentQuizzes(quizzes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWeakTopics(); }, [fetchWeakTopics]);

  const handleDeleteQuiz = (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz result?')) return;
    removeQuizFromHistory(quizId);
    
    // Auto-collapse if expanded
    setExpandedQuizzes(prev => {
      const next = new Set(prev);
      next.delete(quizId);
      return next;
    });
    
    fetchWeakTopics();
  };

  const toggleLearningGaps = (quizId) => {
    setExpandedQuizzes(prev => {
      const next = new Set(prev);
      if (next.has(quizId)) next.delete(quizId);
      else next.add(quizId);
      return next;
    });
  };

  // Keep submit ref up-to-date (avoids stale closure in timer)
  useEffect(() => {
    practiceSubmitRef.current = { practiceAnswers, practiceQuiz };
  }, [practiceAnswers, practiceQuiz]);

  // Practice countdown timer
  useEffect(() => {
    if (practicePhase !== 'quiz' || practiceSecondsLeft === null) {
      clearInterval(practiceTimerRef.current);
      return;
    }
    practiceTimerRef.current = setInterval(() => {
      setPracticeSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(practiceTimerRef.current);
          // Auto-submit with current answers
          const { practiceAnswers: ans, practiceQuiz: q } = practiceSubmitRef.current;
          if (q) {
            setPracticeSubmitting(true);
            const formatted = {};
            Object.entries(ans).forEach(([id, letter]) => { formatted[String(id)] = letter; });
            submitQuiz(q.quiz_id, formatted)
              .then((evalResult) => {
                setPracticeResult(evalResult);
                setPracticePhase('results');
                const newState = getLearningState(evalResult.percentage);
                setStateOverrides((prev) => ({
                  ...prev,
                  [practiceSubmitRef.current.practiceQuiz.source_id || '']: { state: newState, accuracy: evalResult.percentage },
                }));
              })
              .catch((err) => setPracticeError(err.message))
              .finally(() => setPracticeSubmitting(false));
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(practiceTimerRef.current);
  }, [practicePhase, practiceSecondsLeft === null]); // eslint-disable-line


  // Concept explanation modal
  async function handleExplain(item) {
    setExplainItem(item);
    setConceptModalOpen(true);
    setConceptData(null);
    setConceptLoading(true);
    try {
      const data = await learnTopic(item.topic);
      setConceptData(data);
    } catch {
      setConceptData(null);
    } finally {
      setConceptLoading(false);
    }
  }

  function handleCloseExplain() {
    setConceptModalOpen(false);
    setExplainItem(null);
    setConceptData(null);
  }

  // Practice flow
  async function handlePractice(item) {
    setPracticeItem(item);
    setPracticePhase('intro');
    setPracticeConceptData(null);
    setPracticeConceptLoading(true);
    setPracticeResult(null);
    setPracticeError(null);
    try {
      const data = await learnTopic(item.topic);
      setPracticeConceptData(data);
    } catch {
      setPracticeConceptData(null);
    } finally {
      setPracticeConceptLoading(false);
    }
  }

  async function handleStartPracticeQuiz(topic, difficulty, count, item, timerSeconds) {
    if (!practiceItem) return;
    setPracticePhase('loading');
    setPracticeError(null);
    setPracticeLoadingStep(0);
    clearInterval(practiceTimerRef.current);

    const stepInterval = setInterval(() => {
      setPracticeLoadingStep((s) => Math.min(s + 1, PRACTICE_LOADING_STEPS.length - 1));
    }, 700);

    const documentId = practiceItem.source_type === 'document' ? practiceItem.source_id : undefined;

    try {
      const data = await generatePractice(practiceItem.topic, documentId, difficulty, count);
      setPracticeQuiz(data);
      setPracticeAnswers({});
      setPracticeIndex(0);
      setPracticeSecondsLeft(timerSeconds !== undefined ? timerSeconds : null);
      setPracticePhase('quiz');
    } catch (err) {
      setPracticeError(err.message);
      setPracticePhase('intro');
    } finally {
      clearInterval(stepInterval);
    }
  }

  async function handlePracticeNext() {
    const questions = practiceQuiz.questions;
    if (practiceIndex < questions.length - 1) {
      setPracticeIndex((i) => i + 1);
      return;
    }
    clearInterval(practiceTimerRef.current);

    setPracticeSubmitting(true);
    try {
      const formattedAnswers = {};
      Object.entries(practiceAnswers).forEach(([qId, letter]) => {
        formattedAnswers[String(qId)] = letter;
      });
      const evalResult = await submitQuiz(practiceQuiz.quiz_id, formattedAnswers);
      setPracticeResult(evalResult);
      setPracticePhase('results');

      // Update learning state based on result
      const newState = getLearningState(evalResult.percentage);
      setStateOverrides((prev) => ({
        ...prev,
        [practiceItem.topic]: { state: newState, accuracy: evalResult.percentage },
      }));
    } catch (err) {
      setPracticeError(err.message);
      setPracticeSubmitting(false);
    } finally {
      setPracticeSubmitting(false);
    }
  }

  function handleBackToList() {
    clearInterval(practiceTimerRef.current);
    setPracticeSecondsLeft(null);
    setPracticeItem(null);
    setPracticePhase('idle');
    setPracticeResult(null);
    setPracticeError(null);
  }

  function handleClear(item) {
    setClearedTopics((prev) => [...prev, item.topic]);
  }

  // ---- Render: practice intro
  if (practicePhase === 'intro' && practiceItem) {
    return (
      <div className="page-content">
        <PageHeader title="Practice" subtitle={'Focusing on: ' + practiceItem.topic} />
        {practiceError && (
          <div style={{ marginBottom: 16 }}>
            <ErrorState title="Practice error" message={practiceError} onRetry={() => setPracticeError(null)} />
          </div>
        )}
        <ConceptIntroScreen
          topic={practiceItem.topic}
          conceptData={practiceConceptData}
          loading={practiceConceptLoading}
          onTakePractice={handleStartPracticeQuiz}
          onBack={handleBackToList}
        />
      </div>
    );
  }

  // ---- Render: practice loading
  if (practicePhase === 'loading') {
    return (
      <div className="page-content">
        <PageHeader title="Practice" subtitle={'Preparing questions for: ' + (practiceItem ? practiceItem.topic : '')} />
        <LoadingSteps steps={PRACTICE_LOADING_STEPS} currentStep={practiceLoadingStep} />
      </div>
    );
  }

  // ---- Render: practice quiz
  if (practicePhase === 'quiz' && practiceQuiz) {
    const currentQuestion = practiceQuiz.questions[practiceIndex];
    return (
      <div className="page-content">
        <PageHeader title="Practice Quiz" subtitle={'Topic: ' + (practiceItem ? practiceItem.topic : '')} />
        {practiceError && (
          <div style={{ marginBottom: 16 }}>
            <ErrorState title="Error" message={practiceError} onRetry={() => setPracticeError(null)} />
          </div>
        )}
        <PracticeQuizQuestion
          question={currentQuestion}
          index={practiceIndex}
          total={practiceQuiz.questions.length}
          selected={practiceAnswers[currentQuestion.id] || ''}
          onSelect={(letter) => setPracticeAnswers((prev) => ({ ...prev, [currentQuestion.id]: letter }))}
          onNext={handlePracticeNext}
          isLast={practiceIndex === practiceQuiz.questions.length - 1}
          submitting={practiceSubmitting}
          secondsLeft={practiceSecondsLeft}
        />
      </div>
    );
  }

  // ---- Render: practice results
  if (practicePhase === 'results' && practiceResult) {
    return (
      <div className="page-content">
        <PageHeader title="Practice Complete" subtitle={'Topic: ' + (practiceItem ? practiceItem.topic : '')} />
        <PracticeResults
          result={practiceResult}
          topic={practiceItem ? practiceItem.topic : ''}
          onContinue={handleBackToList}
          onRetry={() => setPracticePhase('intro')}
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

      {loading && <Spinner label="Loading assessments..." />}

      {error && !loading && (
        <ErrorState title="Could not load learning gaps" message={error} onRetry={fetchWeakTopics} />
      )}
      
      {!loading && !error && recentQuizzes.length === 0 && (
        <Card>
          <p style={{ color: 'var(--color-muted)' }}>
            No quizzes completed yet. Please complete a quiz first to see your learning gaps.
          </p>
          <Button variant="primary" style={{ marginTop: 12 }} onClick={() => navigate('/quizzes')}>
            Take a Quiz
          </Button>
        </Card>
      )}

      {!loading && !error && recentQuizzes.length > 0 && (
        <div>
          {practiceError && (
            <div style={{ marginBottom: 16 }}>
              <ErrorState title="Practice error" message={practiceError} onRetry={() => setPracticeError(null)} />
            </div>
          )}

          <h2 className="gap-section-title">Recent Assessments</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {recentQuizzes.map((q) => {
              const isExpanded = expandedQuizzes.has(q.quizId);
              
              const rawGaps = calculateGapsForQuiz(q.topicStats, q);
              const augmentedGaps = rawGaps.map(t => ({
                ...t,
                accuracy: stateOverrides[t.topic] ? stateOverrides[t.topic].accuracy : t.accuracy,
                learningState: stateOverrides[t.topic] ? stateOverrides[t.topic].state : t.learningState
              })).filter(t => !clearedTopics.includes(t.topic));
              
              const needsPractice = augmentedGaps.filter(t => t.learningState === 'needs-practice');
              const improving     = augmentedGaps.filter(t => t.learningState === 'improving');
              const learned       = augmentedGaps.filter(t => t.learningState === 'learned');

              return (
                <div key={q.quizId}>
                  <Card style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                      <div>
                        <h3 style={{ fontSize: 'var(--font-size-base)', marginBottom: 4 }}>{q.filename || q.sourceId || 'Assessment'}</h3>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
                          {new Date(q.completedAt).toLocaleString()}
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: getLearningState(q.percentage) === 'learned' ? 'var(--color-success)' : getLearningState(q.percentage) === 'improving' ? '#3b82f6' : 'var(--color-warning)' }}>
                          {Math.round(q.percentage)}%
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
                          {q.score} / {q.totalQuestions} correct
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/quiz-results?quizId=${q.quizId}`, { state: { evaluation: { ...q, total: q.totalQuestions }, quizId: q.quizId, sourceType: q.sourceType, sourceId: q.sourceId, filename: q.filename } })}>Review Results</Button>
                          <Button variant={isExpanded ? "primary" : "secondary"} size="sm" onClick={() => toggleLearningGaps(q.quizId)}>{isExpanded ? 'Hide Learning Gaps' : 'Learning Gaps'}</Button>
                          <Button variant="danger" size="sm" onClick={() => handleDeleteQuiz(q.quizId)} style={{ background: 'transparent', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>Delete</Button>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {isExpanded && (
                    <div style={{ 
                      marginTop: 8, 
                      padding: '20px 24px', 
                      background: 'var(--color-surface-2)', 
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--color-border)',
                      marginLeft: 12,
                      marginRight: 12
                    }}>
                      <h3 style={{ marginBottom: 16, fontSize: 'var(--font-size-lg)' }}>Learning Gaps for this assessment</h3>
                      
                      {augmentedGaps.length === 0 ? (
                        <p style={{ color: 'var(--color-muted)' }}>No topics recorded for this assessment or all topics cleared.</p>
                      ) : (
                        <>
                          {needsPractice.length > 0 && (
                            <div style={{ marginBottom: 24 }}>
                              <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 12, color: 'var(--color-warning)' }}>Needs Practice</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {needsPractice.map(item => (
                                  <WeakTopicCard key={item.topic} item={item} onExplain={handleExplain} onPractice={handlePractice} onClear={handleClear} />
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {improving.length > 0 && (
                            <div style={{ marginBottom: 24 }}>
                              <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 12, color: '#3b82f6' }}>Improving</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {improving.map(item => (
                                  <WeakTopicCard key={item.topic} item={item} onExplain={handleExplain} onPractice={handlePractice} onClear={handleClear} />
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {learned.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                              <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 12, color: 'var(--color-success)' }}>Learned</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {learned.map(item => (
                                  <WeakTopicCard key={item.topic} item={item} onExplain={handleExplain} onPractice={handlePractice} onClear={handleClear} />
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <Button variant="ghost" onClick={() => navigate('/')}>Home</Button>
            <Button variant="secondary" onClick={() => navigate('/quizzes')}>Take New Quiz</Button>
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
