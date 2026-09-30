/**
 * Animated loading state with descriptive steps.
 */
export default function Spinner({
  size = '',
  label = 'Loading...',
}) {
  return (
    <div
      className="loading-state"
      role="status"
      aria-live="polite"
    >
      <div
        className={`spinner ${size === 'lg' ? 'spinner-lg' : ''}`}
        aria-hidden="true"
      />

      <p className="loading-text">
        {label}
      </p>
    </div>
  );
}

/**
 * Multi-step loading indicator.
 */
export function LoadingSteps({
  steps,
  currentStep,
}) {
  const safeSteps = Array.isArray(steps)
    ? steps
      .map((step) => {
        if (typeof step === 'string') {
          return step;
        }

        if (
          typeof step === 'number' ||
          typeof step === 'boolean'
        ) {
          return String(step);
        }

        return null;
      })
      .filter((step) => step !== null)
    : [];

  if (safeSteps.length === 0) {
    return (
      <div
        className="loading-state"
        role="status"
        aria-live="polite"
      >
        <div
          className="spinner spinner-lg"
          aria-hidden="true"
        />
      </div>
    );
  }

  const numericStep = Number(currentStep);

  const safeCurrentStep = Number.isFinite(numericStep)
    ? Math.min(
      Math.max(Math.floor(numericStep), 0),
      safeSteps.length - 1
    )
    : 0;

  return (
    <div
      className="loading-state"
      role="status"
      aria-live="polite"
    >
      <div
        className="spinner spinner-lg"
        aria-hidden="true"
      />

      <ul
        className="loading-steps"
        aria-label="Progress"
      >
        {safeSteps.map((step, index) => {
          const isActive = index === safeCurrentStep;
          const isCompleted = index < safeCurrentStep;

          return (
            <li
              key={`${step}-${index}`}
              className={`loading-step ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'step' : undefined}
            >
              <span aria-hidden="true">
                {isCompleted
                  ? '✓'
                  : isActive
                    ? '→'
                    : '○'}
              </span>

              {step}
            </li>
          );
        })}
      </ul>
    </div>
  );
}