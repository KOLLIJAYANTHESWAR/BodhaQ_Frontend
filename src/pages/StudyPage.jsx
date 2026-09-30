import { useState, useEffect, useRef } from 'react';
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
  'Finding useful learning resources…',
  'Finding learning videos…',
];

const STUDY_TABS = [
  {
    id: 'explain',
    label: 'Explain',
  },
  {
    id: 'resources',
    label: 'Resources',
  },
  {
    id: 'videos',
    label: 'Videos',
  },
];

function getSafeExternalUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);

    if (
      url.protocol !== 'https:' &&
      url.protocol !== 'http:'
    ) {
      return '';
    }

    return url.toString();
  } catch {
    return '';
  }
}

function getSafeText(value) {
  return typeof value === 'string'
    ? value.trim()
    : '';
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
  const [activeTab, setActiveTab] = useState('explain');

  const stepIntervalRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (initialTopic) {
      startLearning(initialTopic);
    }

    return () => {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
        stepIntervalRef.current = null;
      }

      requestIdRef.current += 1;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function clearLoadingInterval() {
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
  }

  async function startLearning(topicValue) {
    const trimmedTopic =
      typeof topicValue === 'string'
        ? topicValue.trim()
        : '';

    if (!trimmedTopic || loading) {
      return;
    }

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    setContent(null);
    setLoadingStep(0);
    setActiveTab('explain');

    clearLoadingInterval();

    stepIntervalRef.current = setInterval(() => {
      setLoadingStep((currentStep) =>
        Math.min(
          currentStep + 1,
          LOADING_STEPS.length - 1
        )
      );
    }, 900);

    try {
      const data = await learnTopic(trimmedTopic);

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!data || typeof data !== 'object') {
        throw new Error(
          'The learning service returned an invalid response.'
        );
      }

      setContent(data);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setError(
        err?.message ||
        'Failed to load learning content.'
      );
    } finally {
      if (requestId === requestIdRef.current) {
        clearLoadingInterval();
        setLoading(false);
      }
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    startLearning(topicInput);
  }

  function handleTabKeyDown(event, currentIndex) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();

      const nextIndex =
        (currentIndex + 1) % STUDY_TABS.length;

      setActiveTab(STUDY_TABS[nextIndex].id);

      document
        .getElementById(
          `study-tab-${STUDY_TABS[nextIndex].id}`
        )
        ?.focus();
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();

      const previousIndex =
        (currentIndex - 1 + STUDY_TABS.length) %
        STUDY_TABS.length;

      setActiveTab(STUDY_TABS[previousIndex].id);

      document
        .getElementById(
          `study-tab-${STUDY_TABS[previousIndex].id}`
        )
        ?.focus();
    }

    if (event.key === 'Home') {
      event.preventDefault();

      setActiveTab(STUDY_TABS[0].id);

      document
        .getElementById(
          `study-tab-${STUDY_TABS[0].id}`
        )
        ?.focus();
    }

    if (event.key === 'End') {
      event.preventDefault();

      const lastTab =
        STUDY_TABS[STUDY_TABS.length - 1];

      setActiveTab(lastTab.id);

      document
        .getElementById(`study-tab-${lastTab.id}`)
        ?.focus();
    }
  }

  const keyConcepts = Array.isArray(
    content?.key_concepts
  )
    ? content.key_concepts.filter(
      (concept) =>
        typeof concept === 'string' &&
        concept.trim()
    )
    : [];

  const importantPoints = Array.isArray(
    content?.important_points
  )
    ? content.important_points.filter(
      (point) =>
        typeof point === 'string' &&
        point.trim()
    )
    : [];

  const resources = Array.isArray(
    content?.resources
  )
    ? content.resources.filter(
      (resource) =>
        resource &&
        typeof resource === 'object'
    )
    : [];

  const videos = Array.isArray(
    content?.videos
  )
    ? content.videos.filter(
      (video) =>
        video &&
        typeof video === 'object'
    )
    : [];

  const example =
    content?.example &&
      typeof content.example === 'object'
      ? content.example
      : null;

  const topic =
    typeof content?.topic === 'string' &&
      content.topic.trim()
      ? content.topic.trim()
      : topicInput.trim();

  const definition =
    typeof content?.definition === 'string'
      ? content.definition.trim()
      : '';

  return (
    <div className="page-content">
      <PageHeader
        title="Study"
        subtitle="Enter a topic to generate structured learning content."
      />

      {/* Topic input */}
      <Card style={{ marginBottom: 24 }}>
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-end',
          }}
        >
          <div
            className="form-group"
            style={{
              flex: 1,
              marginBottom: 0,
            }}
          >
            <label
              htmlFor="study-topic"
              className="form-label"
            >
              Topic
            </label>

            <input
              id="study-topic"
              type="text"
              className="form-input"
              placeholder="e.g. Java HashMap, Mitosis, World War II…"
              value={topicInput}
              onChange={(event) =>
                setTopicInput(event.target.value)
              }
              disabled={loading}
              maxLength={200}
              autoComplete="off"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={
              !topicInput.trim() || loading
            }
          >
            Learn Topic
          </Button>
        </form>
      </Card>

      {/* Loading */}
      {loading && (
        <LoadingSteps
          steps={LOADING_STEPS}
          currentStep={loadingStep}
        />
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
            <span
              className="badge badge-blue"
              style={{ marginBottom: 8 }}
            >
              Study Material
            </span>

            <h1
              style={{
                fontSize:
                  'var(--font-size-3xl)',
                marginBottom: 8,
              }}
            >
              {topic || 'Study Topic'}
            </h1>

            {definition && (
              <p
                style={{
                  fontSize:
                    'var(--font-size-lg)',
                  color:
                    'var(--color-text-secondary)',
                }}
              >
                {definition}
              </p>
            )}
          </div>

          {/* Study tabs */}
          <div
            role="tablist"
            aria-label="Study sections"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              marginBottom: 24,
              borderBottom:
                '1px solid var(--color-border)',
              overflowX: 'auto',
            }}
          >
            {STUDY_TABS.map((tab, index) => {
              const isActive =
                activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  id={`study-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`study-panel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() =>
                    setActiveTab(tab.id)
                  }
                  onKeyDown={(event) =>
                    handleTabKeyDown(event, index)
                  }
                  style={{
                    border: 'none',
                    borderBottom: isActive
                      ? '2px solid var(--color-primary)'
                      : '2px solid transparent',
                    background: 'transparent',
                    color: isActive
                      ? 'var(--color-primary)'
                      : 'var(--color-text-secondary)',
                    padding: '10px 16px',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: isActive ? 700 : 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    marginBottom: -1,
                    textAlign: 'center',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ============================================================= */}
          {/* EXPLAIN TAB                                                   */}
          {/* ============================================================= */}

          {activeTab === 'explain' && (
            <div
              id="study-panel-explain"
              role="tabpanel"
              aria-labelledby="study-tab-explain"
              tabIndex={0}
            >
              {/* Key concepts */}
              {keyConcepts.length > 0 && (
                <Card style={{ marginBottom: 16 }}>
                  <h2
                    className="section-title"
                    style={{
                      fontSize:
                        'var(--font-size-lg)',
                      marginBottom: 12,
                    }}
                  >
                    Key Concepts
                  </h2>

                  <ul
                    style={{
                      listStyle: 'none',
                      display: 'flex',
                      flexDirection:
                        'column',
                      gap: 10,
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    {keyConcepts.map(
                      (concept, index) => (
                        <li
                          key={`${concept}-${index}`}
                          style={{
                            display: 'flex',
                            alignItems:
                              'flex-start',
                            gap: 12,
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius:
                                '50%',
                              background:
                                'var(--color-primary-muted)',
                              color:
                                'var(--color-primary)',
                              display: 'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center',
                              fontSize:
                                'var(--font-size-xs)',
                              fontWeight: 700,
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          >
                            {index + 1}
                          </span>

                          <span
                            style={{
                              color:
                                'var(--color-text-secondary)',
                              lineHeight: 1.6,
                            }}
                          >
                            {concept}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </Card>
              )}

              {/* Example */}
              {example && (
                <Card style={{ marginBottom: 16 }}>
                  <h2
                    className="section-title"
                    style={{
                      fontSize:
                        'var(--font-size-lg)',
                      marginBottom: 12,
                    }}
                  >
                    Example
                  </h2>

                  {typeof example.code ===
                    'string' &&
                    example.code.trim() && (
                      <pre
                        className="code-block"
                        style={{
                          marginBottom: 16,
                          overflowX: 'auto',
                          background:
                            'var(--color-code-bg)',
                          color:
                            'var(--color-code-text, var(--color-text))',
                        }}
                      >
                        <code
                          style={{
                            color:
                              'var(--color-code-text, var(--color-text))',
                          }}
                        >
                          {example.code}
                        </code>
                      </pre>
                    )}

                  {typeof example.explanation ===
                    'string' &&
                    example.explanation.trim() && (
                      <div
                        style={{
                          background:
                            'var(--color-surface-2)',
                          borderRadius:
                            'var(--radius-md)',
                          padding:
                            '12px 16px',
                          fontSize:
                            'var(--font-size-sm)',
                          color:
                            'var(--color-text-secondary)',
                          lineHeight: 1.7,
                        }}
                      >
                        <strong
                          style={{
                            color:
                              'var(--color-text)',
                            display: 'block',
                            marginBottom: 4,
                          }}
                        >
                          Explanation
                        </strong>

                        {example.explanation}
                      </div>
                    )}
                </Card>
              )}

              {/* Important points */}
              {importantPoints.length > 0 && (
                <Card style={{ marginBottom: 24 }}>
                  <h2
                    className="section-title"
                    style={{
                      fontSize:
                        'var(--font-size-lg)',
                      marginBottom: 12,
                    }}
                  >
                    Important Points
                  </h2>

                  <ul
                    style={{
                      listStyle: 'none',
                      display: 'flex',
                      flexDirection:
                        'column',
                      gap: 8,
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    {importantPoints.map(
                      (point, index) => (
                        <li
                          key={`${point}-${index}`}
                          style={{
                            display: 'flex',
                            gap: 10,
                            alignItems:
                              'flex-start',
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              color:
                                'var(--color-primary)',
                              fontWeight: 700,
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          >
                            ✦
                          </span>

                          <span
                            style={{
                              color:
                                'var(--color-text-secondary)',
                              lineHeight: 1.6,
                            }}
                          >
                            {point}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </Card>
              )}

              {/* Explain empty state */}
              {!definition &&
                keyConcepts.length === 0 &&
                !example &&
                importantPoints.length === 0 && (
                  <Card
                    style={{
                      marginBottom: 24,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color:
                          'var(--color-text-secondary)',
                      }}
                    >
                      No explanation content
                      was returned for this
                      topic.
                    </p>
                  </Card>
                )}

              {/* CTAs */}
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={() =>
                    navigate(
                      `/quizzes?source_type=topic&source_id=${encodeURIComponent(
                        topic
                      )}`
                    )
                  }
                  disabled={!topic}
                >
                  Take Quiz
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    navigate(
                      `/doubts?context=general&prefill=${encodeURIComponent(
                        topic
                      )}`
                    )
                  }
                  disabled={!topic}
                >
                  Ask a Doubt
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* RESOURCES TAB                                                 */}
          {/* ============================================================= */}

          {activeTab === 'resources' && (
            <div
              id="study-panel-resources"
              role="tabpanel"
              aria-labelledby="study-tab-resources"
              tabIndex={0}
            >
              {resources.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection:
                      'column',
                    gap: 16,
                  }}
                >
                  {resources.map(
                    (resource, index) => {
                      const title =
                        getSafeText(
                          resource.title
                        ) ||
                        'Learning Resource';

                      const url =
                        getSafeExternalUrl(
                          resource.url
                        );

                      const description =
                        getSafeText(
                          resource.description
                        );

                      const resourceType =
                        getSafeText(
                          resource.resource_type
                        );

                      const domain =
                        getSafeText(
                          resource.domain
                        );

                      return (
                        <Card
                          key={`${url || title}-${index}`}
                        >
                          <div
                            style={{
                              display: 'flex',
                              flexDirection:
                                'column',
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent:
                                  'space-between',
                                alignItems:
                                  'flex-start',
                                gap: 16,
                              }}
                            >
                              <div
                                style={{
                                  minWidth: 0,
                                  flex: 1,
                                }}
                              >
                                <h2
                                  className="section-title"
                                  style={{
                                    fontSize:
                                      'var(--font-size-lg)',
                                    marginBottom: 6,
                                  }}
                                >
                                  {title}
                                </h2>

                                {domain && (
                                  <div
                                    style={{
                                      color:
                                        'var(--color-text-secondary)',
                                      fontSize:
                                        'var(--font-size-sm)',
                                    }}
                                  >
                                    {domain}
                                  </div>
                                )}
                              </div>

                              {resourceType && (
                                <span
                                  className="badge badge-blue"
                                  style={{
                                    flexShrink: 0,
                                    textTransform:
                                      'capitalize',
                                  }}
                                >
                                  {resourceType.replace(
                                    /_/g,
                                    ' '
                                  )}
                                </span>
                              )}
                            </div>

                            {description && (
                              <p
                                style={{
                                  margin: 0,
                                  color:
                                    'var(--color-text-secondary)',
                                  lineHeight: 1.6,
                                }}
                              >
                                {description}
                              </p>
                            )}

                            {url && (
                              <div
                                style={{
                                  marginTop: 4,
                                }}
                              >
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Open ${title} in a new tab`}
                                  style={{
                                    color:
                                      'var(--color-primary)',
                                    fontWeight: 600,
                                    textDecoration:
                                      'none',
                                    wordBreak:
                                      'break-word',
                                  }}
                                >
                                  Open Resource ↗
                                </a>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    }
                  )}
                </div>
              ) : (
                <Card>
                  <h2
                    className="section-title"
                    style={{
                      fontSize:
                        'var(--font-size-lg)',
                      marginBottom: 8,
                    }}
                  >
                    No Resources Found
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      color:
                        'var(--color-text-secondary)',
                      lineHeight: 1.6,
                    }}
                  >
                    No external learning resources
                    are currently available for
                    this topic. You can still use
                    the Explain section to study
                    the topic.
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* VIDEOS TAB                                                    */}
          {/* ============================================================= */}

          {activeTab === 'videos' && (
            <div
              id="study-panel-videos"
              role="tabpanel"
              aria-labelledby="study-tab-videos"
              tabIndex={0}
            >
              {videos.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection:
                      'column',
                    gap: 16,
                  }}
                >
                  {videos.map(
                    (video, index) => {
                      const title =
                        getSafeText(
                          video.title
                        ) ||
                        'Learning Video';

                      const url =
                        getSafeExternalUrl(
                          video.url
                        );

                      const description =
                        getSafeText(
                          video.description
                        );

                      const channel =
                        getSafeText(
                          video.channel
                        );

                      const duration =
                        getSafeText(
                          video.duration
                        );

                      const thumbnail =
                        getSafeExternalUrl(
                          video.thumbnail
                        );

                      return (
                        <Card
                          key={`${url || title}-${index}`}
                        >
                          <div
                            style={{
                              display: 'flex',
                              gap: 16,
                              alignItems:
                                'flex-start',
                            }}
                          >
                            {thumbnail && (
                              <img
                                src={thumbnail}
                                alt=""
                                loading="lazy"
                                onError={(
                                  event
                                ) => {
                                  event.currentTarget.style.display =
                                    'none';
                                }}
                                style={{
                                  width: 180,
                                  maxWidth:
                                    '30%',
                                  aspectRatio:
                                    '16 / 9',
                                  objectFit:
                                    'cover',
                                  borderRadius:
                                    'var(--radius-md)',
                                  flexShrink: 0,
                                }}
                              />
                            )}

                            <div
                              style={{
                                minWidth: 0,
                                flex: 1,
                              }}
                            >
                              <h2
                                className="section-title"
                                style={{
                                  fontSize:
                                    'var(--font-size-lg)',
                                  marginBottom: 6,
                                }}
                              >
                                {title}
                              </h2>

                              {(channel ||
                                duration) && (
                                  <div
                                    style={{
                                      display:
                                        'flex',
                                      gap: 12,
                                      flexWrap:
                                        'wrap',
                                      marginBottom: 8,
                                      color:
                                        'var(--color-text-secondary)',
                                      fontSize:
                                        'var(--font-size-sm)',
                                    }}
                                  >
                                    {channel && (
                                      <span>
                                        {channel}
                                      </span>
                                    )}

                                    {duration && (
                                      <span>
                                        {duration}
                                      </span>
                                    )}
                                  </div>
                                )}

                              {description && (
                                <p
                                  style={{
                                    margin: 0,
                                    color:
                                      'var(--color-text-secondary)',
                                    lineHeight: 1.6,
                                  }}
                                >
                                  {description}
                                </p>
                              )}

                              {url && (
                                <div
                                  style={{
                                    marginTop: 12,
                                  }}
                                >
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Watch ${title} in a new tab`}
                                    style={{
                                      color:
                                        'var(--color-primary)',
                                      fontWeight: 600,
                                      textDecoration:
                                        'none',
                                      wordBreak:
                                        'break-word',
                                    }}
                                  >
                                    Watch Video ↗
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    }
                  )}
                </div>
              ) : (
                <Card>
                  <h2
                    className="section-title"
                    style={{
                      fontSize:
                        'var(--font-size-lg)',
                      marginBottom: 8,
                    }}
                  >
                    No Videos Found
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      color:
                        'var(--color-text-secondary)',
                      lineHeight: 1.6,
                    }}
                  >
                    No YouTube learning videos
                    are currently available for
                    this topic.
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}