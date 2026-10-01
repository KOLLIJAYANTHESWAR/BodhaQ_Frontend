/**
 * Reusable Button component.
 */
export default function Button({
  children,
  variant = 'primary',
  size = '',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  ...rest
}) {
  const variants = {
    primary: {
      background: '#2563eb',
      color: '#ffffff',
      border: '1px solid #2563eb',
      shadow: '0 4px 12px rgba(37, 99, 235, 0.20)',
    },

    secondary: {
      background: '#ffffff',
      color: '#1e293b',
      border: '1px solid #cbd5e1',
      shadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
    },

    success: {
      background: '#16a34a',
      color: '#ffffff',
      border: '1px solid #16a34a',
      shadow: '0 4px 12px rgba(22, 163, 74, 0.20)',
    },

    danger: {
      background: '#dc2626',
      color: '#ffffff',
      border: '1px solid #dc2626',
      shadow: '0 4px 12px rgba(220, 38, 38, 0.20)',
    },

    warning: {
      background: '#d97706',
      color: '#ffffff',
      border: '1px solid #d97706',
      shadow: '0 4px 12px rgba(217, 119, 6, 0.20)',
    },

    ghost: {
      background: 'transparent',
      color: '#475569',
      border: '1px solid transparent',
      shadow: 'none',
    },

    outline: {
      background: 'transparent',
      color: '#2563eb',
      border: '1px solid #2563eb',
      shadow: 'none',
    },
  };

  const sizes = {
    sm: {
      minHeight: '34px',
      padding: '0.5rem 0.8rem',
      fontSize: '0.82rem',
      borderRadius: '8px',
    },

    md: {
      minHeight: '42px',
      padding: '0.7rem 1.05rem',
      fontSize: '0.92rem',
      borderRadius: '10px',
    },

    lg: {
      minHeight: '48px',
      padding: '0.82rem 1.3rem',
      fontSize: '1rem',
      borderRadius: '11px',
    },

    default: {
      minHeight: '42px',
      padding: '0.7rem 1.05rem',
      fontSize: '0.92rem',
      borderRadius: '10px',
    },
  };

  const selectedVariant =
    variants[variant] || variants.primary;

  const selectedSize =
    sizes[size] || sizes.default;

  const buttonStyle = {
    ...selectedVariant,
    ...selectedSize,

    position: 'relative',

    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.55rem',

    boxSizing: 'border-box',

    fontFamily: 'inherit',
    fontWeight: 650,
    lineHeight: 1,
    letterSpacing: '-0.01em',

    whiteSpace: 'nowrap',
    textDecoration: 'none',
    userSelect: 'none',

    cursor: disabled || loading
      ? 'not-allowed'
      : 'pointer',

    opacity: disabled
      ? 0.55
      : 1,

    transition:
      'transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease',

    outline: 'none',

    ...rest.style,
  };

  const handleMouseEnter = (event) => {
    if (!disabled && !loading) {
      event.currentTarget.style.transform =
        'translateY(-1px)';

      if (variant === 'primary') {
        event.currentTarget.style.background =
          '#1d4ed8';
        event.currentTarget.style.borderColor =
          '#1d4ed8';
      }

      if (variant === 'success') {
        event.currentTarget.style.background =
          '#15803d';
        event.currentTarget.style.borderColor =
          '#15803d';
      }

      if (variant === 'danger') {
        event.currentTarget.style.background =
          '#b91c1c';
        event.currentTarget.style.borderColor =
          '#b91c1c';
      }

      if (variant === 'warning') {
        event.currentTarget.style.background =
          '#b45309';
        event.currentTarget.style.borderColor =
          '#b45309';
      }

      if (variant === 'secondary') {
        event.currentTarget.style.background =
          '#f8fafc';
        event.currentTarget.style.borderColor =
          '#94a3b8';
      }

      if (variant === 'ghost') {
        event.currentTarget.style.background =
          '#f1f5f9';
      }

      if (variant === 'outline') {
        event.currentTarget.style.background =
          '#eff6ff';
      }
    }

    rest.onMouseEnter?.(event);
  };

  const handleMouseLeave = (event) => {
    if (!disabled && !loading) {
      event.currentTarget.style.transform =
        'translateY(0)';

      event.currentTarget.style.background =
        selectedVariant.background;

      event.currentTarget.style.borderColor =
        selectedVariant.border.replace(
          /^.*\s/,
          ''
        );
    }

    rest.onMouseLeave?.(event);
  };

  const handleMouseDown = (event) => {
    if (!disabled && !loading) {
      event.currentTarget.style.transform =
        'translateY(1px)';
    }

    rest.onMouseDown?.(event);
  };

  const handleMouseUp = (event) => {
    if (!disabled && !loading) {
      event.currentTarget.style.transform =
        'translateY(-1px)';
    }

    rest.onMouseUp?.(event);
  };

  return (
    <button
      {...rest}
      type={type}
      className={className}
      style={buttonStyle}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      aria-busy={loading}
    >
      {loading && (
        <span
          aria-hidden="true"
          style={{
            width: '15px',
            height: '15px',
            flex: '0 0 15px',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation:
              'button-spin 650ms linear infinite',
          }}
        />
      )}

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </span>

      <style>
        {`
          @keyframes button-spin {
            to {
              transform: rotate(360deg);
            }
          }

          button:focus-visible {
            outline: 3px solid rgba(37, 99, 235, 0.28);
            outline-offset: 2px;
          }
        `}
      </style>
    </button>
  );
}