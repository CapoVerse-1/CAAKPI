import React, { useState, useMemo, useEffect } from 'react';
import './HistoryStats.css'; // We'll create this CSS file next
import { getStatClass } from './PromoterCard'; // Import the reusable function
// Import icons for change indicator
import { FiArrowUp, FiArrowDown, FiMinus } from 'react-icons/fi';

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
    return count > 0 ? (sum / count) : null; // Return null if no valid entries
};

// UPDATED Helper function to filter entries by a specific time window
const filterByTimeWindow = (entries, startDaysAgo, endDaysAgo) => {
    const today = new Date();
    
    const startDate = new Date();
    startDate.setDate(today.getDate() - startDaysAgo);
    startDate.setHours(0, 0, 0, 0); // Start of the start day

    const endDate = new Date();
    endDate.setDate(today.getDate() - endDaysAgo);
    endDate.setHours(23, 59, 59, 999); // End of the end day

    return entries.filter(entry => {
        if (!entry.savedAt) return false;
        const entryDate = new Date(entry.savedAt);
        return entryDate >= startDate && entryDate <= endDate;
    });
};

// NEW Helper function to calculate percentage change
const calculatePercentageChange = (currentAvg, previousAvg) => {
    if (previousAvg === null || previousAvg === 0 || currentAvg === null) {
        // If no valid previous data to compare against, or no current data, cannot calculate change.
        // The render function will handle displaying 0% or nothing based on context.
        return null; 
    }
    const change = ((currentAvg - previousAvg) / previousAvg) * 100;
    return change; // Can be positive, negative, or zero
};

// NEW Helper function to calculate point difference from ideal
const calculatePointDifference = (currentValue, idealValue) => {
    if (currentValue === null || idealValue === null || idealValue === undefined) {
        return null;
    }
    return currentValue - idealValue;
};

// Update props to accept selectedPromoter
function HistoryStats({ historyEntries, selectedPromoter }) {

    // State to store the last calculated *valid* percentage changes
    const [change30d, setChange30d] = useState({ mc_et: null, tma_anteil: null, vl_share: null });
    const [change6m, setChange6m] = useState({ mc_et: null, tma_anteil: null, vl_share: null });

    // Apply promoter filter first
    const filteredEntries = useMemo(() => {
        if (!selectedPromoter || selectedPromoter === 'All') {
            return historyEntries;
        }
        return historyEntries.filter(entry => entry.name === selectedPromoter);
    }, [historyEntries, selectedPromoter]);

    // Calculate current averages using filtered entries
    const currentStats = useMemo(() => {
        const last30DaysEntries = filterByTimeWindow(filteredEntries, 30, 0);
        const last6MonthsEntries = filterByTimeWindow(filteredEntries, 180, 0);
        const allTimeEntries = filteredEntries; // Use already filtered entries for all time

        const calculatePeriodStats = (entries) => ({
            count: entries.length,
            mc_et: calculateAverage(entries, 'mc_et'),
            tma_anteil: calculateAverage(entries, 'tma_anteil'),
            vl_share: calculateAverage(entries, 'vl_share'),
        });

        return {
            allTime: calculatePeriodStats(allTimeEntries),
            last30Days: calculatePeriodStats(last30DaysEntries),
            last6Months: calculatePeriodStats(last6MonthsEntries),
        };
    }, [filteredEntries]);

    // Effect to calculate and update persistent percentage changes using filtered entries
    useEffect(() => {
        // Calculate previous period averages using filtered entries
        const prev30DaysEntries = filterByTimeWindow(filteredEntries, 60, 31);
        const prev6MonthsEntries = filterByTimeWindow(filteredEntries, 360, 181);

        const calculatePeriodStats = (entries) => ({
            mc_et: calculateAverage(entries, 'mc_et'),
            tma_anteil: calculateAverage(entries, 'tma_anteil'),
            vl_share: calculateAverage(entries, 'vl_share'),
        });
        
        const prev30DayStats = calculatePeriodStats(prev30DaysEntries);
        const prev6MonthStats = calculatePeriodStats(prev6MonthsEntries);

        // --- Update 30-day change state --- 
        const updateChangeState = (currentAvg, previousAvg, key, setChangeState) => {
            const potentialChange = calculatePercentageChange(currentAvg, previousAvg);
            
            if (currentAvg !== null && previousAvg !== null) {
                 setChangeState(prev => ({ ...prev, [key]: potentialChange }));
            } else if (currentAvg === null) {
                setChangeState(prev => ({ ...prev, [key]: null }));
            } 
        };
        
        // Update using currentStats (which is already based on filteredEntries)
        updateChangeState(currentStats.last30Days.mc_et, prev30DayStats.mc_et, 'mc_et', setChange30d);
        updateChangeState(currentStats.last30Days.tma_anteil, prev30DayStats.tma_anteil, 'tma_anteil', setChange30d);
        updateChangeState(currentStats.last30Days.vl_share, prev30DayStats.vl_share, 'vl_share', setChange30d);
        
        updateChangeState(currentStats.last6Months.mc_et, prev6MonthStats.mc_et, 'mc_et', setChange6m);
        updateChangeState(currentStats.last6Months.tma_anteil, prev6MonthStats.tma_anteil, 'tma_anteil', setChange6m);
        updateChangeState(currentStats.last6Months.vl_share, prev6MonthStats.vl_share, 'vl_share', setChange6m);

    }, [filteredEntries, currentStats]); // Depend on filteredEntries and currentStats

    const formatStat = (value, isPercent = false) => {
        if (value === null) return 'N/A';
        return isPercent ? `${value.toFixed(1)}%` : value.toFixed(1);
    };

    // UPDATED renderStat: Now handles point difference and updated indicator styles
    const renderStat = (statName, currentValue, isPercent = false, changeValue = undefined, idealValue = undefined) => {
        const colorClassName = getStatClass(statName, currentValue);
        const formattedValue = formatStat(currentValue, isPercent);

        let ChangeIndicator = null;
        // Percentage Change Indicator (30d / 6m)
        if (changeValue !== undefined) {
            const showInitialZero = currentValue !== null && changeValue === null;
            if (changeValue !== null || showInitialZero) {
                const displayChange = showInitialZero ? 0 : changeValue;
                const changePercent = Math.abs(displayChange).toFixed(1);
                // Determine sign for percentage
                const sign = displayChange > 0 ? '+' : displayChange < 0 ? '-' : '';
                const indicatorClass = displayChange > 0 ? 'change-up' : displayChange < 0 ? 'change-down' : 'change-neutral';
                ChangeIndicator = (
                    // Remove icon, just show signed percentage
                    <span className={`stat-change ${indicatorClass}`}>
                        {`${sign}${changePercent}%`}
                    </span>
                );
            }
        }
        
        let DifferenceIndicator = null;
        // Point Difference Indicator (All Time)
        if (idealValue !== undefined && currentValue !== null) { 
            const difference = calculatePointDifference(currentValue, idealValue);
            if (difference !== null) { 
                 // Format difference without parentheses or pts
                const diffText = `${difference >= 0 ? '+' : ''}${difference.toFixed(1)}`;
                DifferenceIndicator = (
                    <span className={`stat-difference ${colorClassName}`}>
                        {diffText}
                    </span>
                );
            }
        }

        return (
            <>
                <span className={`stat-value ${colorClassName}`}>{formattedValue}</span>
                {ChangeIndicator}
                {DifferenceIndicator}
            </>
        );
    };

    // Define ideal start values
    const idealValues = {
        mc_et: 4.5,
        tma_anteil: 75,
        vl_share: 10
    };

    return (
        <div className="history-stats-container">
            <div className="stat-group">
                <h4>All Time ({currentStats.allTime.count})</h4>
                 {/* Pass idealValue for All Time stats */}
                <p>Avg MC/ET: {renderStat('MC/ET', currentStats.allTime.mc_et, false, undefined, idealValues.mc_et)}</p>
                <p>Avg TMA: {renderStat('TMA Anteil', currentStats.allTime.tma_anteil, true, undefined, idealValues.tma_anteil)}</p>
                <p>Avg VL Share: {renderStat('VL share', currentStats.allTime.vl_share, true, undefined, idealValues.vl_share)}</p>
            </div>
            <div className="stat-group">
                <h4>Last 30 Days ({currentStats.last30Days.count})</h4>
                 {/* Pass changeValue (state) for 30d stats */}
                <p>Avg MC/ET: {renderStat('MC/ET', currentStats.last30Days.mc_et, false, change30d.mc_et)}</p>
                <p>Avg TMA: {renderStat('TMA Anteil', currentStats.last30Days.tma_anteil, true, change30d.tma_anteil)}</p>
                <p>Avg VL Share: {renderStat('VL share', currentStats.last30Days.vl_share, true, change30d.vl_share)}</p>
            </div>
            <div className="stat-group">
                <h4>Last 6 Months ({currentStats.last6Months.count})</h4>
                 {/* Pass changeValue (state) for 6m stats */}
                <p>Avg MC/ET: {renderStat('MC/ET', currentStats.last6Months.mc_et, false, change6m.mc_et)}</p>
                <p>Avg TMA: {renderStat('TMA Anteil', currentStats.last6Months.tma_anteil, true, change6m.tma_anteil)}</p>
                <p>Avg VL Share: {renderStat('VL share', currentStats.last6Months.vl_share, true, change6m.vl_share)}</p>
            </div>
        </div>
    );
}

export default HistoryStats; 