// frontend/src/pages/Goals.jsx

import React from 'react';
import { Target, TrendingUp, Plus, Lightbulb, Trophy, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGoals } from '../hooks/useGoals';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import './Goals.css';

const fmt = (v, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);

const Goals = () => {
  const { user } = useAuth();
  const currency = user?.currency || 'INR';

  const { stats, isLoading: loading, score, recommendations: recs, forecast, aiLoading, fetchAIData } = useGoals();

  const thisMonth = stats?.thisMonth || {};
  const savingsRate = thisMonth.totalIncome > 0
    ? Math.round((thisMonth.netSavings / thisMonth.totalIncome) * 100)
    : 0;

  const gradeColor = (g) => {
    if (!g) return 'var(--color-text-muted)';
    if (g.startsWith('A')) return 'var(--color-success)';
    if (g.startsWith('B')) return 'var(--color-info)';
    if (g.startsWith('C')) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  return (
    <div className="goals-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Goals & Score</h1>
          <p className="page-subtitle">Track your financial health and goals</p>
        </div>
        <button className="btn btn--primary" onClick={fetchAIData} disabled={aiLoading}>
          {aiLoading ? <RefreshCw size={16} className="spin" /> : <Lightbulb size={16} />}
          Get AI Analysis
        </button>
      </div>

      {/* Quick Stats */}
      <div className="goals-stats">
        {[
          { label: 'This Month Spent', value: fmt(thisMonth.totalExpense || 0, currency), color: 'var(--color-danger)' },
          { label: 'This Month Income', value: fmt(thisMonth.totalIncome || 0, currency), color: 'var(--color-success)' },
          { label: 'Net Savings', value: fmt(thisMonth.netSavings || 0, currency), color: 'var(--color-info)' },
          { label: 'Savings Rate', value: `${savingsRate}%`, color: savingsRate >= 20 ? 'var(--color-success)' : savingsRate >= 10 ? 'var(--color-warning)' : 'var(--color-danger)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-pill">
            <div className="stat-pill__value" style={{ color }}>{loading ? <Skeleton shape="text" width="80px" height="20px" /> : value}</div>
            <div className="stat-pill__label">{label}</div>
          </div>
        ))}
      </div>

      {/* Financial Score */}
      {score ? (
        <div className="score-card">
          <div className="score-card__left">
            <div className="score-circle" style={{ '--score-color': gradeColor(score.grade) }}>
              <div className="score-circle__value">{score.score}</div>
              <div className="score-circle__grade" style={{ color: gradeColor(score.grade) }}>{score.grade}</div>
            </div>
          </div>
          <div className="score-card__right">
            <h2 className="score-label">{score.label}</h2>
            <p className="score-summary">{score.summary}</p>
            <div className="score-breakdown">
              {Object.entries(score.breakdown || {}).map(([key, val]) => (
                <div key={key} className="breakdown-item">
                  <span className="breakdown-label">{key.replace('Score', '').replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="breakdown-bar">
                    <div className="breakdown-fill" style={{ width: `${(val / 25) * 100}%` }} />
                  </div>
                  <span className="breakdown-val">{val}/25</span>
                </div>
              ))}
            </div>
            <div className="score-lists">
              {score.strengths?.length > 0 && (
                <div>
                  <h4>Strengths</h4>
                  {score.strengths.map((s, i) => <p key={i} className="score-list-item">{s}</p>)}
                </div>
              )}
              {score.weaknesses?.length > 0 && (
                <div>
                  <h4>Improve</h4>
                  {score.weaknesses.map((w, i) => <p key={i} className="score-list-item">{w}</p>)}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<Trophy size={36} color="var(--color-warning)" />}
          title="Get Your Financial Score"
          description="Click 'Get AI Analysis' to see your personalized financial health score and recommendations"
        />
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <div className="recs-section">
          <h3 className="section-title">AI Recommendations</h3>
          <div className="recs-grid">
            {recs.map((rec, i) => (
              <div key={i} className={`rec-card rec-card--${rec.impact}`}>
                <div className="rec-card__header">
                  <span className={`impact-badge impact-badge--${rec.impact}`}>{rec.impact} impact</span>
                  {rec.estimatedMonthlySaving > 0 && (
                    <span className="saving-chip">Save {fmt(rec.estimatedMonthlySaving, currency)}/mo</span>
                  )}
                </div>
                <h4 className="rec-title">{rec.title}</h4>
                <p className="rec-desc">{rec.description}</p>
                {rec.actionSteps?.length > 0 && (
                  <div className="action-steps">
                    {rec.actionSteps.map((step, j) => (
                      <div key={j} className="action-step">
                        <span className="action-step__num">{j + 1}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forecast */}
      {forecast?.forecast?.forecast?.length > 0 && (
        <div className="forecast-section">
          <h3 className="section-title">3-Month Forecast</h3>
          <div className="forecast-grid">
            {forecast.forecast.forecast.slice(0, 3).map((f, i) => (
              <div key={i} className="forecast-card">
                <div className="forecast-month">{f.month}</div>
                <div className="forecast-amount">{fmt(f.totalExpense, currency)}</div>
                <div className="forecast-savings" style={{ color: f.netSavings >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {f.netSavings >= 0 ? '+' : ''}{fmt(f.netSavings, currency)} savings
                </div>
                <div className="forecast-confidence">
                  <div className="confidence-bar" style={{ width: `${f.confidence}%` }} />
                  <span>{f.confidence}% confidence</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
