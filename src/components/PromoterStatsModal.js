import React, { useMemo, useState } from 'react';
import { FiTrendingUp, FiPieChart, FiPercent, FiX, FiCalendar, FiArrowUp, FiArrowDown, FiMinusCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { getStatClass } from './PromoterCard'; // Assuming getStatClass is exported from PromoterCard.js
import './PromoterStatsModal.css';

// Helper function to calculate average, ignoring null/undefined
const calculateAverage = (entries, key) => {
    let sum = 0;
    let count = 0;
    entries.forEach(entry => {
        const value = entry[key];
        if (value !== null && value !== undefined && !isNaN(value)) {
            sum += parseFloat(value);
            count++;
        }
    });
    return count > 0 ? (sum / count) : null;
};

// Helper function to filter entries by a specific time window (using savedAt or created_at)
const filterByTimeWindow = (entries, startDaysAgo, endDaysAgo = 0) => { // endDaysAgo defaults to 0 for "up to today"
    const today = new Date();
    
    const startDate = new Date();
    startDate.setDate(today.getDate() - startDaysAgo);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setDate(today.getDate() - endDaysAgo);
    endDate.setHours(23, 59, 59, 999);

    return entries.filter(entry => {
        const entryDateStr = entry.savedAt || entry.created_at; // Use history save timestamp or fallback
        if (!entryDateStr) return false;
        const entryDate = new Date(entryDateStr);
        return entryDate >= startDate && entryDate <= endDate;
    });
};

const formatDate = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (e) {
    return 'Invalid Date';
  }
};

// NEW: Helper to calculate percentage change
const calculatePercentageChange = (current, previous) => {
  if (current === null || previous === null || previous === 0) {
    return null; // Not calculable or division by zero
  }
  return ((current - previous) / previous) * 100;
};

function PromoterStatsModal({ isOpen, onClose, promoter, historyEntries }) {
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const allPromoterHistoryEntries = useMemo(() => 
    (historyEntries || [])
      .filter(entry => promoter && entry.name === promoter.name) // Ensure promoter exists before accessing promoter.name
      .sort((a, b) => new Date(b.savedAt || b.created_at) - new Date(a.savedAt || a.created_at)), 
    [historyEntries, promoter]
  );

  const averages = useMemo(() => {
    if (!promoter) return { allTime: {count:0}, last30Days: {count:0}, last6Months: {count:0} }; // Default if promoter is null
    const last30DaysEntries = filterByTimeWindow(allPromoterHistoryEntries, 30);
    const last6MonthsEntries = filterByTimeWindow(allPromoterHistoryEntries, 180);
    
    const calculatePeriodStats = (entries) => ({
        count: entries.length,
        mc_et: calculateAverage(entries, 'mc_et'),
        tma_anteil: calculateAverage(entries, 'tma_anteil'),
        vl_share: calculateAverage(entries, 'vl_share'),
    });

    return {
        allTime: calculatePeriodStats(allPromoterHistoryEntries),
        last30Days: calculatePeriodStats(last30DaysEntries),
        last6Months: calculatePeriodStats(last6MonthsEntries),
    };
  }, [allPromoterHistoryEntries, promoter]);

  if (!isOpen || !promoter) return null; // Early return after all hooks

  // The rest of the component logic can now safely use the memoized values
  const mcEtClass = getStatClass('MC/ET', promoter.mc_et);
  const tmaAnteilClass = getStatClass('TMA Anteil', promoter.tma_anteil);
  const vlShareClass = getStatClass('VL share', promoter.vl_share);

  const mostRecentHistoryEntry = allPromoterHistoryEntries.length > 0 ? allPromoterHistoryEntries[0] : null;
  const isFirstEverEntry = allPromoterHistoryEntries.length === 0;

  const mcEtChange = !isFirstEverEntry && mostRecentHistoryEntry ? calculatePercentageChange(promoter.mc_et, mostRecentHistoryEntry.mc_et) : null;
  const tmaChange = !isFirstEverEntry && mostRecentHistoryEntry ? calculatePercentageChange(promoter.tma_anteil, mostRecentHistoryEntry.tma_anteil) : null;
  const vlShareChange = !isFirstEverEntry && mostRecentHistoryEntry ? calculatePercentageChange(promoter.vl_share, mostRecentHistoryEntry.vl_share) : null;

  const formatStatDisplay = (value, isPercent = false) => {
    if (value === null || value === undefined) return 'N/A';
    return isPercent ? `${value.toFixed(0)}%` : value.toFixed(1);
  };

  const renderChangeIndicator = (change, isFirstEntryForThisPromoter) => {
    if (isFirstEntryForThisPromoter) {
      return (
        <span className="stat-change-indicator neutral placeholder">
          <FiMinusCircle className="icon" /> 0.0%
        </span>
      );
    }
    
    if (change === null) {
      // Not the first entry, but change is null (e.g. previous was 0, current is null for calculation)
      return null; // Or some other placeholder like '-'
    }

    const displayValue = change.toFixed(1);
    let Icon = FiMinusCircle;
    let colorClass = 'neutral';

    // Use a small threshold to determine if change is significant enough for up/down icon
    if (change > 0.05) { 
      Icon = FiArrowUp;
      colorClass = 'up';
    } else if (change < -0.05) {
      Icon = FiArrowDown;
      colorClass = 'down';
    }
    
    return (
      <span className={`stat-change-indicator ${colorClass}`}>
        <Icon className="icon" /> {`${change > 0.05 ? '+' : ''}${displayValue}%`}
      </span>
    );
  };

  const toggleHistoryExpansion = () => {
    setIsHistoryExpanded(!isHistoryExpanded);
  };

  // Determine which entries to show based on expansion state
  const visibleEntries = allPromoterHistoryEntries.slice(0, 2);
  const blurredEntries = allPromoterHistoryEntries.slice(2, 5);
  const hiddenEntries = allPromoterHistoryEntries.slice(5);
  const entriesToDisplay = isHistoryExpanded ? allPromoterHistoryEntries : visibleEntries;
  const showBlurred = !isHistoryExpanded && blurredEntries.length > 0;

  const renderHistoryEntry = (entry, isBlurred = false) => {
    const entryMcEtClass = getStatClass('MC/ET', entry.mc_et);
    const entryTmaClass = getStatClass('TMA Anteil', entry.tma_anteil);
    const entryVlClass = getStatClass('VL share', entry.vl_share);
    return (
      <li key={entry.id || entry.original_id || entry.historyId} className={`history-list-item ${isBlurred ? 'blurred-entry' : ''}`}>
        <div className="history-item-date">
          <FiCalendar className="icon"/> {formatDate(entry.savedAt || entry.created_at || entry.date)}
        </div>
        <div className="history-item-stats">
          <span className={`stat ${entryMcEtClass}`}>MC/ET: {formatStatDisplay(entry.mc_et)}</span>
          <span className={`stat ${entryTmaClass}`}>TMA: {formatStatDisplay(entry.tma_anteil, true)}</span>
          <span className={`stat ${entryVlClass}`}>VL: {formatStatDisplay(entry.vl_share, true)}</span>
        </div>
      </li>
    );
  };

  return (
    <div className="modal-backdrop visible" onClick={onClose}>
      <div className="modal-content promoter-stats-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>
          <FiX />
        </button>
        <h2>{promoter.name} - Stats Overview</h2>
        
        <div className="current-stats-overview">
          <div className="stat-item">
            <span className="stat-label"><FiTrendingUp className="icon stat-icon"/> MC/ET:</span>
            <div className="stat-value-container">
                <span className={`stat-value ${mcEtClass}`}>{formatStatDisplay(promoter.mc_et)}</span>
                {renderChangeIndicator(mcEtChange, isFirstEverEntry)}
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-label"><FiPieChart className="icon stat-icon"/> TMA:</span>
            <div className="stat-value-container">
                <span className={`stat-value ${tmaAnteilClass}`}>{formatStatDisplay(promoter.tma_anteil, true)}</span>
                {renderChangeIndicator(tmaChange, isFirstEverEntry)}
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-label"><FiPercent className="icon stat-icon"/> VL:</span>
            <div className="stat-value-container">
                <span className={`stat-value ${vlShareClass}`}>{formatStatDisplay(promoter.vl_share, true)}</span>
                {renderChangeIndicator(vlShareChange, isFirstEverEntry)}
            </div>
          </div>
        </div>

        <div className="historical-entries-section">
          <div className="history-section-header">
            <h4>History</h4>
            {allPromoterHistoryEntries.length > 2 && (
              <button onClick={toggleHistoryExpansion} className="expand-history-button" title={isHistoryExpanded ? "Show less" : "Show more"}>
                {isHistoryExpanded ? <FiChevronUp /> : <FiChevronDown />}
              </button>
            )}
          </div>
          {allPromoterHistoryEntries.length > 0 ? (
            <div className={`promoter-history-list-container ${isHistoryExpanded ? 'expanded' : ''}`}>
              <ul className="promoter-history-list">
                {entriesToDisplay.map(entry => renderHistoryEntry(entry, false))}
                {showBlurred && blurredEntries.map(entry => renderHistoryEntry(entry, true))}
              </ul>
              {!isHistoryExpanded && allPromoterHistoryEntries.length > 5 && (
                <div className="history-fade-overlay">
                  <FiChevronDown className="overlay-expand-icon" onClick={toggleHistoryExpansion} />
                </div>
              )}
            </div>
          ) : (
            <p><em>No historical entries found for this promoter.</em></p>
          )}
        </div>

        <div className="promoter-averages-section">
          <h4>Performance Averages</h4>
          {allPromoterHistoryEntries.length > 0 || promoter ? (
            <div className="averages-grid">
              <div className="average-period">
                <h5>All Time ({averages.allTime.count})</h5>
                <p>MC/ET: <span className={getStatClass('MC/ET', averages.allTime.mc_et)}>{formatStatDisplay(averages.allTime.mc_et)}</span></p>
                <p>TMA: <span className={getStatClass('TMA Anteil', averages.allTime.tma_anteil)}>{formatStatDisplay(averages.allTime.tma_anteil, true)}</span></p>
                <p>VL Share: <span className={getStatClass('VL share', averages.allTime.vl_share)}>{formatStatDisplay(averages.allTime.vl_share, true)}</span></p>
              </div>
              <div className="average-period">
                <h5>Last 30 Days ({averages.last30Days.count})</h5>
                <p>MC/ET: <span className={getStatClass('MC/ET', averages.last30Days.mc_et)}>{formatStatDisplay(averages.last30Days.mc_et)}</span></p>
                <p>TMA: <span className={getStatClass('TMA Anteil', averages.last30Days.tma_anteil)}>{formatStatDisplay(averages.last30Days.tma_anteil, true)}</span></p>
                <p>VL Share: <span className={getStatClass('VL share', averages.last30Days.vl_share)}>{formatStatDisplay(averages.last30Days.vl_share, true)}</span></p>
              </div>
              <div className="average-period">
                <h5>Last 6 Months ({averages.last6Months.count})</h5>
                <p>MC/ET: <span className={getStatClass('MC/ET', averages.last6Months.mc_et)}>{formatStatDisplay(averages.last6Months.mc_et)}</span></p>
                <p>TMA: <span className={getStatClass('TMA Anteil', averages.last6Months.tma_anteil)}>{formatStatDisplay(averages.last6Months.tma_anteil, true)}</span></p>
                <p>VL Share: <span className={getStatClass('VL share', averages.last6Months.vl_share)}>{formatStatDisplay(averages.last6Months.vl_share, true)}</span></p>
              </div>
            </div>
          ) : (
            <p><em>Not enough historical data to calculate averages.</em></p>
          )}
        </div>

      </div>
    </div>
  );
}

export default PromoterStatsModal; 