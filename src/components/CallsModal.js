import React, { useState } from 'react';
import { FiX, FiTrash2, FiCheck } from 'react-icons/fi';
import './CallsModal.css';

// Simple hash function to get a number from a string
const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

// Predefined color palette (Expanded to 20+ colors)
const callColors = [
    '#3B82F6', // Blue-500
    '#10B981', // Emerald-500
    '#F59E0B', // Amber-500
    '#EF4444', // Red-500
    '#8B5CF6', // Violet-500
    '#EC4899', // Pink-500
    '#6366F1', // Indigo-500
    '#14B8A6', // Teal-500
    '#F97316', // Orange-500
    '#84CC16', // Lime-500
    '#22C55E', // Green-500
    '#06B6D4', // Cyan-500
    '#A855F7', // Purple-500
    '#D946EF', // Fuchsia-500
    '#F43F5E', // Rose-500
    '#6B7280', // Gray-500 (Use as a color too)
    '#4F46E5', // Indigo-600
    '#059669', // Emerald-600
    '#D97706', // Amber-600
    '#DB2777', // Pink-600
    '#7E22CE', // Purple-600
    '#0D9488', // Teal-600
];

const getCallColor = (name) => {
    if (!name) return '#6b7280'; // Default gray if no name
    const hash = simpleHash(name);
    return callColors[hash % callColors.length];
};

function CallsModal({ 
    isOpen, 
    onClose, 
    scheduledCalls, 
    completedCalls, 
    onDeleteCall, 
    onCompleteCall 
}) {
    const [activeTab, setActiveTab] = useState('scheduled'); // 'scheduled' or 'completed'

    if (!isOpen) return null;

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            return new Date(timestamp).toLocaleString(); // Simple locale string format
        } catch (e) {
            return 'Invalid Date';
        }
    };

    return (
        <div className={`modal-backdrop ${isOpen ? 'visible' : ''}`} onClick={onClose}>
            <div className="modal-content calls-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>
                    <FiX />
                </button>
                <h2>Call Logs</h2>

                <div className="modal-tabs">
                    <button 
                        className={`tab-button ${activeTab === 'scheduled' ? 'active' : ''}`}
                        onClick={() => setActiveTab('scheduled')}
                    >
                        Scheduled ({scheduledCalls.length})
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
                        onClick={() => setActiveTab('completed')}
                    >
                        Completed ({completedCalls.length})
                    </button>
                </div>

                <div className="modal-tab-content">
                    {activeTab === 'scheduled' && (
                        <ul className="calls-list scheduled-list">
                            {scheduledCalls.length > 0 ? (
                                scheduledCalls.map(call => (
                                    <li key={call.id}>
                                        <span 
                                            className="call-color-bar" 
                                            style={{ backgroundColor: getCallColor(call.promoter_name) }}
                                        ></span>
                                        <div className="call-info">
                                            <span className="call-promoter-name">{call.promoter_name}</span>
                                            <span className="call-timestamp">Scheduled: {formatTimestamp(call.created_at)}</span>
                                        </div>
                                        <div className="call-actions">
                                            <button 
                                                className="icon-button call-complete-button" 
                                                onClick={() => onCompleteCall(call.id, call.promoter_name, call.promoter_id)}
                                                title="Mark as Completed"
                                            >
                                                <FiCheck />
                                            </button>
                                            <button 
                                                className="icon-button call-delete-button" 
                                                onClick={() => onDeleteCall(call.id)}
                                                title="Delete Scheduled Call"
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li className="no-calls-message">No calls scheduled.</li>
                            )}
                        </ul>
                    )}

                    {activeTab === 'completed' && (
                        <ul className="calls-list completed-list">
                            {completedCalls.length > 0 ? (
                                completedCalls.map(call => (
                                    <li key={call.id}>
                                        <span 
                                            className="call-color-bar" 
                                            style={{ backgroundColor: getCallColor(call.promoter_name) }}
                                        ></span>
                                        <div className="call-info">
                                            <span className="call-promoter-name">{call.promoter_name}</span>
                                            <span className="call-timestamp">Completed: {formatTimestamp(call.completed_at)}</span>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li className="no-calls-message">No calls completed yet.</li>
                            )}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CallsModal; 