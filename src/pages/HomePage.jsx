import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import PageHeader from '../components/common/PageHeader.jsx';

// SVG icon helpers
function IconUpload() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}

function StepBadge({ step, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'var(--color-primary-light)',
        color: 'var(--color-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 'var(--font-size-sm)',
        border: '2px solid var(--color-primary-muted)',
        flexShrink: 0,
      }}>
        {step}
      </div>
      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.3 }}>
        {label}
      </span>
    </div>
  );
}

function LearningLoopRow() {
  const steps = ['Study', 'Assess', 'Evaluate', 'Understand', 'Find Gaps', 'Practice', 'Improve'];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, overflow: 'hidden' }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
          <StepBadge step={i + 1} label={s} />
          {i < steps.length - 1 && (
            <div style={{ width: 16, height: 1, background: 'var(--color-border)', flexShrink: 0, marginBottom: 18 }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');

  function handleLearnTopic(e) {
    e.preventDefault();
    const t = topic.trim();
    if (!t) return;
    navigate(`/study?topic=${encodeURIComponent(t)}`);
  }

  return (
    <div className="page-content">
      {/* Hero */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ marginBottom: 8 }}>
          <span className="badge badge-blue">AI-powered learning</span>
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', marginBottom: 16, lineHeight: 1.2 }}>
          Turn anything you study into an<br />
          <span style={{ color: 'var(--color-primary)' }}>interactive learning experience.</span>
        </h1>
        <p style={{ fontSize: 'var(--font-size-lg)', maxWidth: 560, color: 'var(--color-muted)', lineHeight: 1.7 }}>
          Upload your notes or enter a topic. BodhaQ helps you understand, test,
          identify learning gaps, and practice them.
        </p>
      </div>

      {/* Learning loop */}
      <Card style={{ marginBottom: 32, background: 'var(--color-surface-2)', border: 'none' }}>
        <p className="text-muted" style={{ marginBottom: 12, fontWeight: 600, fontSize: 'var(--font-size-xs)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          The BodhaQ learning loop
        </p>
        <LearningLoopRow />
      </Card>

      {/* Action cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        {/* Topic card */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, background: 'var(--color-primary-light)',
              borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--color-primary)',
            }}>
              <IconBook />
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 2 }}>Learn a Topic</h2>
              <p style={{ fontSize: 'var(--font-size-sm)', margin: 0 }}>Enter any subject to start</p>
            </div>
          </div>
          <form onSubmit={handleLearnTopic}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label htmlFor="home-topic-input" className="form-label">What do you want to learn?</label>
              <input
                id="home-topic-input"
                type="text"
                className="form-input"
                placeholder="e.g. Java HashMap, Photosynthesis, WWI causes…"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                autoComplete="off"
              />
            </div>
            <Button type="submit" variant="primary" className="w-full" disabled={!topic.trim()}>
              Start Learning
            </Button>
          </form>
        </Card>

        {/* Upload card */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, background: 'var(--color-primary-light)',
              borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--color-primary)',
            }}>
              <IconUpload />
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 2 }}>Upload Material</h2>
              <p style={{ fontSize: 'var(--font-size-sm)', margin: 0 }}>PDF, PPTX, or DOCX</p>
            </div>
          </div>
          <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 16 }}>
            Upload lecture slides, textbook chapters, or notes. BodhaQ will index your material and let you study, quiz, and ask questions about it.
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
        <h3 style={{ marginBottom: 16, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Quick actions</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/quizzes')}>
            Take a Quiz
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/doubts')}>
            Ask a Doubt
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/practice')}>
            Practice Weak Topics
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/materials')}>
            View Materials
          </Button>
        </div>
      </Card>

      <style>{`
        @media (max-width: 600px) {
          .home-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
