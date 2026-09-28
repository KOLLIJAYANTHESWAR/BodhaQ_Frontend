import { get, del, postForm } from './client.js';

/**
 * Upload a document (PDF, PPTX, DOCX).
 * POST /api/documents/upload  (multipart/form-data)
 */
export function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  return postForm('/api/documents/upload', formData);
}

/**
 * List all uploaded documents.
 * GET /api/documents
 */
export function listDocuments() {
  return get('/api/documents');
}

/**
 * Delete a document.
 * DELETE /api/documents/{document_id}
 */
export function deleteDocument(documentId) {
  return del(`/api/documents/${documentId}`);
}
