import React from 'react';
import { Lightbulb } from 'lucide-react';
import { fmt } from '../../utils/format';

const INSIGHT_COLORS = { warning: '#EF9F27', tip: '#1D9E75', achievement: '#378ADD', alert: '#E85D24' };

const AIAnalysisPanel = ({ analysis, insights, currency }) => (
  <>
    {analysis && (
      <div className="ai-analysis">
        <div className="ai-analysis__header">
          <Lightbulb size={18} color="var(--color-warning)" />
          <h3>AI Analysis</h3>
          <span className={`health-badge health-badge--${analysis.analysis?.spendingHealth}`}>
            {analysis.analysis?.spendingHealth}
          </span>
        </div>
        <p className="ai-analysis__summary">{analysis.analysis?.summary}</p>
        <div className="ai-findings">
          {(analysis.analysis?.keyFindings || []).map((f, i) => (
            <div key={i} className="finding-item">
              <span className="finding-num">{i + 1}</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {insights.length > 0 && (
      <div className="insights-grid">
        {insights.map((insight, i) => (
          <div key={i} className="insight-card" style={{ borderLeftColor: INSIGHT_COLORS[insight.type] || '#888' }}>
            <div className="insight-card__header">
              <span className="insight-type" style={{ color: INSIGHT_COLORS[insight.type] }}>
                {insight.type?.toUpperCase()}
              </span>
              <span className={`priority-badge priority-badge--${insight.priority}`}>{insight.priority}</span>
            </div>
            <h4 className="insight-title">{insight.title}</h4>
            <p className="insight-msg">{insight.message}</p>
            {insight.potentialSaving > 0 && (
              <div className="insight-saving">
                💰 Save up to {fmt(insight.potentialSaving, currency)}/month
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </>
);

export default AIAnalysisPanel;
