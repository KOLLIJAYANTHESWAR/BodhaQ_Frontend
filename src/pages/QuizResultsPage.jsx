import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getQuizHistory } from '../utils/storage.js';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import ProgressBar from '../components/common/ProgressBar.jsx';

// Score ring
function ScoreRing({ percentage }) {
  const safePercentage = Math.min(
    100,
    Math.max(0, Number.isFinite(Number(percentage)) ? Number(percentage) : 0)
  );

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dash = (safePercentage / 100) * circumference;

  const color =
    safePercentage >= 80
      ? 'var(--color-success)'
      : safePercentage >= 50
        ? 'var(--color-warning)'
        : 'var(--color-error)';

  return (
    <div className="score-ring" aria-hidden="true">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="10"
        />

        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${dash} ${circumference}`}
          strokeDashoffset="0"
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{
            transition: 'stroke-dasharray 0.6s ease',
          }}
        />
      </svg>

      <div className="score-ring-text">
        <span
          className="score-ring-percent"
          style={{ color }}
        >
          {Math.round(safePercentage)}%
        </span>

        <span className="score-ring-label">
          score
        </span>
      </div>
    </div>
  );
}

// Resolve option text from the various answer representations that may
// be returned by the quiz/evaluation flow.
function getOptionText(mistake, answerKey, explicitTextKey) {
  if (!mistake) return '';

  // Prefer an explicit answer-text field when available.
  const explicitText = mistake[explicitTextKey];

  if (
    typeof explicitText === 'string' &&
    explicitText.trim()
  ) {
    return explicitText.trim();
  }

  const answer = mistake[answerKey];

  if (
    answer === null ||
    answer === undefined ||
    answer === ''
  ) {
    return '';
  }

  // If the answer itself is already an object, support common shapes.
  if (typeof answer === 'object') {
    const objectText =
      answer.text ??
      answer.label ??
      answer.value ??
      answer.option ??
      answer.answer;

    if (
      typeof objectText === 'string' &&
      objectText.trim()
    ) {
      return objectText.trim();
    }
  }

  // Find the answer text inside the question's options/choices.
  const options =
    mistake.options ??
    mistake.choices ??
    mistake.answer_options ??
    mistake.answers;

  if (Array.isArray(options)) {
    const normalizedAnswer = String(answer)
      .trim()
      .toUpperCase();

    const matchedOption = options.find((option, index) => {
      if (option === null || option === undefined) {
        return false;
      }

      if (typeof option === 'string') {
        // Supports:
        // ["update", "insert", "select", "delete"]
        // and:
        // ["A. update", "B. insert", ...]
        const optionText = option.trim();

        const letter = String.fromCharCode(
          65 + index
        );

        return (
          normalizedAnswer === letter ||
          normalizedAnswer === optionText.toUpperCase() ||
          normalizedAnswer === optionText
            .replace(/^[A-Z][.)]\s*/i, '')
            .trim()
            .toUpperCase()
        );
      }

      if (typeof option === 'object') {
        const optionKey =
          option.id ??
          option.key ??
          option.label ??
          option.option ??
          String.fromCharCode(65 + index);

        const optionValue =
          option.text ??
          option.value ??
          option.answer ??
          option.content ??
          option.label;

        return (
          normalizedAnswer === String(optionKey)
            .trim()
            .toUpperCase() ||
          (
            typeof optionValue === 'string' &&
            normalizedAnswer === optionValue
              .trim()
              .toUpperCase()
          )
        );
      }

      return false;
    });

    if (matchedOption !== undefined) {
      if (typeof matchedOption === 'string') {
        return matchedOption
          .replace(/^[A-Z][.)]\s*/i, '')
          .trim();
      }

      if (typeof matchedOption === 'object') {
        const matchedText =
          matchedOption.text ??
          matchedOption.value ??
          matchedOption.answer ??
          matchedOption.content ??
          matchedOption.label;

        if (
          typeof matchedText === 'string' &&
          matchedText.trim()
        ) {
          return matchedText.trim();
        }
      }
    }
  }

  // Support options represented as an object:
  //
  // {
  //   A: "update",
  //   B: "insert",
  //   C: "select",
  //   D: "delete"
  // }
  if (
    options &&
    typeof options === 'object' &&
    !Array.isArray(options)
  ) {
    const normalizedAnswer = String(answer)
      .trim()
      .toUpperCase();

    const optionValue =
      options[answer] ??
      options[normalizedAnswer] ??
      options[
      normalizedAnswer.toLowerCase()
      ];

    if (typeof optionValue === 'string') {
      return optionValue.trim();
    }

    if (
      optionValue &&
      typeof optionValue === 'object'
    ) {
      const objectText =
        optionValue.text ??
        optionValue.value ??
        optionValue.answer ??
        optionValue.content ??
        optionValue.label;

      if (
        typeof objectText === 'string' &&
        objectText.trim()
      ) {
        return objectText.trim();
      }
    }
  }

  return '';
}

// Format an answer as:
//
// D — delete
//
// If the option text is unavailable, it safely falls back to:
//
// D
function formatAnswer(answer, answerText, fallback) {
  const answerValue =
    answer === null ||
      answer === undefined ||
      answer === ''
      ? fallback
      : String(answer);

  if (!answerText) {
    return answerValue;
  }

  return `${answerValue} — ${answerText}`;
}

// Explanation button (inline toggle)
function ExplanationButton({ explanation, id }) {
  const [open, setOpen] = useState(false);

  if (!explanation) return null;

  const explanationId = `explanation-${id}`;

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        className="explanation-btn"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={explanationId}
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

        {open ? 'Hide explanation' : 'Explanation'}
      </button>

      {open && (
        <div
          id={explanationId}
          className="explanation-panel"
          role="note"
          aria-label="Explanation"
        >
          {explanation}
        </div>
      )}
    </div>
  );
}

// Mistake card
function MistakeCard({ mistake, index }) {
  if (!mistake) return null;

  const userAnswerText = getOptionText(
    mistake,
    'user_answer',
    'user_answer_text'
  );

  const correctAnswerText = getOptionText(
    mistake,
    'correct_answer',
    'correct_answer_text'
  );

  const formattedUserAnswer = formatAnswer(
    mistake.user_answer,
    userAnswerText,
    'No answer'
  );

  const formattedCorrectAnswer = formatAnswer(
    mistake.correct_answer,
    correctAnswerText,
    'Unavailable'
  );

  return (
    <Card
      style={{
        borderLeft: '3px solid var(--color-error)',
      }}
    >
      {mistake.topic && (
        <span
          className="badge badge-gray"
          style={{
            marginBottom: 10,
            display: 'inline-block',
          }}
        >
          {mistake.topic}
        </span>
      )}

      <p
        style={{
          fontWeight: 600,
          color: 'var(--color-text)',
          marginBottom: 14,
          fontSize: 'var(--font-size-base)',
          lineHeight: 1.5,
        }}
      >
        {mistake.question || 'Question unavailable'}
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
            background: 'var(--color-error-light)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
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
            {formattedUserAnswer}
          </span>
        </div>

        <div
          style={{
            background: 'var(--color-success-light)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
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
            {formattedCorrectAnswer}
          </span>
        </div>
      </div>

      <ExplanationButton
        explanation={mistake.explanation}
        id={mistake.question_id || index}
      />
    </Card>
  );
}

// Page
export default function QuizResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  let {
    evaluation,
    quizId,
    sourceType,
    sourceId,
    filename,
    isResumeItem,
    resumeItem,
  } = location.state || {};

  quizId =
    quizId ||
    searchParams.get('quizId') ||
    searchParams.get('quiz_id');

  // Restore results from local history when the page is opened directly.
  if (!evaluation && quizId) {
    const history = getQuizHistory();

    const historical = Array.isArray(history)
      ? history.find(
        (quiz) => quiz?.quizId === quizId
      )
      : null;

    if (historical) {
      const historicalTotal =
        historical.total ??
        historical.totalQuestions ??
        0;

      evaluation = {
        score: Number(historical.score) || 0,
        total: Number(historicalTotal) || 0,
        percentage: Number(historical.percentage) || 0,
        mistakes: Array.isArray(historical.mistakes)
          ? historical.mistakes
          : [],
      };

      sourceType = historical.sourceType;
      sourceId = historical.sourceId;
      filename = historical.filename;
      isResumeItem =
        historical.sourceType === 'resume_item';
    }
  }

  if (!evaluation) {
    return (
      <div className="page-content">
        <PageHeader title="Quiz Results" />

        <Card>
          <p>
            No quiz results found.{' '}
            <Button
              variant="ghost"
              onClick={() => navigate('/quizzes')}
            >
              Take a quiz
            </Button>
          </p>
        </Card>
      </div>
    );
  }

  const score = Number(evaluation.score) || 0;

  const total =
    Number(evaluation.total) ||
    Number(evaluation.totalQuestions) ||
    0;

  const mistakes = Array.isArray(evaluation.mistakes)
    ? evaluation.mistakes
    : [];

  const calculatedPercentage =
    total > 0
      ? (score / total) * 100
      : 0;

  const percentage = Number.isFinite(
    Number(evaluation.percentage)
  )
    ? Number(evaluation.percentage)
    : calculatedPercentage;

  const safePercentage = Math.min(
    100,
    Math.max(0, percentage)
  );

  const feedbackText =
    safePercentage >= 80
      ? 'Excellent work! You demonstrated strong understanding of this material.'
      : safePercentage >= 50
        ? 'Good effort. Review the areas you missed to strengthen your understanding.'
        : 'This topic needs review. Check the explanations below to strengthen these concepts.';

  const weakTopicsUrl = '/weak-topics';

  return (
    <div className="page-content">
      <PageHeader
        title={
          isResumeItem
            ? 'Assessment Complete'
            : 'Quiz Complete'
        }
        subtitle={
          isResumeItem
            ? `Resume Assessment: ${filename ||
            resumeItem?.name ||
            'Topic'
            }`
            : sourceType === 'document' && filename
              ? `Study material: ${filename}`
              : sourceType === 'topic' && sourceId
                ? `Topic: ${sourceId}`
                : undefined
        }
      />

      <Card style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            flexWrap: 'wrap',
          }}
        >
          <ScoreRing percentage={safePercentage} />

          <div
            style={{
              flex: 1,
              minWidth: 200,
            }}
          >
            <h2
              style={{
                fontSize: 'var(--font-size-2xl)',
                marginBottom: 6,
              }}
            >
              {score} / {total} correct
            </h2>

            <p
              style={{
                color: 'var(--color-muted)',
                marginBottom: 16,
              }}
            >
              {feedbackText}
            </p>

            <ProgressBar
              value={score}
              max={Math.max(total, 1)}
            />
          </div>
        </div>
      </Card>

      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 32,
          flexWrap: 'wrap',
        }}
      >
        {isResumeItem ? (
          <>
            <Button
              variant="primary"
              size="lg"
              onClick={() =>
                navigate('/resume-prep')
              }
            >
              ← Back to Resume Prep Queue
            </Button>

            <Button
              variant="secondary"
              onClick={() =>
                navigate('/quizzes', {
                  state: {
                    resumeItem,
                  },
                })
              }
            >
              Retake Assessment
            </Button>
          </>
        ) : (
          <>
            {mistakes.length > 0 && (
              <Button
                variant="primary"
                size="lg"
                onClick={() =>
                  navigate(weakTopicsUrl, {
                    state: {
                      quizId,
                      sourceType,
                      sourceId,
                      filename,
                    },
                  })
                }
              >
                Practice Learning Gaps ({mistakes.length})
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={() =>
                navigate('/quizzes', {
                  state: {
                    source_type: sourceType,
                    source_id: sourceId,
                    filename,
                    quizId,
                    weakCount: mistakes.length,
                  },
                })
              }
            >
              Try Again
            </Button>
          </>
        )}

        <Button
          variant="ghost"
          onClick={() => navigate('/')}
        >
          Home
        </Button>
      </div>

      {mistakes.length > 0 ? (
        <div>
          <h2
            style={{
              fontSize: 'var(--font-size-xl)',
              marginBottom: 16,
            }}
          >
            Review your mistakes ({mistakes.length})
          </h2>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {mistakes.map((mistake, index) => (
              <MistakeCard
                key={
                  mistake?.question_id ||
                  `mistake-${index}`
                }
                mistake={mistake}
                index={index}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card
          style={{
            textAlign: 'center',
            padding: 40,
          }}
        >
          <div
            style={{
              fontSize: 48,
              marginBottom: 12,
            }}
            aria-hidden="true"
          >
            ✓
          </div>

          <h3>Perfect score!</h3>

          <p>
            You answered every question correctly.
            Well done.
          </p>
        </Card>
      )}
    </div>
  );
}
