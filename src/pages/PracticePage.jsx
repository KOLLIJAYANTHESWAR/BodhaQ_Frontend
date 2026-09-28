import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * PracticePage - Legacy redirect shim.
 *
 * Practice is now fully integrated into WeakTopicsPage.
 * This page exists only for backward-compatible routing (/practice).
 * 
 * If called with router state (topic, documentId, quizId), we forward
 * to /weak-topics so the unified practice engine handles it.
 * Otherwise redirect to /quizzes.
 */
export default function PracticePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { topic, documentId, quizId, sourceType, sourceId } = location.state || {};

  useEffect(() => {
    if (quizId) {
      navigate('/weak-topics', {
        replace: true,
        state: { topic, documentId, quizId, sourceType, sourceId },
        search: `?quiz_id=${quizId}&source_type=${sourceType || ''}&source_id=${encodeURIComponent(sourceId || documentId || '')}`,
      });
    } else {
      navigate('/quizzes', { replace: true });
    }
  }, []); // eslint-disable-line

  return null;
}
