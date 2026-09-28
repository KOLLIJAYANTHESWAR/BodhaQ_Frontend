/**
 * Progress bar component.
 */
export default function ProgressBar({ value = 0, max = 100, variant = '' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const colorVariant = pct >= 80 ? 'success' : pct >= 50 ? '' : 'error';

  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`${Math.round(pct)}% complete`}
    >
      <div
        className={`progress-bar-fill ${variant || colorVariant}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
