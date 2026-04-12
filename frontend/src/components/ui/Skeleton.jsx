import React from 'react';
import './Skeleton.css';

const Skeleton = ({
  shape = 'rect',
  width,
  height,
  className = '',
  count = 1,
  ...props
}) => {
  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  if (count > 1) {
    return (
      <div className="ui-skeleton-stack" aria-busy="true" aria-label="Loading">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className={`ui-skeleton ui-skeleton--${shape} ${className}`}
            style={{ ...style, width: shape === 'text' && i === count - 1 ? '75%' : style.width }}
            {...props}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`ui-skeleton ui-skeleton--${shape} ${className}`}
      style={style}
      aria-busy="true"
      aria-label="Loading"
      {...props}
    />
  );
};

export default Skeleton;
