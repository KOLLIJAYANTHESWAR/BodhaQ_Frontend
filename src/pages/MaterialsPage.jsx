import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
} from '../api/documentApi.js';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Spinner from '../components/common/Spinner.jsx';

const UPLOAD_STEPS = [
  'Uploading your document…',
  'Extracting text…',
  'Organising content…',
  'Indexing material…',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.pptx', '.docx'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function DocumentCard({ doc, onDelete, onStudy, onQuiz, onDoubt }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete "${doc.filename}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);

    try {
      await onDelete(doc.document_id);
    } finally {
      setDeleting(false);
    }
  }

  const filename = doc.filename || 'Document';
  const ext = filename.includes('.')
    ? filename.split('.').pop()?.toUpperCase() || ''
    : '';

  return (
    <Card>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start',
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* File type badge */}
          <div
            style={{
              width: 44,
              height: 44,
              background: 'var(--color-primary-light)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              fontWeight: 700,
              fontSize: 'var(--font-size-xs)',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {ext || 'FILE'}
          </div>

          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontWeight: 600,
                color: 'var(--color-text)',
                fontSize: 'var(--font-size-base)',
                marginBottom: 4,
                wordBreak: 'break-word',
              }}
            >
              {filename}
            </p>

            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span className="badge badge-green">✓ Ready</span>
              <span className="text-muted">
                {doc.chunk_count} sections indexed
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <Button
            variant="primary"
            size="sm"
            onClick={() => onStudy(doc)}
            disabled={deleting}
          >
            Study
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onQuiz(doc)}
            disabled={deleting}
          >
            Quiz
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDoubt(doc)}
            disabled={deleting}
          >
            Ask Doubt
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            loading={deleting}
            disabled={deleting}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function MaterialsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const uploadIntervalRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docError, setDocError] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetchDocuments();

    return () => {
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }
    };
  }, []);

  async function fetchDocuments() {
    setLoadingDocs(true);
    setDocError(null);

    try {
      const data = await listDocuments();
      setDocuments(Array.isArray(data?.documents) ? data.documents : []);
    } catch (err) {
      setDocError(err?.message || 'Unable to load your materials.');
    } finally {
      setLoadingDocs(false);
    }
  }

  async function handleFileUpload(file) {
    if (!file || uploading) return;

    const filename = file.name || '';
    const lastDotIndex = filename.lastIndexOf('.');

    const ext =
      lastDotIndex > 0
        ? filename.slice(lastDotIndex).toLowerCase()
        : '';

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(
        "This file type isn't supported. Please upload a PDF, PPTX, or DOCX."
      );
      setUploadedDoc(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(
        'This file is larger than 50 MB. Please choose a smaller file.'
      );
      setUploadedDoc(null);
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadedDoc(null);
    setUploadStep(0);
    setDragOver(false);

    uploadIntervalRef.current = setInterval(() => {
      setUploadStep((currentStep) =>
        Math.min(
          currentStep + 1,
          UPLOAD_STEPS.length - 1
        )
      );
    }, 800);

    try {
      const result = await uploadDocument(file);

      setUploadStep(UPLOAD_STEPS.length - 1);
      setUploadedDoc(result);

      await fetchDocuments();
    } catch (err) {
      setUploadError(
        err?.message || 'Unable to upload the document.'
      );
    } finally {
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }

      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (file) {
      handleFileUpload(file);
    }
  }

  function handleDragOver(event) {
    event.preventDefault();

    if (!uploading) {
      setDragOver(true);
    }
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragOver(false);

    if (uploading) return;

    const file = event.dataTransfer.files?.[0];

    if (file) {
      handleFileUpload(file);
    }
  }

  function handleUploadZoneKeyDown(event) {
    if (uploading) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  }

  async function handleDelete(documentId) {
    try {
      await deleteDocument(documentId);

      setDocuments((previousDocuments) =>
        previousDocuments.filter(
          (document) => document.document_id !== documentId
        )
      );
    } catch (err) {
      window.alert(
        err?.message || 'Unable to delete the document.'
      );
    }
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Materials"
        subtitle="Upload study documents and manage your learning library."
      />

      {/* Upload area */}
      <Card style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 'var(--font-size-lg)',
            marginBottom: 16,
          }}
        >
          Upload study material
        </h2>

        <p
          className="text-muted"
          style={{ marginBottom: 16 }}
        >
          Supported formats: <strong>PDF</strong>,{' '}
          <strong>PPTX</strong>, <strong>DOCX</strong>
          &nbsp;· Maximum size: 50 MB
        </p>

        {/* Upload zone */}
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!uploading) {
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={uploading ? -1 : 0}
          aria-disabled={uploading}
          aria-label="Drop files here or click to upload"
          onKeyDown={handleUploadZoneKeyDown}
          style={{
            cursor: uploading ? 'not-allowed' : 'pointer',
            marginBottom: 12,
            opacity: uploading ? 0.75 : 1,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.pptx,.docx"
            onChange={handleFileChange}
            tabIndex={-1}
            aria-hidden="true"
            disabled={uploading}
          />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{ color: 'var(--color-muted)' }}
              aria-hidden="true"
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>

            <p
              style={{
                margin: 0,
                fontWeight: 500,
                color: 'var(--color-text)',
              }}
            >
              Drag and drop a file here
            </p>

            <p
              style={{
                margin: 0,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-muted)',
              }}
            >
              PDF, PPTX, DOCX — up to 50 MB
            </p>
          </div>
        </div>

        {/* Always-visible file button */}
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          Choose File
        </Button>

        {/* Upload progress */}
        {uploading && (
          <div
            className="loading-state"
            style={{ padding: '24px 0 0' }}
          >
            <div
              className="spinner"
              aria-hidden="true"
            />

            <ul
              className="loading-steps"
              role="status"
              aria-live="polite"
              aria-label="Upload progress"
            >
              {UPLOAD_STEPS.map((step, index) => (
                <li
                  key={step}
                  className={`loading-step ${index === uploadStep ? 'active' : ''
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
              ))}
            </ul>
          </div>
        )}

        {/* Upload error */}
        {uploadError && !uploading && (
          <div
            className="inline-notice error"
            style={{ marginTop: 12 }}
            role="alert"
          >
            <span aria-hidden="true">⚠</span>{' '}
            {uploadError}
          </div>
        )}

        {/* Upload success */}
        {uploadedDoc && !uploading && (
          <div
            className="inline-notice success"
            style={{ marginTop: 12 }}
            role="status"
          >
            <span aria-hidden="true">✓</span>{' '}
            <strong>{uploadedDoc.filename}</strong>{' '}
            uploaded and indexed successfully.
          </div>
        )}
      </Card>

      {/* Document list */}
      <div>
        <h2
          style={{
            fontSize: 'var(--font-size-lg)',
            marginBottom: 16,
          }}
        >
          Your materials
        </h2>

        {loadingDocs && (
          <Spinner label="Loading your materials…" />
        )}

        {docError && !loadingDocs && (
          <ErrorState
            title="Couldn't load materials"
            message={docError}
            onRetry={fetchDocuments}
          />
        )}

        {!loadingDocs &&
          !docError &&
          documents.length === 0 && (
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
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              }
              title="No study materials yet"
              description="Upload a PDF, PPTX or DOCX to start learning from your own material."
            />
          )}

        {!loadingDocs &&
          !docError &&
          documents.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.document_id}
                  doc={doc}
                  onDelete={handleDelete}
                  onStudy={(document) =>
                    navigate(
                      `/study/document/${document.document_id}?filename=${encodeURIComponent(
                        document.filename
                      )}`
                    )
                  }
                  onQuiz={(document) =>
                    navigate(
                      `/quizzes?source_type=document&source_id=${document.document_id}&filename=${encodeURIComponent(
                        document.filename
                      )}`
                    )
                  }
                  onDoubt={(document) =>
                    navigate(
                      `/doubts?document_id=${document.document_id}&filename=${encodeURIComponent(
                        document.filename
                      )}`
                    )
                  }
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}