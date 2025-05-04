import React, { useState, useRef, useEffect } from 'react';
import { FiEdit, FiTrash2, FiRefreshCw, FiCheck, FiCopy, FiSend, FiMail, FiInfo, FiTrendingUp, FiPercent, FiPieChart, FiZap } from 'react-icons/fi';
import { CgSpinner } from 'react-icons/cg';
import './PromoterCard.css';

// Helper function to get the CSS class based on stat value and rules
// Export the function so it can be used elsewhere
export const getStatClass = (statName, value) => {
  if (value === null || value === undefined) return ''; // Handle missing data

  switch (statName) {
    case 'MC/ET':
      if (value >= 4.5 && value <= 5.0) return 'stat-good';
      if ((value >= 3.5 && value < 4.5) || (value > 5.0 && value <= 6.0)) return 'stat-ok';
      return 'stat-bad';
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
    isGenerating, 
    isReadOnly,
    isMarkedSent
}) {
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedEmail, setEditedEmail] = useState(promoter.generatedEmail || '');
  const [isCopied, setIsCopied] = useState(false);
  const [isEmailCopied, setIsEmailCopied] = useState(false);
  const emailTextAreaRef = useRef(null);
  const copyTimeoutRef = useRef(null);
  const emailCopyTimeoutRef = useRef(null);

  useEffect(() => {
    setEditedEmail(promoter.generatedEmail || '');
  }, [promoter.generatedEmail]);

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

  const handleCancelEdit = (e) => {
    if (emailTextAreaRef.current && !emailTextAreaRef.current.contains(e.target)) {
      // For now, require explicit save or escape
    }
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
    };
  }, []);

  const handleMarkSentToggle = () => {
    if (isReadOnly) return;
    onToggleMarkSent(promoter.id);
  };

  const mcEtClass = getStatClass('MC/ET', promoter.mc_et);
  const tmaAnteilClass = getStatClass('TMA Anteil', promoter.tma_anteil);
  const vlShareClass = getStatClass('VL share', promoter.vl_share);

  const isExpanded = promoter.generatedEmail || isEditingEmail;
  console.log(`[PromoterCard ${promoter.id}] Rendering. Should Expand: ${isExpanded} (Email: ${!!promoter.generatedEmail}, Editing: ${isEditingEmail})`);

  return (
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

        <div className="promoter-stats">
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
          <h4>Generated Email</h4>
          {!isReadOnly && (
            <div className="email-actions">
              <button onClick={() => onRegenerate(promoter.id)} className="icon-button" title="Generate/Regenerate Email" disabled={isGenerating || isCopied}>
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
        <div className="email-tags">
          <span className="tag model-tag">{promoter.model}</span>
        </div>
        <p className="subject-line">Subject: {promoter.subject}</p>
        
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
                      onClick={(e) => { e.stopPropagation(); onRegenerate(promoter.id); }}
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
                  onClick={(e) => { e.stopPropagation(); onRegenerate(promoter.id); }}
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
  );
}

export default PromoterCard; 