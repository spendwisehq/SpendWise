import React from 'react';
import './Badge.css';

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => (
  <span className={`ui-badge ui-badge--${variant} ui-badge--${size} ${className}`} {...props}>
    {dot && <span className="ui-badge__dot" aria-hidden="true" />}
    {children}
  </span>
);

export default Badge;
