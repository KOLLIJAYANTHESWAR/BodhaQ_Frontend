import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getQuizHistory } from '../utils/storage.js';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import ProgressBar from '../components/common/ProgressBar.jsx';

// Score ring
function ScoreRing({ percentage }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dash = (percentage / 100) * circumference;
  const color =
    percentage >= 80 ? 'var(--color-success)' :
    percentage >= 50 ? 'var(--color-warning)' :
    'var(--color-error)';

  return (
    <div className="score-ring" aria-hidden="true">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={dash + ' ' + circumference}
          strokeDashoffset="0"
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="score-ring-text">
        <span className="score-ring-percent" style={{ color }}>{Math.round(percentage)}%</span>
        <span className="score-ring-label">score</span>
      </div>
    </div>
  );
}

// Explanation button (inline toggle)
function ExplanationButton({ explanation }) {
  const [open, setOpen] = useState(false);
  if (!explanation) return null;
  return (
    <div style={{ marginTop: 8 }}>
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
        {open ? 'Hide explanation' : 'Explanation'}
      </button>
      {open && (
        <div className="explanation-panel" role="note" aria-label="Explanation">
          {explanation}
        </div>
      )}
    </div>
  );
}

// Mistake card
function MistakeCard({ mistake }) {
  return (
    <Card style={{ borderLeft: '3px solid var(--color-error)' }}>
      {mistake.topic && (
        <span className="badge badge-gray" style={{ marginBottom: 10, display: 'inline-block' }}>
          {mistake.topic}
        </span>
      )}
      <p style={{
        fontWeight: 600,
        color: 'var(--color-text)',
        marginBottom: 14,
        fontSize: 'var(--font-size-base)',
        lineHeight: 1.5,
      }}>
        {mistake.question}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
        <div style={{
          background: 'var(--color-error-light)',
          padding: '8px 14px',
          borderRadius: 'var(--radius-sm)',
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <span style={{ color: 'var(--color-error)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
            Your answer:
          </span>
          <span style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>
            {mistake.user_answer}
          </span>
        </div>
        <div style={{
          background: 'var(--color-success-light)',
          padding: '8px 14px',
          borderRadius: 'var(--radius-sm)',
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
            Correct answer:
          </span>
          <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-sm)' }}>
            {mistake.correct_answer}
          </span>
        </div>
      </div>
      <ExplanationButton explanation={mistake.explanation} />
    </Card>
  );
}

// Page
export default function QuizResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  let { evaluation, quizId, sourceType, sourceId, filename, isResumeItem, resumeItem } = location.state || {};
  
  quizId = quizId || searchParams.get('quizId');

  if (!evaluation && quizId) {
    const history = getQuizHistory();
    const historical = history.find(q => q.quizId === quizId);
    if (historical) {
      evaluation = {
         score: historical.score,
         total: historical.totalQuestions,
         percentage: historical.percentage,
         mistakes: historical.mistakes,
      };
      sourceType = historical.sourceType;
      sourceId = historical.sourceId;
      filename = historical.filename;
      isResumeItem = historical.sourceType === 'resume_item';
    }
  }

  if (!evaluation) {
    return (
      <div className="page-content">
        <PageHeader title="Quiz Results" />
        <Card>
          <p>No quiz results found. <Button variant="ghost" onClick={() => navigate('/quizzes')}>Take a quiz</Button></p>
        </Card>
      </div>
    );
  }

  const { score, total, percentage, mistakes } = evaluation;

  const feedbackText =
    percentage >= 80 ? 'Excellent work! You demonstrated strong proficiency on this interview topic.' :
    percentage >= 50 ? 'Good effort. A few areas need tightening before your interview.' :
    "This topic needs review. Check the explanations below to master these concepts.";

  const weakTopicsUrl = '/weak-topics';

  return (
    <div className="page-content">
      <PageHeader
        title={isResumeItem ? "Assessment Complete" : "Quiz Complete"}
        subtitle={
          isResumeItem
            ? ('Resume Assessment: ' + (filename || resumeItem?.name || 'Topic'))
            : sourceType === 'document' && filename
            ? ('Study material: ' + filename)
            : sourceType === 'topic' && sourceId
            ? ('Topic: ' + sourceId)
            : undefined
        }
      />

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
          <ScoreRing percentage={percentage} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 6 }}>
              {score} / {total} correct
            </h2>
            <p style={{ color: 'var(--color-muted)', marginBottom: 16 }}>{feedbackText}</p>
            <ProgressBar value={score} max={total} />
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
        {isResumeItem ? (
          <>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/resume-prep')}
            >
              ← Back to Resume Prep Queue
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/quizzes', {
                state: { resumeItem },
              })}
            >
              Retake Assessment
            </Button>
          </>
        ) : (
          <>
            {mistakes && mistakes.length > 0 && (
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate(weakTopicsUrl, {
                  state: { quizId, sourceType, sourceId, filename },
                })}
              >
                Practice Learning Gaps ({mistakes.length})
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => navigate('/quizzes', {
                state: {
                  source_type: sourceType,
                  source_id: sourceId,
                  filename,
                  quizId,
                  weakCount: mistakes ? mistakes.length : 0,
                },
              })}
            >
              Try Again
            </Button>
          </>
        )}
        <Button variant="ghost" onClick={() => navigate('/')}>Home</Button>
      </div>

      {mistakes && mistakes.length > 0 ? (
        <div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 16 }}>
            Review your mistakes ({mistakes.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mistakes.map((m) => (
              <MistakeCard key={m.question_id} mistake={m} />
            ))}
          </div>
        </div>
      ) : (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">*</div>
          <h3>Perfect score!</h3>
          <p>You answered every question correctly. Well done.</p>
        </Card>
      )}
    </div>
  );
}
