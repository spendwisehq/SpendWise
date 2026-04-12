import React from 'react';
import './EmptyState.css';

const EmptyState = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div className={`ui-empty ${className}`}>
    {icon && (
      <div className="ui-empty__illustration" aria-hidden="true">
        {icon}
      </div>
    )}
    {title && <h3 className="ui-empty__title">{title}</h3>}
    {description && <p className="ui-empty__description">{description}</p>}
    {action && <div className="ui-empty__action">{action}</div>}
  </div>
);

export default EmptyState;
