import { get, del, postForm } from './client.js';

/**
 * Upload a document (PDF, PPTX, DOCX).
 *
 * Requires:
 * - Anonymous BodhaQ session
 * - Gemini API key for document processing/embeddings
 *
 * POST /api/documents/upload
 */
export function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  return postForm(
    '/api/documents/upload',
    formData,
    {},
    {
      includeGeminiKey: true,
    }
  );
}

/**
 * List all uploaded documents for the current
 * anonymous BodhaQ session.
 *
 * GET /api/documents
 */
export function listDocuments() {
  return get('/api/documents');
}

/**
 * Delete a document belonging to the current
 * anonymous BodhaQ session.
 *
 * DELETE /api/documents/{document_id}
 */
export function deleteDocument(documentId) {
  return del(
    `/api/documents/${documentId}`
  );
}