import React from 'react';
import './StatCard.css';

const StatCard = ({
  label,
  value,
  trend,
  trendLabel,
  icon: Icon,
  className = '',
  ...props
}) => {
  const trendDir = trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat';
  const trendArrow = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';

  return (
    <div className={`ui-stat-card ${className}`} {...props}>
      <div className="ui-stat-card__header">
        <span className="ui-stat-card__label">{label}</span>
        {Icon && (
          <span className="ui-stat-card__icon" aria-hidden="true">
            {typeof Icon === 'function' ? <Icon size={18} /> : Icon}
          </span>
        )}
      </div>
      <span className="ui-stat-card__value">{value}</span>
      {(trend !== undefined || trendLabel) && (
        <span className={`ui-stat-card__trend ui-stat-card__trend--${trendDir}`}>
          <span aria-hidden="true">{trendArrow}</span>
          {trendLabel || `${Math.abs(trend || 0)}%`}
        </span>
      )}
    </div>
  );
};

export default StatCard;
