import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { learnTopic } from '../api/learningApi.js';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import { LoadingSteps } from '../components/common/Spinner.jsx';

const LOADING_STEPS = [
  'Understanding your topic…',
  'Preparing key concepts…',
  'Creating an example…',
  'Organising important points…',
];

function ConceptTag({ label }) {
  return <span className="tag">{label}</span>;
}

export default function StudyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTopic = searchParams.get('topic') || '';

  const [topicInput, setTopicInput] = useState(initialTopic);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialTopic) {
      startLearning(initialTopic);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function startLearning(topic) {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setContent(null);
    setLoadingStep(0);

    // Animate steps for UX
    const stepInterval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 900);

    try {
      const data = await learnTopic(topic.trim());
      setContent(data);
    } catch (err) {
      setError(err.message || 'Failed to load learning content.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    startLearning(topicInput);
  }

  return (
    <div className="page-content">
      <PageHeader title="Study" subtitle="Enter a topic to generate structured learning content." />

      {/* Topic input */}
      <Card style={{ marginBottom: 24 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="study-topic" className="form-label">Topic</label>
            <input
              id="study-topic"
              type="text"
              className="form-input"
              placeholder="e.g. Java HashMap, Mitosis, World War II…"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
            />
          </div>
          <Button type="submit" variant="primary" loading={loading} disabled={!topicInput.trim()}>
            Learn Topic
          </Button>
        </form>
      </Card>

      {/* Loading */}
      {loading && (
        <LoadingSteps steps={LOADING_STEPS} currentStep={loadingStep} />
      )}

      {/* Error */}
      {error && !loading && (
        <ErrorState
          title="Couldn't load topic"
          message={error}
          onRetry={() => startLearning(topicInput)}
        />
      )}

      {/* Content */}
      {content && !loading && (
        <div>
          {/* Topic title */}
          <div style={{ marginBottom: 24 }}>
            <span className="badge badge-blue" style={{ marginBottom: 8 }}>Study Material</span>
            <h1 style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 8 }}>{content.topic}</h1>
            <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-secondary)' }}>
              {content.definition}
            </p>
          </div>

          {/* Key concepts */}
          <Card style={{ marginBottom: 16 }}>
            <h2 className="section-title" style={{ fontSize: 'var(--font-size-lg)', marginBottom: 12 }}>
              Key Concepts
            </h2>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {content.key_concepts.map((concept, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'var(--color-primary-muted)',
                    color: 'var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--font-size-xs)', fontWeight: 700, flexShrink: 0, marginTop: 1
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{concept}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Example */}
          {content.example && (
            <Card style={{ marginBottom: 16 }}>
              <h2 className="section-title" style={{ fontSize: 'var(--font-size-lg)', marginBottom: 12 }}>
                Example
              </h2>
              {/* eslint-disable-next-line react/jsx-curly-brace-presence */}
              <pre className="code-block" style={{ marginBottom: 16 }}><code>{content.example.code}</code></pre>
              <div style={{
                background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.7,
              }}>
                <strong style={{ color: 'var(--color-text)', display: 'block', marginBottom: 4 }}>Explanation</strong>
                {content.example.explanation}
              </div>
            </Card>
          )}

          {/* Important points */}
          {content.important_points?.length > 0 && (
            <Card style={{ marginBottom: 24 }}>
              <h2 className="section-title" style={{ fontSize: 'var(--font-size-lg)', marginBottom: 12 }}>
                Important Points
              </h2>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {content.important_points.map((point, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--color-primary)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✦</span>
                    <span style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{point}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate(`/quizzes?source_type=topic&source_id=${encodeURIComponent(content.topic)}`)}
            >
              Take Quiz
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`/doubts?context=general&prefill=${encodeURIComponent(content.topic)}`)}
            >
              Ask a Doubt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
