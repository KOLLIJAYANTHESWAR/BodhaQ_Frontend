import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  getResumeProgress,
  uploadResume,
} from '../api/resumeApi';

import {
  getActiveResume,
  setActiveResume,
  clearActiveResume,
  clearResumeQuizProgress
} from '../utils/storage';

import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import ProgressBar from '../components/common/ProgressBar.jsx';
import Spinner from '../components/common/Spinner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';


const EXTRACTION_STEPS = [
  'Uploading and reading resume document...',
  'Parsing structure, experience, and sections...',
  'Extracting technical skills, projects, and credentials with Gemini...',
  'Assembling your personalized, persistent interview queue...',
];


export default function ResumePrepPage() {
  const [progressData, setProgressData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);

  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');

  const [activeTab, setActiveTab] = useState('skills');
  const [filterStatus, setFilterStatus] = useState('all');

  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const reuploadInputRef = useRef(null);

  const navigate = useNavigate();


  // -------------------------------------------------------------------------
  // Load resume progress
  // -------------------------------------------------------------------------

  const fetchProgress = async () => {
    setLoading(true);

    try {
      let data = getActiveResume();

      if (!data) {
        data = await getResumeProgress();
        if (data && data.resume_id) {
          setActiveResume(data);
        }
      }

      if (data && data.resume_id) {
        setProgressData(data);
      } else {
        setProgressData(null);
      }

      setError('');
      setErrorCode('');

    } catch (err) {
      setError(
        err?.message ||
        'Failed to load resume preparation data.'
      );

      setErrorCode(
        err?.code || ''
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchProgress();
  }, []);


  // -------------------------------------------------------------------------
  // Upload resume
  // -------------------------------------------------------------------------

  const handleFileUpload = async (file) => {
    if (!file || uploading) {
      return;
    }

    const allowedExtensions = [
      '.pdf',
      '.docx',
    ];

    const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

    const extension =
      '.' +
      file.name
        .split('.')
        .pop()
        .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setError(
        'Please upload a PDF or DOCX resume document.'
      );

      setErrorCode(
        'UNSUPPORTED_FILE_TYPE'
      );

      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(
        'This resume is larger than 50 MB. Please choose a smaller file.'
      );

      setErrorCode(
        'FILE_TOO_LARGE'
      );

      return;
    }

    setDragOver(false);
    setUploading(true);
    setError('');
    setErrorCode('');
    setUploadStep(0);

    const stepInterval = setInterval(() => {
      setUploadStep(
        (currentStep) =>
          Math.min(
            currentStep + 1,
            EXTRACTION_STEPS.length - 1
          )
      );
    }, 1200);


    try {
      const result = await uploadResume(file);

      const currentResume = getActiveResume();
      if (currentResume && currentResume.resume_id !== result.resume_id) {
        const oldItems = [
          ...(currentResume.skills || []),
          ...(currentResume.projects || []),
          ...(currentResume.certifications || [])
        ];
        oldItems.forEach(item => clearResumeQuizProgress(item.id));
      }

      clearActiveResume();
      setActiveResume(result);

      await fetchProgress();

    } catch (err) {
      const status = err?.status;
      const code = err?.code;

      setError(
        err?.message ||
        'Failed to process your resume.'
      );

      setErrorCode(
        code ||
        (status === 401
          ? 'INVALID_API_KEY'
          : 'RESUME_UPLOAD_ERROR')
      );

    } finally {
      clearInterval(stepInterval);

      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (reuploadInputRef.current) {
        reuploadInputRef.current.value = '';
      }
    }
  };


  // -------------------------------------------------------------------------
  // File selection
  // -------------------------------------------------------------------------

  const onFileInputChange = (event) => {
    const file = event.target.files?.[0];

    if (file && !uploading) {
      handleFileUpload(file);
    }
  };


  // -------------------------------------------------------------------------
  // Drag and drop
  // -------------------------------------------------------------------------

  const handleDrop = (event) => {
    event.preventDefault();

    setDragOver(false);

    if (uploading) {
      return;
    }

    const file = event.dataTransfer.files?.[0];

    if (file) {
      handleFileUpload(file);
    }
  };


  // -------------------------------------------------------------------------
  // Start assessment
  // -------------------------------------------------------------------------

  const handleStartQuiz = (item) => {
    navigate(
      '/quizzes',
      {
        state: {
          resumeItem: item,
        },
      }
    );
  };

  // -------------------------------------------------------------------------
  // Delete Resume
  // -------------------------------------------------------------------------

  const handleDeleteResume = () => {
    if (!window.confirm('Are you sure you want to delete this resume? All progress will be lost.')) {
      return;
    }

    const currentResume = getActiveResume();
    if (currentResume) {
      const oldItems = [
        ...(currentResume.skills || []),
        ...(currentResume.projects || []),
        ...(currentResume.certifications || [])
      ];
      oldItems.forEach(item => clearResumeQuizProgress(item.id));
    }

    clearActiveResume();
    setProgressData(null);
  };


  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  const isAuthError =
    errorCode === 'INVALID_API_KEY' ||
    error?.toLowerCase().includes('unauthenticated') ||
    error?.toLowerCase().includes('authentication') ||
    error?.toLowerCase().includes('api key');


  const clearError = () => {
    setError('');
    setErrorCode('');
  };


  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div
        className="page-content"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <Spinner
          size="lg"
          label="Loading interview preparation queue..."
        />
      </div>
    );
  }


  // =========================================================================
  // No Resume
  // =========================================================================

  if (!progressData) {
    return (
      <div className="page-content">

        <PageHeader
          title="Resume Interview Prep"
          subtitle="Turn your resume into an interview preparation queue with zero manual entry."
        />


        {/* ---------------------------------------------------------------
            Error
        --------------------------------------------------------------- */}

        {error && (
          <Card
            style={{
              marginBottom: 20,
              border:
                isAuthError
                  ? '1.5px solid var(--color-warning)'
                  : undefined,
              background:
                isAuthError
                  ? 'var(--color-warning-light)'
                  : undefined,
              padding: 20,
            }}
          >

            <div
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
              }}
            >

              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: isAuthError
                    ? 'var(--color-warning)'
                    : 'var(--color-danger)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 20,
                }}
              >
                {isAuthError ? '🔑' : '⚠️'}
              </div>


              <div style={{ flex: 1 }}>

                <h3
                  style={{
                    margin: '0 0 6px',
                    fontSize: 'var(--font-size-base)',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                  }}
                >
                  {isAuthError
                    ? 'Gemini API authentication failed'
                    : 'Resume processing failed'}
                </h3>


                <p
                  style={{
                    margin: '0 0 12px',
                    color: 'var(--color-text-secondary)',
                    fontSize: 'var(--font-size-sm)',
                    lineHeight: 1.6,
                  }}
                >
                  {isAuthError
                    ? 'BodhaQ could not authenticate with Gemini while processing your resume. The Gemini API key is configured on the backend.'
                    : error}
                </p>


                {isAuthError && (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: 'var(--color-surface)',
                      marginBottom: 14,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.6,
                      }}
                    >
                      Check the following on the backend:
                    </p>

                    <ul
                      style={{
                        margin:
                          '8px 0 0 20px',
                        padding: 0,
                        color: 'var(--color-text-secondary)',
                        fontSize: 'var(--font-size-sm)',
                        lineHeight: 1.7,
                      }}
                    >
                      <li>
                        <code>backend/.env</code> contains a valid{' '}
                        <code>GEMINI_API_KEY</code>
                      </li>

                      <li>
                        Restart the FastAPI server after changing
                        <code> .env</code>
                      </li>

                      <li>
                        Make sure the key belongs to the Gemini API
                        configuration you are using
                      </li>
                    </ul>
                  </div>
                )}


                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >

                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      clearError();
                      fetchProgress();
                    }}
                  >
                    Try Again
                  </Button>


                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate('/settings')}
                  >
                    Open Settings
                  </Button>

                </div>

              </div>

            </div>

          </Card>
        )}


        {/* ---------------------------------------------------------------
            Hero
        --------------------------------------------------------------- */}

        <div className="resume-hero-banner">

          <div className="resume-hero-badge">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>

            AI-Powered Interview Preparation
          </div>


          <h2
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 700,
              color: 'var(--color-text)',
              marginBottom: 12,
            }}
          >
            Master Every Project & Skill on Your Resume
          </h2>


          <p
            style={{
              maxWidth: 620,
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-base)',
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            Upload your resume once. BodhaQ scans your experience
            to extract your technical skills, real-world projects,
            and certifications into a persistent, sequential
            interview queue with tailored assessments.
          </p>


          {/* Upload zone */}

          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''
              }`}
            onDragOver={(event) => {
              event.preventDefault();

              if (!uploading) {
                setDragOver(true);
              }
            }}
            onDragLeave={() => {
              setDragOver(false);
            }}
            onDrop={handleDrop}
            onClick={() => {
              if (!uploading) {
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={uploading ? -1 : 0}
            aria-disabled={uploading}
            aria-label="Upload resume file"
            onKeyDown={(event) => {
              if (
                uploading ||
                (event.key !== 'Enter' &&
                  event.key !== ' ')
              ) {
                return;
              }

              event.preventDefault();
              fileInputRef.current?.click();
            }}
            style={{
              padding: '36px 24px',
              background: dragOver
                ? 'var(--color-primary-light)'
                : 'var(--color-surface)',
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: dragOver
                ? 'var(--color-primary)'
                : 'var(--color-border)',
              cursor: uploading
                ? 'wait'
                : 'pointer',
            }}
          >

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={onFileInputChange}
              style={{ display: 'none' }}
              disabled={uploading}
            />


            {!uploading ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
              >

                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background:
                      'var(--color-primary-light)',
                    color:
                      'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line
                      x1="12"
                      y1="18"
                      x2="12"
                      y2="12"
                    />
                    <line
                      x1="9"
                      y1="15"
                      x2="15"
                      y2="15"
                    />
                  </svg>
                </div>


                <div>

                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: 'var(--font-size-base)',
                      color: 'var(--color-text)',
                    }}
                  >
                    Drop your resume here, or{' '}
                    <span
                      style={{
                        color:
                          'var(--color-primary)',
                        textDecoration:
                          'underline',
                      }}
                    >
                      browse
                    </span>
                  </p>


                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-muted)',
                    }}
                  >
                    Supports <strong>PDF</strong> and{' '}
                    <strong>DOCX</strong> format
                    (up to 50 MB)
                  </p>

                </div>


                <Button
                  variant="primary"
                  style={{ marginTop: 6 }}
                  disabled={uploading}
                >
                  Select Resume File
                </Button>

              </div>

            ) : (

              <div
                className="loading-state"
                style={{ padding: '20px 0' }}
              >

                <div
                  className="spinner spinner-lg"
                  aria-hidden="true"
                />


                <p
                  style={{
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    marginTop: 8,
                  }}
                >
                  Analyzing Resume with Gemini...
                </p>


                <ul
                  className="loading-steps"
                  role="status"
                  aria-live="polite"
                  style={{ marginTop: 12 }}
                >
                  {EXTRACTION_STEPS.map(
                    (step, index) => (
                      <li
                        key={step}
                        className={`loading-step ${index === uploadStep
                          ? 'active'
                          : ''
                          }`}
                      >
                        <span aria-hidden="true">
                          {index < uploadStep
                            ? '✓'
                            : index === uploadStep
                              ? '→'
                              : '○'}
                        </span>

                        {step}
                      </li>
                    )
                  )}
                </ul>

              </div>
            )}

          </div>

        </div>


        {/* ---------------------------------------------------------------
            Feature grid
        --------------------------------------------------------------- */}

        <div className="resume-feature-grid">

          <div className="resume-feature-card">

            <div className="resume-feature-icon">
              🛠️
            </div>

            <h4
              style={{
                margin: 0,
                color: 'var(--color-text)',
              }}
            >
              Targeted Skill Drills
            </h4>

            <p
              style={{
                margin: 0,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-muted)',
              }}
            >
              Core concepts, edge cases, and best
              practices tailored directly to the
              technical skills listed in your experience.
            </p>

          </div>


          <div className="resume-feature-card">

            <div className="resume-feature-icon">
              🚀
            </div>

            <h4
              style={{
                margin: 0,
                color: 'var(--color-text)',
              }}
            >
              Project Defense Prep
            </h4>

            <p
              style={{
                margin: 0,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-muted)',
              }}
            >
              Defend architectural decisions,
              trade-offs, tech stacks, and scale
              challenges from your actual projects.
            </p>

          </div>


          <div className="resume-feature-card">

            <div className="resume-feature-icon">
              📈
            </div>

            <h4
              style={{
                margin: 0,
                color: 'var(--color-text)',
              }}
            >
              Persistent Queue
            </h4>

            <p
              style={{
                margin: 0,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-muted)',
              }}
            >
              No lost progress. Complete items one
              by one and track your interview readiness
              anytime.
            </p>

          </div>

        </div>

      </div>
    );
  }


  // =========================================================================
  // Active Resume Dashboard
  // =========================================================================

  const skills = Array.isArray(progressData.skills)
    ? progressData.skills
    : [];

  const projects = Array.isArray(progressData.projects)
    ? progressData.projects
    : [];

  const certifications = Array.isArray(
    progressData.certifications
  )
    ? progressData.certifications
    : [];


  const completedSkills =
    skills.filter(
      (item) => item.status === 'completed'
    ).length;


  const completedProjects =
    projects.filter(
      (item) => item.status === 'completed'
    ).length;


  const completedCerts =
    certifications.filter(
      (item) => item.status === 'completed'
    ).length;


  const allItems = [
    ...skills.map((item) => ({
      ...item,
      item_type: 'skill',
    })),

    ...projects.map((item) => ({
      ...item,
      item_type: 'project',
    })),

    ...certifications.map((item) => ({
      ...item,
      item_type: 'certification',
    })),
  ];


  const inProgressItem =
    allItems.find(
      (item) => item.status === 'in_progress'
    );


  const needsReviewItem =
    allItems.find(
      (item) => item.status === 'needs_review'
    );


  const notStartedItem =
    allItems.find(
      (item) => item.status === 'not_started'
    );


  const nextFocus =
    inProgressItem ||
    needsReviewItem ||
    notStartedItem;


  const currentTabItems =
    activeTab === 'skills'
      ? skills
      : activeTab === 'projects'
        ? projects
        : certifications;


  const filteredItems =
    currentTabItems.filter((item) => {

      if (filterStatus === 'todo') {
        return item.status !== 'completed';
      }

      if (filterStatus === 'completed') {
        return item.status === 'completed';
      }

      return true;
    });


  return (
    <div className="page-content">

      {/* ---------------------------------------------------------------
          Header
      --------------------------------------------------------------- */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >

        <PageHeader
          title="Resume Interview Prep"
          subtitle="Your persistent interview readiness queue based on your extracted resume."
        />


        <div style={{ display: 'flex', gap: '10px' }}>

          <Button
            variant="danger"
            onClick={handleDeleteResume}
            disabled={uploading}
            style={{
              background: 'transparent',
              color: 'var(--color-danger)',
              border: '1px solid var(--color-danger)',
            }}
          >
            Delete Resume
          </Button>

          <input
            ref={reuploadInputRef}
            type="file"
            id="resume-reupload"
            accept=".pdf,.docx"
            style={{ display: 'none' }}
            onChange={onFileInputChange}
            disabled={uploading}
          />


          <Button
            variant="secondary"
            onClick={() =>
              reuploadInputRef.current?.click()
            }
            disabled={uploading}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line
                x1="12"
                y1="3"
                x2="12"
                y2="15"
              />
            </svg>

            {uploading
              ? 'Updating Resume...'
              : 'Upload New Resume'}
          </Button>

        </div>

      </div>


      {/* ---------------------------------------------------------------
          Error
      --------------------------------------------------------------- */}

      {error && (
        <Card
          style={{
            marginBottom: 20,
            border:
              isAuthError
                ? '1.5px solid var(--color-warning)'
                : undefined,
            background:
              isAuthError
                ? 'var(--color-warning-light)'
                : undefined,
            padding: 20,
          }}
        >

          <div
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
            }}
          >

            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: isAuthError
                  ? 'var(--color-warning)'
                  : 'var(--color-danger)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 20,
              }}
            >
              {isAuthError ? '🔑' : '⚠️'}
            </div>


            <div style={{ flex: 1 }}>

              <h3
                style={{
                  margin: '0 0 6px',
                  fontSize: 'var(--font-size-base)',
                  fontWeight: 700,
                  color: 'var(--color-text)',
                }}
              >
                {isAuthError
                  ? 'Gemini API authentication failed'
                  : 'Resume processing failed'}
              </h3>


              <p
                style={{
                  margin: '0 0 12px',
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--font-size-sm)',
                  lineHeight: 1.6,
                }}
              >
                {isAuthError
                  ? 'BodhaQ could not authenticate with Gemini while processing your resume. Check the Gemini API configuration on the backend.'
                  : error}
              </p>


              {isAuthError && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'var(--color-surface)',
                    marginBottom: 14,
                  }}
                >

                  <p
                    style={{
                      margin: 0,
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.6,
                    }}
                  >
                    Backend configuration:
                  </p>


                  <ul
                    style={{
                      margin:
                        '8px 0 0 20px',
                      padding: 0,
                      color: 'var(--color-text-secondary)',
                      fontSize: 'var(--font-size-sm)',
                      lineHeight: 1.7,
                    }}
                  >
                    <li>
                      Check{' '}
                      <code>backend/.env</code>
                    </li>

                    <li>
                      Verify{' '}
                      <code>GEMINI_API_KEY</code>
                      {' '}is configured
                    </li>

                    <li>
                      Restart FastAPI after changing
                      the environment file
                    </li>
                  </ul>

                </div>
              )}


              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >

                <Button
                  variant="primary"
                  onClick={() => {
                    clearError();
                    fetchProgress();
                  }}
                >
                  Try Again
                </Button>


                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate('/settings')
                  }
                >
                  Open Settings
                </Button>

              </div>

            </div>

          </div>

        </Card>
      )}


      {/* ---------------------------------------------------------------
          Uploading
      --------------------------------------------------------------- */}

      {uploading && (
        <Card
          style={{
            marginBottom: 20,
            padding: 24,
          }}
        >

          <div
            className="loading-state"
            style={{ padding: '12px 0' }}
          >

            <div
              className="spinner spinner-lg"
              aria-hidden="true"
            />


            <p
              style={{
                fontWeight: 600,
                color: 'var(--color-text)',
                marginTop: 8,
              }}
            >
              Reparsing resume and updating queue...
            </p>


            <ul
              className="loading-steps"
              role="status"
              aria-live="polite"
              style={{ marginTop: 12 }}
            >
              {EXTRACTION_STEPS.map(
                (step, index) => (
                  <li
                    key={step}
                    className={`loading-step ${index === uploadStep
                      ? 'active'
                      : ''
                      }`}
                  >
                    <span aria-hidden="true">
                      {index < uploadStep
                        ? '✓'
                        : index === uploadStep
                          ? '→'
                          : '○'}
                    </span>

                    {step}
                  </li>
                )
              )}
            </ul>

          </div>

        </Card>
      )}


      {/* ---------------------------------------------------------------
          Progress summary
      --------------------------------------------------------------- */}

      <div className="resume-progress-card">

        <div style={{ flex: 1 }}>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
            }}
          >

            <span className="badge badge-blue">

              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>

              {progressData.filename}

            </span>


            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-muted)',
              }}
            >
              Active Queue
            </span>

          </div>


          <h2
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 700,
              margin: '4px 0 12px',
              color: 'var(--color-text)',
            }}
          >
            {Math.round(
              progressData.overall_progress || 0
            )}% Readiness Score
          </h2>


          <div style={{ marginBottom: 12 }}>
            <ProgressBar
              value={
                progressData.overall_progress || 0
              }
              max={100}
            />
          </div>


          <p
            style={{
              margin: 0,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-muted)',
            }}
          >
            <strong>
              {progressData.items_completed || 0}
            </strong>{' '}
            of{' '}
            <strong>
              {progressData.total_items || 0}
            </strong>{' '}
            items completed across skills,
            projects, and certifications.
          </p>


          <div className="resume-stats-row">

            <div className="resume-stat-box">
              <span className="resume-stat-label">
                Skills
              </span>

              <span className="resume-stat-val">
                {completedSkills} / {skills.length}
              </span>

              <span className="resume-stat-sub">
                mastered
              </span>
            </div>


            <div className="resume-stat-box">
              <span className="resume-stat-label">
                Projects
              </span>

              <span className="resume-stat-val">
                {completedProjects} / {projects.length}
              </span>

              <span className="resume-stat-sub">
                defended
              </span>
            </div>


            <div className="resume-stat-box">
              <span className="resume-stat-label">
                Certifications
              </span>

              <span className="resume-stat-val">
                {completedCerts} / {certifications.length}
              </span>

              <span className="resume-stat-sub">
                verified
              </span>
            </div>

          </div>

        </div>

      </div>


      {/* ---------------------------------------------------------------
          Next focus
      --------------------------------------------------------------- */}

      {nextFocus &&
        progressData.overall_progress < 100 && (

          <div className="resume-upnext-card">

            <div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                }}
              >

                <span className="badge badge-blue">
                  🎯 Recommended Next Focus
                </span>

                <span
                  style={{
                    fontSize:
                      'var(--font-size-xs)',
                    color:
                      'var(--color-muted)',
                    textTransform:
                      'capitalize',
                  }}
                >
                  {nextFocus.item_type}
                </span>

              </div>


              <h3
                style={{
                  margin: 0,
                  fontSize:
                    'var(--font-size-base)',
                  fontWeight: 700,
                  color:
                    'var(--color-text)',
                }}
              >
                {nextFocus.name}
              </h3>


              <p
                style={{
                  margin: '4px 0 0',
                  fontSize:
                    'var(--font-size-xs)',
                  color:
                    'var(--color-muted)',
                }}
              >
                {nextFocus.status ===
                  'in_progress'
                  ? 'You have an assessment currently in progress.'
                  : nextFocus.status ===
                    'needs_review'
                    ? 'Score was under 80% — brush up on this topic.'
                    : 'Next item in your preparation roadmap.'}
              </p>

            </div>


            <Button
              variant="primary"
              onClick={() =>
                handleStartQuiz(nextFocus)
              }
            >
              {nextFocus.status ===
                'in_progress'
                ? 'Resume Assessment →'
                : nextFocus.status ===
                  'needs_review'
                  ? 'Retake Assessment →'
                  : 'Start Assessment →'}
            </Button>

          </div>
        )}


      {/* ---------------------------------------------------------------
          Tabs and filters
      --------------------------------------------------------------- */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >

        <div
          className="resume-tabs-nav"
          style={{
            margin: 0,
            border: 'none',
          }}
        >

          <button
            type="button"
            className={`resume-tab-btn ${activeTab === 'skills'
              ? 'active'
              : ''
              }`}
            onClick={() =>
              setActiveTab('skills')
            }
          >
            🛠️ Technical Skills

            <span className="resume-tab-count">
              {completedSkills}/{skills.length}
            </span>
          </button>


          <button
            type="button"
            className={`resume-tab-btn ${activeTab === 'projects'
              ? 'active'
              : ''
              }`}
            onClick={() =>
              setActiveTab('projects')
            }
          >
            🌟 Projects

            <span className="resume-tab-count">
              {completedProjects}/{projects.length}
            </span>
          </button>


          <button
            type="button"
            className={`resume-tab-btn ${activeTab ===
              'certifications'
              ? 'active'
              : ''
              }`}
            onClick={() =>
              setActiveTab('certifications')
            }
          >
            📜 Certifications

            <span className="resume-tab-count">
              {completedCerts}/
              {certifications.length}
            </span>
          </button>

        </div>


        <div className="pill-selector">

          <button
            type="button"
            className={`pill-btn ${filterStatus === 'all'
              ? 'active'
              : ''
              }`}
            onClick={() =>
              setFilterStatus('all')
            }
          >
            All ({currentTabItems.length})
          </button>


          <button
            type="button"
            className={`pill-btn ${filterStatus === 'todo'
              ? 'active'
              : ''
              }`}
            onClick={() =>
              setFilterStatus('todo')
            }
          >
            To Do (
            {
              currentTabItems.filter(
                (item) =>
                  item.status !==
                  'completed'
              ).length
            }
            )
          </button>


          <button
            type="button"
            className={`pill-btn ${filterStatus === 'completed'
              ? 'active'
              : ''
              }`}
            onClick={() =>
              setFilterStatus('completed')
            }
          >
            Mastered (
            {
              currentTabItems.filter(
                (item) =>
                  item.status ===
                  'completed'
              ).length
            }
            )
          </button>

        </div>

      </div>


      {/* ---------------------------------------------------------------
          Queue items
      --------------------------------------------------------------- */}

      <div>

        {filteredItems.length === 0 ? (

          <Card>

            <EmptyState
              icon={
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                  />

                  <line
                    x1="8"
                    y1="12"
                    x2="16"
                    y2="12"
                  />
                </svg>
              }

              title={
                filterStatus === 'all'
                  ? `No ${activeTab} found in your resume`
                  : `No ${filterStatus === 'todo'
                    ? 'incomplete'
                    : 'mastered'
                  } items in this category`
              }

              description={
                filterStatus === 'all'
                  ? 'BodhaQ did not detect any entries for this section in the uploaded file.'
                  : 'Adjust your filter to view other items in this category.'
              }
            />

          </Card>

        ) : (

          filteredItems.map((item) => {

            const isCompleted =
              item.status === 'completed';

            const isNeedsReview =
              item.status === 'needs_review';

            const isInProgress =
              item.status === 'in_progress';


            const cardStatusClass =
              isCompleted
                ? 'completed'
                : isNeedsReview
                  ? 'needs-review'
                  : isInProgress
                    ? 'in-progress'
                    : 'not-started';


            return (
              <div
                key={item.id}
                className={`resume-item-card ${cardStatusClass}`}
              >

                <div
                  style={{
                    flex: 1,
                    minWidth: 260,
                  }}
                >

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 6,
                      flexWrap: 'wrap',
                    }}
                  >

                    {isCompleted && (
                      <span className="badge badge-green">
                        ✓ Mastered
                        {item.score
                          ? ` • ${item.score}%`
                          : ''}
                      </span>
                    )}


                    {isNeedsReview && (
                      <span className="badge badge-yellow">
                        ⚠ Needs Review
                        {item.score
                          ? ` • ${item.score}%`
                          : ''}
                      </span>
                    )}


                    {isInProgress && (
                      <span className="badge badge-blue">
                        ⏱ In Progress
                      </span>
                    )}


                    {!isCompleted &&
                      !isNeedsReview &&
                      !isInProgress && (
                        <span className="badge badge-gray">
                          ○ Not Started
                        </span>
                      )}

                  </div>


                  <h3
                    style={{
                      margin: 0,
                      fontSize:
                        'var(--font-size-base)',
                      fontWeight: 600,
                      color:
                        'var(--color-text)',
                    }}
                  >
                    {item.name}
                  </h3>


                  {item.description && (
                    <p
                      style={{
                        margin:
                          '6px 0 0',
                        fontSize:
                          'var(--font-size-sm)',
                        color:
                          'var(--color-text-secondary)',
                        lineHeight: 1.5,
                      }}
                    >
                      {item.description}
                    </p>
                  )}


                  {item.technologies &&
                    item.technologies.length >
                    0 && (

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                          marginTop: 10,
                        }}
                      >

                        {item.technologies.map(
                          (technology) => (
                            <span
                              key={technology}
                              className="resume-tech-tag"
                            >
                              {technology}
                            </span>
                          )
                        )}

                      </div>
                    )}

                </div>


                <div
                  style={{
                    flexShrink: 0,
                  }}
                >

                  <Button
                    variant={
                      isCompleted
                        ? 'secondary'
                        : 'primary'
                    }
                    size="sm"
                    onClick={() =>
                      handleStartQuiz(item)
                    }
                  >
                    {isCompleted
                      ? 'Review / Retake'
                      : isInProgress
                        ? 'Resume Assessment →'
                        : isNeedsReview
                          ? 'Retake Assessment →'
                          : 'Start Assessment →'}
                  </Button>

                </div>

              </div>
            );
          })
        )}

      </div>

    </div>
  );
}