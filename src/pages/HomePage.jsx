import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';

// SVG icon helpers
function IconUpload() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}

function StepBadge({ step, label }) {
  return (
    <div
      className="home-step-badge"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        flex: '1 1 0',
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 'var(--font-size-sm)',
          border: '2px solid var(--color-primary-muted)',
          flexShrink: 0,
        }}
        aria-label={`Step ${step}: ${label}`}
      >
        {step}
      </div>

      <span
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-muted)',
          textAlign: 'center',
          lineHeight: 1.3,
          whiteSpace: 'normal',
        }}
      >
        {label}
      </span>
    </div>
  );
}

function LearningLoopRow() {
  const steps = [
    'Study',
    'Assess',
    'Evaluate',
    'Understand',
    'Find Gaps',
    'Practice',
    'Improve',
  ];

  return (
    <div
      className="home-learning-loop"
      aria-label="BodhaQ learning loop"
    >
      {steps.map((step, index) => (
        <div
          key={step}
          className="home-learning-loop-item"
        >
          <StepBadge
            step={index + 1}
            label={step}
          />

          {index < steps.length - 1 && (
            <div
              className="home-learning-loop-connector"
              aria-hidden="true"
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  const [topic, setTopic] = useState('');

  function handleLearnTopic(event) {
    event.preventDefault();

    const trimmedTopic = topic.trim();

    if (!trimmedTopic) {
      return;
    }

    navigate(
      `/study?topic=${encodeURIComponent(trimmedTopic)}`
    );
  }

  function handleTopicChange(event) {
    setTopic(event.target.value);
  }

  return (
    <div className="page-content home-page">
      {/* Hero */}
      <section
        className="home-hero"
        aria-labelledby="home-page-title"
      >
        <div style={{ marginBottom: 8 }}>
          <span className="badge badge-blue">
            AI-powered learning
          </span>
        </div>

        <h1
          id="home-page-title"
          style={{
            fontSize: 'clamp(28px, 5vw, 40px)',
            marginBottom: 16,
            lineHeight: 1.2,
          }}
        >
          Turn anything you study into an
          <br />
          <span
            style={{
              color: 'var(--color-primary)',
            }}
          >
            interactive learning experience.
          </span>
        </h1>

        <p
          style={{
            fontSize: 'var(--font-size-lg)',
            maxWidth: 560,
            color: 'var(--color-muted)',
            lineHeight: 1.7,
            marginBottom: 0,
          }}
        >
          Upload your notes or enter a topic. BodhaQ helps you
          understand, test, identify learning gaps, and practice
          them.
        </p>
      </section>

      {/* Learning loop */}
      <Card
        style={{
          marginBottom: 32,
          background: 'var(--color-surface-2)',
          border: 'none',
        }}
      >
        <p
          className="text-muted"
          style={{
            marginBottom: 12,
            fontWeight: 600,
            fontSize: 'var(--font-size-xs)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          The BodhaQ learning loop
        </p>

        <LearningLoopRow />
      </Card>

      {/* Action cards */}
      <div
        className="home-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-8)',
        }}
      >
        {/* Topic card */}
        <Card>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background:
                  'var(--color-primary-light)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
                flexShrink: 0,
              }}
            >
              <IconBook />
            </div>

            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  fontSize: 'var(--font-size-lg)',
                  marginBottom: 2,
                }}
              >
                Learn a Topic
              </h2>

              <p
                style={{
                  fontSize: 'var(--font-size-sm)',
                  margin: 0,
                  color: 'var(--color-muted)',
                }}
              >
                Enter any subject to start
              </p>
            </div>
          </div>

          <form
            onSubmit={handleLearnTopic}
            noValidate
          >
            <div
              className="form-group"
              style={{ marginBottom: 12 }}
            >
              <label
                htmlFor="home-topic-input"
                className="form-label"
              >
                What do you want to learn?
              </label>

              <input
                id="home-topic-input"
                name="topic"
                type="text"
                className="form-input"
                placeholder="e.g. Java HashMap, Photosynthesis, WWI causes…"
                value={topic}
                onChange={handleTopicChange}
                autoComplete="off"
                maxLength={200}
                spellCheck="true"
                aria-describedby="home-topic-help"
              />

              <span
                id="home-topic-help"
                className="sr-only"
              >
                Enter a topic with up to 200 characters.
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={!topic.trim()}
              aria-label="Start learning about this topic"
            >
              Start Learning
            </Button>
          </form>
        </Card>

        {/* Upload card */}
        <Card>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background:
                  'var(--color-primary-light)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
                flexShrink: 0,
              }}
            >
              <IconUpload />
            </div>

            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  fontSize: 'var(--font-size-lg)',
                  marginBottom: 2,
                }}
              >
                Upload Material
              </h2>

              <p
                style={{
                  fontSize: 'var(--font-size-sm)',
                  margin: 0,
                  color: 'var(--color-muted)',
                }}
              >
                PDF, PPTX, or DOCX
              </p>
            </div>
          </div>

          <p
            style={{
              color: 'var(--color-muted)',
              fontSize: 'var(--font-size-sm)',
              marginBottom: 16,
              lineHeight: 1.6,
            }}
          >
            Upload lecture slides, textbook chapters, or notes.
            BodhaQ will index your material and let you study,
            quiz, and ask questions about it.
          </p>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigate('/materials')}
          >
            Go to Materials
          </Button>
        </Card>
      </div>

      {/* Quick access */}
      <Card>
        <h3
          style={{
            marginBottom: 16,
            fontSize: 'var(--font-size-base)',
            fontWeight: 600,
          }}
        >
          Quick actions
        </h3>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/quizzes')}
          >
            Take a Quiz
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/doubts')}
          >
            Ask a Doubt
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/practice')}
          >
            Practice Weak Topics
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/materials')}
          >
            View Materials
          </Button>
        </div>
      </Card>

      {/* Page-specific responsive styles */}
      <style>{`
        .home-learning-loop {
          display: flex;
          align-items: flex-start;
          width: 100%;
          gap: 8px;
        }

        .home-learning-loop-item {
          display: flex;
          align-items: flex-start;
          gap: 4px;
          flex: 1 1 0;
          min-width: 0;
        }

        .home-learning-loop-connector {
          width: 16px;
          height: 1px;
          margin-top: 16px;
          background: var(--color-border);
          flex: 0 0 16px;
        }

        @media (max-width: 900px) {
          .home-learning-loop {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            row-gap: 20px;
          }

          .home-learning-loop-item {
            min-width: 0;
          }

          .home-learning-loop-connector {
            display: none;
          }
        }

        @media (max-width: 600px) {
          .home-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .home-learning-loop {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px 12px;
          }

          .home-hero h1 {
            font-size: clamp(28px, 9vw, 36px) !important;
          }

          .home-hero h1 br {
            display: none;
          }
        }

        @media (max-width: 360px) {
          .home-learning-loop {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
}