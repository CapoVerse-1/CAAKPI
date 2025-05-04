import React, { useState } from 'react';
import { FiUploadCloud, FiX, FiDownload, FiFileText, FiCheckCircle } from 'react-icons/fi'; // Icons for modal
import * as XLSX from 'xlsx'; // Needed for template download
import './ImportModal.css';

function ImportModal({ isOpen, onClose, onFileProcess, onDragOver }) {
  const [droppedFile, setDroppedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleDownloadTemplate = () => {
    // Define headers including empty columns to match structure
    const headers = [[
        "Name", "Email", null, null, null, null, null, null, // A-H
        "MC/ET", null, null, // I-K
        "TMA Anteil", null, null, null, null, // L-P
        "VL Share" // Q
    ]];
    const worksheet = XLSX.utils.aoa_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Promoter Template");
    // Trigger download
    XLSX.writeFile(workbook, "Promoter_Template.xlsx");
  };

  const handleInternalDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Validate file type briefly here too
      const file = files[0];
       const validTypes = ['.xlsx', '.xls'];
       const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (validTypes.includes(fileExtension)) {
             setDroppedFile(file); // Store the file object
        } else {
            alert("Invalid file type. Please drop an .xlsx or .xls file.");
        }
      e.dataTransfer.clearData();
    }
  };

  const handleInternalDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      onDragOver(e);
      e.dataTransfer.dropEffect = 'copy';
  };

    const handleInternalDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set dragging to false if leaving the actual dropzone, not inner elements
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDragging(false);
    };

  const handleGenerateClick = () => {
      if (droppedFile) {
          onFileProcess(droppedFile); // Pass the stored file up for processing
          setDroppedFile(null); // Reset state after processing starts
      }
  };

  const handleModalClose = () => {
      setDroppedFile(null); // Reset file state on close
      setIsDragging(false);
      onClose();
  };

  const handleBackdropClick = (e) => {
      if (e.target === e.currentTarget) { 
          handleModalClose();
      }
  }

  return (
    <div className={`modal-backdrop ${isOpen ? 'open' : ''}`} onClick={handleBackdropClick}>
      <div className="modal-content">
        <button className="modal-close-button" onClick={handleModalClose} title="Close">
          <FiX />
        </button>
        <h2>Import Promoters from Excel</h2>
        
        {/* Dropzone Area */} 
        <div 
          className={`modal-dropzone ${isDragging ? 'drag-over' : ''}`}
          onDrop={handleInternalDrop}
          onDragOver={handleInternalDragOver}
          onDragLeave={handleInternalDragLeave}
        >
          {!droppedFile ? (
            // State 1: Waiting for file
            <>
              <FiUploadCloud className="modal-drop-icon" />
              <p>Drag & drop your .xlsx or .xls file here</p>
              <button onClick={handleDownloadTemplate} className="link-button download-template-button">
                  <FiDownload /> Download Template
              </button>
            </>
          ) : (
            // State 2: File dropped
            <div className="file-dropped-state">
                <FiCheckCircle className="modal-drop-icon success"/>
                <p>File ready:</p>
                <p className="dropped-filename"><FiFileText /> {droppedFile.name}</p>
            </div>
          )}
        </div>

        {/* Instructions and Generate Button */} 
        {!droppedFile ? (
             <p className="modal-instructions">
                Ensure your file has columns: Name (A), Email (B), MC/ET (I), TMA Anteil (L), VL Share (Q). First row is skipped.
             </p>
        ) : (
             <button 
                className="button-primary generate-cards-button"
                onClick={handleGenerateClick}
            >
                Generate Cards
            </button>
        )}
      </div>
    </div>
  );
}

export default ImportModal; 