import React from 'react';
import './Card.css';

const Card = ({
  children,
  variant = 'surface',
  padding = 'md',
  className = '',
  as: Tag = 'div',
  ...props
}) => (
  <Tag className={`ui-card ui-card--${variant} ui-card--p-${padding} ${className}`} {...props}>
    {children}
  </Tag>
);

const CardHeader = ({ children, className = '' }) => (
  <div className={`ui-card__header ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`ui-card__title ${className}`}>{children}</h3>
);

Card.Header = CardHeader;
Card.Title = CardTitle;

export default Card;
