import React, { useState, useMemo } from 'react';
import { FiX, FiTrendingUp, FiPieChart, FiPercent, FiAward } from 'react-icons/fi';
import './RanksModal.css';
import { getStatClass } from './PromoterCard';

const METRICS = {
  mc_et: { key: 'mc_et', name: 'MC/ET', rankKey: 'mc_et_rank', unit: '', toFixed: 1 },
  tma_anteil: { key: 'tma_anteil', name: 'TMA Anteil', rankKey: 'tma_anteil_rank', unit: '%', toFixed: 0 },
  vl_share: { key: 'vl_share', name: 'VL share', rankKey: 'vl_share_rank', unit: '%', toFixed: 0 },
};

function RanksModal({ isOpen, onClose, promoters }) {
  const [activeTab, setActiveTab] = useState(METRICS.mc_et.key);

  const rankedPromoters = useMemo(() => {
    if (!promoters || promoters.length === 0) {
      return [];
    }
    const metricConfig = METRICS[activeTab];
    return promoters
      .filter(p => p[metricConfig.rankKey] !== null && p[metricConfig.rankKey] !== undefined && p[metricConfig.key] !== null && p[metricConfig.key] !== undefined)
      .sort((a, b) => {
        // Primary sort by rank (ascending, so 1st place comes first)
        const rankDiff = a[metricConfig.rankKey] - b[metricConfig.rankKey];
        if (rankDiff !== 0) return rankDiff;
        // Secondary sort by value (descending, higher value is better within the same rank)
        const valueA = parseFloat(a[metricConfig.key]);
        const valueB = parseFloat(b[metricConfig.key]);
        if (!isNaN(valueA) && !isNaN(valueB)) {
            return valueB - valueA;
        }
        return 0;
      });
  }, [promoters, activeTab]);

  if (!isOpen) {
    return null;
  }

  const getIconForMetric = (metricKey) => {
    switch (metricKey) {
      case METRICS.mc_et.key:
        return <FiTrendingUp />;
      case METRICS.tma_anteil.key:
        return <FiPieChart />;
      case METRICS.vl_share.key:
        return <FiPercent />;
      default:
        return <FiAward />;
    }
  };

  return (
    <div className="modal-backdrop visible" onClick={onClose}>
      <div className="modal-content ranks-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose} title="Close">
          <FiX />
        </button>
        <h2>Promoter Rankings</h2>
        
        <div className="ranks-modal-tabs">
          {Object.values(METRICS).map(metric => (
            <button
              key={metric.key}
              className={`ranks-tab-button ${activeTab === metric.key ? 'active' : ''}`}
              onClick={() => setActiveTab(metric.key)}
            >
              {getIconForMetric(metric.key)} {metric.name}
            </button>
          ))}
        </div>

        <div className="ranks-list-container">
          {rankedPromoters.length > 0 ? (
            <ul className="ranks-list">
              {rankedPromoters.map((promoter) => {
                const metricConfig = METRICS[activeTab];
                const value = promoter[metricConfig.key];
                const numericValue = parseFloat(value);
                const displayValue = !isNaN(numericValue) 
                  ? numericValue.toFixed(metricConfig.toFixed) + metricConfig.unit
                  : 'N/A';
                
                const colorClass = getStatClass(metricConfig.name, numericValue);

                let rankNumberClass = "rank-number";
                const rank = promoter[metricConfig.rankKey];
                if (rank === 1) {
                  rankNumberClass += " rank-gold";
                } else if (rank === 2) {
                  rankNumberClass += " rank-silver";
                } else if (rank === 3) {
                  rankNumberClass += " rank-bronze";
                }

                return (
                  <li key={promoter.id} className="rank-item">
                    <span className={rankNumberClass}>
                      <span className="rank-digit">{rank}.</span>
                      {(rank === 1 || rank === 2 || rank === 3) && 
                        <FiAward className="rank-medal-icon" />
                      }
                    </span>
                    <span className="promoter-name">{promoter.name}</span>
                    <span className={`metric-value ${colorClass}`}>{displayValue}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="info-message">No promoters with valid data for this ranking.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default RanksModal; 