import React, { useState, useRef, useEffect } from 'react';
import { FiEdit, FiTrash2, FiRefreshCw, FiCheck, FiCopy, FiSend, FiMail, FiTrendingUp, FiPercent, FiPieChart, FiZap, FiPhoneCall, FiChevronDown, FiChevronUp, FiThumbsUp, FiSmile, FiMessageSquare, FiTrendingDown, FiSliders } from 'react-icons/fi';
import { IoColorWandOutline } from 'react-icons/io5';
import { CgSpinner } from 'react-icons/cg';
import './PromoterCard.css';
import PromoterStatsModal from './PromoterStatsModal';

// Helper function to get the CSS class based on stat value and rules
// Export the function so it can be used elsewhere
export const getStatClass = (statName, value) => {
  if (value === null || value === undefined) return ''; // Handle missing data

  switch (statName) {
    case 'MC/ET':
      if (value > 4.0) return 'stat-good'; // Green if > 4.0
      if (value >= 3.5 && value <= 4.0) return 'stat-ok'; // Orange if 3.5 <= value <= 4.0
      return 'stat-bad'; // Red if < 3.5
    case 'TMA Anteil':
      if (value >= 75) return 'stat-good';
      if (value >= 60 && value < 75) return 'stat-ok';
      return 'stat-bad';
    case 'VL share':
      if (value >= 10) return 'stat-good';
      if (value >= 5 && value < 10) return 'stat-ok';
      return 'stat-bad';
    default:
      return '';
  }
};

function PromoterCard({ 
    promoter, 
    onDelete, 
    onUpdate, 
    onRegenerate, 
    onToggleMarkSent,
    onScheduleCall,
    isGenerating, 
    isReadOnly,
    isMarkedSent,
    historyEntries,
    onUpdateMood
}) {
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedEmail, setEditedEmail] = useState(promoter.generatedEmail || '');
  const [isCopied, setIsCopied] = useState(false);
  const [isEmailCopied, setIsEmailCopied] = useState(false);
  const [isCallScheduledFeedback, setIsCallScheduledFeedback] = useState(false);
  const [isSubjectCopied, setIsSubjectCopied] = useState(false);
  const [selectedMood, setSelectedMood] = useState(promoter.selectedMood || 'neutral');
  const [isMoodDropdownOpen, setIsMoodDropdownOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const moodDropdownRef = useRef(null);
  const emailTextAreaRef = useRef(null);
  const copyTimeoutRef = useRef(null);
  const emailCopyTimeoutRef = useRef(null);
  const callScheduleTimeoutRef = useRef(null);
  const subjectCopyTimeoutRef = useRef(null);

  useEffect(() => {
    setEditedEmail(promoter.generatedEmail || '');
    setSelectedMood(promoter.selectedMood || 'neutral');
  }, [promoter.generatedEmail, promoter.selectedMood]);

  useEffect(() => {
    if (isEditingEmail && emailTextAreaRef.current) {
      emailTextAreaRef.current.focus();
      emailTextAreaRef.current.selectionStart = emailTextAreaRef.current.value.length;
      emailTextAreaRef.current.selectionEnd = emailTextAreaRef.current.value.length;
    }
  }, [isEditingEmail]);

  const handleEditClick = () => {
    if (isReadOnly) return;
    setEditedEmail(promoter.generatedEmail || '');
    setIsEditingEmail(true);
  };

  const handleSaveClick = () => {
    if (isReadOnly) return;
    onUpdate(promoter.id, { generatedEmail: editedEmail });
    setIsEditingEmail(false);
  };

  const handleKeyDown = (e) => {
    if (isReadOnly) return;
    if (e.key === 'Escape') {
      setEditedEmail(promoter.generatedEmail || '');
      setIsEditingEmail(false);
    }
  };

  const handleCopyClick = () => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    navigator.clipboard.writeText(editedEmail)
      .then(() => {
        setIsCopied(true);
        copyTimeoutRef.current = setTimeout(() => {
          setIsCopied(false);
        }, 1500);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  const handleCopyEmail = (e) => {
    e.stopPropagation();
    if (emailCopyTimeoutRef.current) {
      clearTimeout(emailCopyTimeoutRef.current);
    }
    navigator.clipboard.writeText(promoter.email)
      .then(() => {
        setIsEmailCopied(true);
        emailCopyTimeoutRef.current = setTimeout(() => {
          setIsEmailCopied(false);
          emailCopyTimeoutRef.current = null;
        }, 1500);
      })
      .catch(err => {
        console.error('Failed to copy email address: ', err);
      });
  };

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      if (emailCopyTimeoutRef.current) {
        clearTimeout(emailCopyTimeoutRef.current);
      }
      if (callScheduleTimeoutRef.current) {
        clearTimeout(callScheduleTimeoutRef.current);
      }
      if (subjectCopyTimeoutRef.current) {
        clearTimeout(subjectCopyTimeoutRef.current);
      }
    };
  }, []);

  const handleMarkSentToggle = () => {
    if (isReadOnly) return;
    onToggleMarkSent(promoter.id);
  };

  const handleScheduleCallClick = () => {
    if (isReadOnly || !onScheduleCall) return;
    
    onScheduleCall(promoter.id, promoter.name);
    
    setIsCallScheduledFeedback(true);
    if (callScheduleTimeoutRef.current) clearTimeout(callScheduleTimeoutRef.current);
    callScheduleTimeoutRef.current = setTimeout(() => {
      setIsCallScheduledFeedback(false);
    }, 1500);
  };

  const mcEtClass = getStatClass('MC/ET', promoter.mc_et);
  const tmaAnteilClass = getStatClass('TMA Anteil', promoter.tma_anteil);
  const vlShareClass = getStatClass('VL share', promoter.vl_share);

  const isExpanded = promoter.generatedEmail || isEditingEmail;
  console.log(`[PromoterCard ${promoter.id}] Rendering. Should Expand: ${isExpanded} (Email: ${!!promoter.generatedEmail}, Editing: ${isEditingEmail})`);

  // Get current month in German
  const currentMonthName = new Date().toLocaleString('de-DE', { month: 'long' });
  const displaySubject = `${currentMonthName} KPIs`;

  const handleCopySubject = () => {
    if (subjectCopyTimeoutRef.current) {
      clearTimeout(subjectCopyTimeoutRef.current);
    }

    navigator.clipboard.writeText(displaySubject)
      .then(() => {
        setIsSubjectCopied(true);
        subjectCopyTimeoutRef.current = setTimeout(() => {
          setIsSubjectCopied(false);
          subjectCopyTimeoutRef.current = null;
        }, 1500);
      })
      .catch(err => {
        console.error('Failed to copy subject: ', err);
      });
  };

  const moodOptions = [
    { value: 'neutral', label: 'Neutral', icon: <FiSliders className="icon" /> },
    { value: 'beeindruckt', label: 'Beeindruckt', icon: <FiSmile className="icon" /> },
    { value: 'zufrieden', label: 'Trotzdem zufrieden', icon: <FiThumbsUp className="icon" /> },
    { value: 'verbesserung', label: 'Verbesserung', icon: <FiTrendingUp className="icon" /> },
    { value: 'motivierend', label: 'Motivierend (unzufrieden)', icon: <FiMessageSquare className="icon" /> },
    { value: 'verschlechterung', label: 'Verschlechterung', icon: <FiTrendingDown className="icon" /> },
  ];

  const handleMoodSelect = (moodValue) => {
    setSelectedMood(moodValue);
    if (onUpdateMood && !isReadOnly) {
      onUpdateMood(promoter.id, moodValue);
    }
    setIsMoodDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moodDropdownRef.current && !moodDropdownRef.current.contains(event.target)) {
        setIsMoodDropdownOpen(false);
      }
    };
    if (isMoodDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      if (emailCopyTimeoutRef.current) clearTimeout(emailCopyTimeoutRef.current);
      if (callScheduleTimeoutRef.current) clearTimeout(callScheduleTimeoutRef.current);
      if (subjectCopyTimeoutRef.current) clearTimeout(subjectCopyTimeoutRef.current);
    };
  }, [isMoodDropdownOpen]);

  const handleOpenStatsModal = () => {
    if (!isReadOnly) {
      setIsStatsModalOpen(true);
    }
  };

  const handleCloseStatsModal = () => {
    setIsStatsModalOpen(false);
  };

  return (
    <>
      <div className={`card promoter-card ${isGenerating ? 'generating' : ''} ${isReadOnly ? 'read-only' : ''}`}>
        <div className="card-header">
          <h3 className="promoter-name">{promoter.name}</h3>
          <div className="card-actions">
            <button onClick={() => onDelete(promoter.historyId || promoter.id)} className="icon-button" title="Delete Promoter">
              <FiTrash2 className="icon icon-delete" />
            </button>
          </div>
        </div>

        <div className="promoter-contact-stats">
          <div className="promoter-details">
            <p className="clickable-email" onClick={handleCopyEmail} title="Copy Email Address">
              {isEmailCopied ? 
                <FiCheck className="icon detail-icon icon-copied" /> : 
                <FiMail className="icon detail-icon" />
              }
              {promoter.email}
            </p>
          </div>

          <div className="promoter-stats" onClick={handleOpenStatsModal} style={{ cursor: isReadOnly ? 'default' : 'pointer' }} title={isReadOnly ? '' : 'View Stats Details'}>
            <div className="stat-item">
              <span className="stat-label"><FiTrendingUp className="icon stat-icon"/> MC/ET:</span>
              <span className={`stat-value ${mcEtClass}`}>{promoter.mc_et?.toFixed(1) ?? 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label"><FiPieChart className="icon stat-icon"/> TMA:</span>
              <span className={`stat-value ${tmaAnteilClass}`}>{promoter.tma_anteil?.toFixed(0) ?? 'N/A'}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label"><FiPercent className="icon stat-icon"/> VL:</span>
              <span className={`stat-value ${vlShareClass}`}>{promoter.vl_share?.toFixed(0) ?? 'N/A'}%</span>
            </div>
          </div>
        </div>

        <hr className="card-divider"/>

        <div className="generated-email-section">
          <div className="email-header">
            <h4><IoColorWandOutline className="header-icon" /> Magic Touch</h4>
            {!isReadOnly && (
              <div className="email-actions">
                <button 
                  onClick={handleScheduleCallClick} 
                  className={`icon-button call-schedule-button ${isCallScheduledFeedback ? 'feedback' : ''}`} 
                  title="Schedule Call"
                  disabled={isCallScheduledFeedback}
                >
                  {isCallScheduledFeedback ? <FiCheck className="icon icon-copied"/> : <FiPhoneCall className="icon" />}
                </button>
                <button onClick={() => onRegenerate(promoter.id, selectedMood)} className="icon-button" title="Generate/Regenerate Email" disabled={isGenerating || isCopied}>
                  <FiRefreshCw className="icon" />
                </button>
                {promoter.generatedEmail && (
                  <>
                    {isEditingEmail ? (
                      <button onClick={handleSaveClick} className="icon-button" title="Save Email" disabled={isCopied}>
                        <FiCheck className="icon icon-save" />
                      </button>
                    ) : (
                      <button onClick={handleEditClick} className="icon-button" title="Edit Email" disabled={isGenerating || isCopied}>
                        <FiEdit className="icon" />
                      </button>
                    )}
                    <button onClick={handleCopyClick} className={`icon-button ${isCopied ? 'copied' : ''}`} title="Copy Email Body" disabled={isCopied || isGenerating}>
                      {isCopied ? <FiCheck className="icon icon-copied" /> : <FiCopy className="icon" />}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mood-selector-container" ref={moodDropdownRef}>
            <button 
              className={`mood-selector-button ${selectedMood ? `mood-selected-${selectedMood}` : ''}`}
              onClick={() => setIsMoodDropdownOpen(!isMoodDropdownOpen)}
              disabled={isReadOnly}
            >
              {selectedMood && moodOptions.find(m => m.value === selectedMood)?.icon}
              <span>{selectedMood ? moodOptions.find(m => m.value === selectedMood)?.label : 'Select Mood'}</span>
              {isMoodDropdownOpen ? 
                <FiChevronUp className="mood-dropdown-icon" /> : 
                <FiChevronDown className="mood-dropdown-icon" />
              }
            </button>
            {isMoodDropdownOpen && (
              <div className="mood-dropdown">
                {moodOptions.map(option => (
                  <div 
                    key={option.value} 
                    className={`mood-option mood-option-${option.value}`}
                    onClick={() => handleMoodSelect(option.value)}
                  >
                    {option.icon} 
                    <span>{option.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="subject-line clickable-subject" onClick={handleCopySubject} title="Copy Subject">
            {isSubjectCopied ? (
              <FiCheck className="icon icon-subject-copied" />
            ) : (
              <>Subject: {displaySubject}</>
            )}
          </p>
          
          <div className="email-body">
            {isGenerating ? (
              <div className="email-placeholder loading">
                <CgSpinner className="spinner-icon"/>
                <span className="loading-text">Generating...</span>
              </div>
            ) : promoter.generatedEmail || (isEditingEmail && !isReadOnly) ? (
              <div className={`textarea-wrapper ${isExpanded ? 'expanded' : ''}`}>
                {isExpanded ? (
                  <textarea
                    ref={emailTextAreaRef}
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    readOnly={!isEditingEmail || isReadOnly}
                    className={`${isEditingEmail ? 'editing' : ''} ${isReadOnly ? 'read-only-textarea' : ''}`}
                    onKeyDown={isEditingEmail ? handleKeyDown : undefined}
                    placeholder="Email content will appear here..."
                    onClick={isEditingEmail ? (e) => e.stopPropagation() : undefined}
                  />
                ) : (
                  <div className="email-placeholder">
                    {!isReadOnly && (
                      <button 
                        className="button-tertiary generate-button" 
                        onClick={(e) => { e.stopPropagation(); onRegenerate(promoter.id, selectedMood); }}
                        disabled={isGenerating}
                      >
                        <FiZap /> Generate Email
                      </button>
                    )}
                    {isReadOnly && <span>(No email generated)</span>}
                  </div>
                )}
              </div>
            ) : (
              <div className="email-placeholder static-placeholder">
                {!isReadOnly && (
                  <button 
                    className="button-tertiary generate-button" 
                    onClick={(e) => { e.stopPropagation(); onRegenerate(promoter.id, selectedMood); }}
                    disabled={isGenerating}
                  >
                    <FiZap /> Generate Email
                  </button>
                )}
              </div>
            )}
          </div>

          {promoter.generatedEmail && !isGenerating && !isReadOnly && (
            <div className="send-button-container">
              {!isMarkedSent ? (
                <button 
                  className="button-primary send-action-button" 
                  onClick={handleMarkSentToggle}
                >
                  <FiSend /> Mark Sent
                </button>
              ) : (
                <button 
                  className="button-success send-action-button sent" 
                  onClick={handleMarkSentToggle}
                >
                  <FiCheck /> Marked Sent
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <PromoterStatsModal
        isOpen={isStatsModalOpen}
        onClose={handleCloseStatsModal}
        promoter={promoter}
        historyEntries={historyEntries || []}
      />
    </>
  );
}

export default PromoterCard; 