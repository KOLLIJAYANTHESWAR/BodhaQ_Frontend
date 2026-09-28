/**
 * Animated loading state with descriptive steps.
 */
export default function Spinner({ size = '', label = 'Loading...' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className={`spinner ${size === 'lg' ? 'spinner-lg' : ''}`} aria-hidden="true" />
      <p className="loading-text">{label}</p>
    </div>
  );
}

/**
 * Multi-step loading indicator.
 */
export function LoadingSteps({ steps, currentStep }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="spinner spinner-lg" aria-hidden="true" />
      <ul className="loading-steps" aria-label="Progress">
        {steps.map((step, i) => (
          <li
            key={step}
            className={`loading-step ${i === currentStep ? 'active' : ''}`}
            aria-current={i === currentStep ? 'step' : undefined}
          >
            <span aria-hidden="true">{i < currentStep ? '✓' : i === currentStep ? '→' : '○'}</span>
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}
