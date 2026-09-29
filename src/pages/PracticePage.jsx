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

  const {
    topic,
    documentId,
    quizId,
    sourceType,
    sourceId,
  } = location.state || {};

  useEffect(() => {
    if (quizId) {
      const params = new URLSearchParams();

      params.set('quiz_id', quizId);

      if (sourceType) {
        params.set('source_type', sourceType);
      }

      const resolvedSourceId = sourceId || documentId;

      if (resolvedSourceId) {
        params.set('source_id', resolvedSourceId);
      }

      navigate('/weak-topics', {
        replace: true,
        state: {
          topic,
          documentId,
          quizId,
          sourceType,
          sourceId,
        },
        search: `?${params.toString()}`,
      });

      return;
    }

    navigate('/quizzes', {
      replace: true,
    });
  }, [
    navigate,
    topic,
    documentId,
    quizId,
    sourceType,
    sourceId,
  ]);

  return null;
}