import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import PageHeader from '../components/common/PageHeader.jsx';

/**
 * Document Learning page.
 * Shown when user selects "Study" on a specific uploaded document.
 */
export default function DocumentStudyPage() {
  const { documentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const filename = searchParams.get('filename') || 'Document';

  const ext = filename.split('.').pop()?.toUpperCase() || '';

  return (
    <div className="page-content">
      <PageHeader
        title="Study Material"
        subtitle="Choose how you want to work with this material."
      />

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, background: 'var(--color-primary-light)',
            borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--color-primary)',
            fontWeight: 700, fontSize: 'var(--font-size-lg)',
          }}>
            {ext}
          </div>
          <div>
            <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 4 }}>{filename}</h2>
            <span className="badge badge-green">✓ Ready to learn</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate(`/quizzes?source_type=document&source_id=${documentId}&filename=${encodeURIComponent(filename)}`)}
          >
            Take Quiz
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(`/doubts?document_id=${documentId}&filename=${encodeURIComponent(filename)}`)}
          >
            Ask a Doubt
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/materials')}
          >
            ← Back to Materials
          </Button>
        </div>
      </Card>

      <Card>
        <h3 style={{ marginBottom: 12 }}>What you can do with this material</h3>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { icon: '📝', label: 'Take a Quiz', desc: 'Generate questions based on this document.' },
            { icon: '💬', label: 'Ask a Doubt', desc: 'Ask questions — answers are grounded in your material.' },
            { icon: '🎯', label: 'Targeted Practice', desc: 'After a quiz, practice your learning gaps.' },
          ].map(({ icon, label, desc }) => (
            <li key={label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20 }} aria-hidden="true">{icon}</span>
              <div>
                <strong style={{ color: 'var(--color-text)', display: 'block', marginBottom: 2 }}>{label}</strong>
                <span style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>{desc}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
