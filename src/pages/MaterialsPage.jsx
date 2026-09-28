import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDocument, listDocuments, deleteDocument } from '../api/documentApi.js';
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

function DocumentCard({ doc, onDelete, onStudy, onQuiz, onDoubt }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${doc.filename}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await onDelete(doc.document_id);
    } finally {
      setDeleting(false);
    }
  }

  const ext = doc.filename.split('.').pop()?.toUpperCase() || '';

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
          {/* File type badge */}
          <div style={{
            width: 44, height: 44, background: 'var(--color-primary-light)',
            borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--color-primary)',
            fontWeight: 700, fontSize: 'var(--font-size-xs)', flexShrink: 0,
          }}>
            {ext}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 'var(--font-size-base)', marginBottom: 4, wordBreak: 'break-word' }}>
              {doc.filename}
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge badge-green">✓ Ready</span>
              <span className="text-muted">{doc.chunk_count} sections indexed</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          <Button variant="primary" size="sm" onClick={() => onStudy(doc)}>Study</Button>
          <Button variant="secondary" size="sm" onClick={() => onQuiz(doc)}>Quiz</Button>
          <Button variant="ghost" size="sm" onClick={() => onDoubt(doc)}>Ask Doubt</Button>
          <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting} disabled={deleting}>
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
  const dropZoneRef = useRef(null);

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
  }, []);

  async function fetchDocuments() {
    setLoadingDocs(true);
    setDocError(null);
    try {
      const data = await listDocuments();
      setDocuments(data.documents || []);
    } catch (err) {
      setDocError(err.message);
    } finally {
      setLoadingDocs(false);
    }
  }

  async function handleFileUpload(file) {
    if (!file) return;

    const allowed = ['.pdf', '.pptx', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadError('This file type isn\'t supported. Please upload a PDF, PPTX, or DOCX.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadedDoc(null);
    setUploadStep(0);

    const stepInterval = setInterval(() => {
      setUploadStep((s) => Math.min(s + 1, UPLOAD_STEPS.length - 1));
    }, 800);

    try {
      const result = await uploadDocument(file);
      setUploadedDoc(result);
      await fetchDocuments();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      clearInterval(stepInterval);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }

  async function handleDelete(documentId) {
    try {
      await deleteDocument(documentId);
      setDocuments((prev) => prev.filter((d) => d.document_id !== documentId));
    } catch (err) {
      alert(err.message);
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
        <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 16 }}>Upload study material</h2>
        <p className="text-muted" style={{ marginBottom: 16 }}>
          Supported formats: <strong>PDF</strong>, <strong>PPTX</strong>, <strong>DOCX</strong>
          &nbsp;· Maximum size: 50 MB
        </p>

        {/* Upload zone */}
        <div
          ref={dropZoneRef}
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Drop files here or click to upload"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
          style={{ cursor: 'pointer', marginBottom: 12 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.pptx,.docx"
            onChange={handleFileChange}
            tabIndex={-1}
            aria-hidden="true"
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ color: 'var(--color-muted)' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-text)' }}>
              Drag and drop a file here
            </p>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
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
          <div className="loading-state" style={{ padding: '24px 0 0' }}>
            <div className="spinner" aria-hidden="true" />
            <ul className="loading-steps" role="status" aria-live="polite" aria-label="Upload progress">
              {UPLOAD_STEPS.map((step, i) => (
                <li key={step} className={`loading-step ${i === uploadStep ? 'active' : ''}`}>
                  <span aria-hidden="true">{i < uploadStep ? '✓' : i === uploadStep ? '→' : '○'}</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Upload error */}
        {uploadError && !uploading && (
          <div className="inline-notice error" style={{ marginTop: 12 }} role="alert">
            <span aria-hidden="true">⚠</span> {uploadError}
          </div>
        )}

        {/* Upload success */}
        {uploadedDoc && !uploading && (
          <div className="inline-notice success" style={{ marginTop: 12 }} role="status">
            <span aria-hidden="true">✓</span> <strong>{uploadedDoc.filename}</strong> uploaded and indexed successfully.
          </div>
        )}
      </Card>

      {/* Document list */}
      <div>
        <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 16 }}>Your materials</h2>

        {loadingDocs && <Spinner label="Loading your materials…" />}

        {docError && !loadingDocs && (
          <ErrorState
            title="Couldn't load materials"
            message={docError}
            onRetry={fetchDocuments}
          />
        )}

        {!loadingDocs && !docError && documents.length === 0 && (
          <EmptyState
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            }
            title="No study materials yet"
            description="Upload a PDF, PPTX or DOCX to start learning from your own material."
          />
        )}

        {!loadingDocs && !docError && documents.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {documents.map((doc) => (
              <DocumentCard
                key={doc.document_id}
                doc={doc}
                onDelete={handleDelete}
                onStudy={(d) => navigate(`/study/document/${d.document_id}?filename=${encodeURIComponent(d.filename)}`)}
                onQuiz={(d) => navigate(`/quizzes?source_type=document&source_id=${d.document_id}&filename=${encodeURIComponent(d.filename)}`)}
                onDoubt={(d) => navigate(`/doubts?document_id=${d.document_id}&filename=${encodeURIComponent(d.filename)}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
