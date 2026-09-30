/**
 * Progress bar component.
 */
export default function ProgressBar({ value = 0, max = 100, variant = '' }) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? value : 0;
  const clampedValue = Math.min(safeMax, Math.max(0, safeValue));
  const pct = (clampedValue / safeMax) * 100;

  const colorVariant =
    pct >= 80 ? 'success' : pct >= 50 ? '' : 'error';

  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-label={`${Math.round(pct)}% complete`}
    >
      <div
        className={`progress-bar-fill ${variant || colorVariant}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}