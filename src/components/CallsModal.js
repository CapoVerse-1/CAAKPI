import React, { useState } from 'react';
import { FiX, FiTrash2, FiCheck } from 'react-icons/fi';
import './CallsModal.css';

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
                                        <span className="call-promoter-name">{call.promoter_name}</span>
                                        <span className="call-timestamp">Scheduled: {formatTimestamp(call.created_at)}</span>
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
                                        <span className="call-promoter-name">{call.promoter_name}</span>
                                        <span className="call-timestamp">Completed: {formatTimestamp(call.completed_at)}</span>
                                        {/* No actions for completed calls currently */}
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