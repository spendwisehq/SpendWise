import React from 'react';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  type = 'button',
  className = '',
  ...props
}) => (
  <button
    type={type}
    className={`ui-btn ui-btn--${variant} ui-btn--${size} ${className}`}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...props}
  >
    {loading ? <span className="ui-btn__spinner" aria-hidden="true" /> : Icon && <Icon size={size === 'sm' ? 14 : 16} aria-hidden="true" />}
    {children && <span>{children}</span>}
  </button>
);

export default Button;
