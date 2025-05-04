import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiKey } from 'react-icons/fi';
import './SettingsPanel.css';

function SettingsPanel({ isOpen, onClose, onSave, initialApiKey }) {
  const [apiKeyInput, setApiKeyInput] = useState('');

  // Initialize input with the current key when the panel opens
  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(initialApiKey || '');
    }
  }, [isOpen, initialApiKey]);

  // Log prop value
  console.log("Rendering SettingsPanel, received isOpen:", isOpen);

  if (!isOpen) {
    return null;
  }

  const handleSaveClick = () => {
    onSave(apiKeyInput);
    onClose(); // Close panel after saving
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={`settings-backdrop ${isOpen ? 'open' : ''}`} onClick={handleBackdropClick}>
      <div className="settings-content">
        <button className="settings-close-button" onClick={onClose} title="Close">
          <FiX />
        </button>
        <h2>Settings</h2>
        
        <div className="setting-item">
          <label htmlFor="apiKeyInput">
            <FiKey /> OpenAI API Key
          </label>
          <input 
            type="password" // Use password type to obscure the key
            id="apiKeyInput"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Enter your OpenAI API Key (e.g., sk-...)"
          />
           <p className="input-note">
             Key is stored in your browser's local storage for convenience. 
             <span className="warning">Do not use this in production!</span>
           </p>
        </div>

        <div className="settings-actions">
            <button 
                className="button-primary save-settings-button"
                onClick={handleSaveClick}
                disabled={!apiKeyInput} // Disable save if input is empty
            >
                <FiSave /> Save Settings
            </button>
        </div>

      </div>
    </div>
  );
}

export default SettingsPanel; 