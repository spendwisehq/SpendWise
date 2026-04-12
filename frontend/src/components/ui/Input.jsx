import React, { forwardRef } from 'react';
import './Input.css';

const Input = forwardRef(({
  label,
  error,
  hint,
  required = false,
  size = 'md',
  as: Tag = 'input',
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="ui-input-wrapper">
      {label && (
        <label
          htmlFor={inputId}
          className={`ui-input-label${required ? ' ui-input-label--required' : ''}`}
        >
          {label}
        </label>
      )}
      <Tag
        ref={ref}
        id={inputId}
        className={`ui-input ui-input--${size}${error ? ' ui-input--error' : ''} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        required={required}
        {...props}
      />
      {error && <span id={errorId} className="ui-input-error" role="alert">{error}</span>}
      {hint && !error && <span className="ui-input-hint">{hint}</span>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
