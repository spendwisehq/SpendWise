import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, trendLabel, color, loading, subtitle }) => (
  <div className="stat-card">
    <div className="stat-card__header">
      <span className="stat-card__title">{title}</span>
      <div className="stat-card__icon" style={{ background: `${color}18`, color }}><Icon size={18}/></div>
    </div>
    {loading ? <div className="skeleton skeleton--value"/> : <div className="stat-card__value">{value}</div>}
    {subtitle && !loading && <div className="stat-card__subtitle">{subtitle}</div>}
    {trend !== undefined && !loading && (
      <div className={`stat-card__trend ${trend >= 0 ? 'stat-card__trend--up' : 'stat-card__trend--down'}`}>
        {trend >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
        <span>{Math.abs(trend)}% {trendLabel}</span>
      </div>
    )}
  </div>
);

export default StatCard;
