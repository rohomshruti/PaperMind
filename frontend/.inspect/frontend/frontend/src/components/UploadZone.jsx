import React, { useState, useRef } from 'react';
import { uploadPapers } from '../services/api';
import { 
  LuUpload, 
  LuFile, 
  LuCircleCheck, 
  LuCircleAlert, 
  LuX, 
  LuSparkles,
  LuArrowRight,
  LuFileText
} from 'react-icons/lu';
import './UploadZone.css';

const UploadZone = ({ onUploadSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    addFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const addFiles = (files) => {
    setErrorMessage('');
    const validPdfFiles = [];
    let hasInvalid = false;

    files.forEach((file) => {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        validPdfFiles.push(file);
      } else {
        hasInvalid = true;
      }
    });

    if (hasInvalid) {
      setErrorMessage('Only PDF research documents (.pdf) are supported.');
    }

    // Deduplicate by filename
    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const newUnique = validPdfFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...newUnique];
    });
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setErrorMessage('');
    setUploadResults([]);

    try {
      const data = await uploadPapers(selectedFiles);
      setUploadResults(data.papers || []);
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      console.error('Upload error:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to upload and process papers.';
      setErrorMessage(detail);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h2>Upload Research Papers</h2>
        <p>Add PDF research papers to extract text, generate 384-dimensional embeddings, and index into FAISS.</p>
      </div>

      <div className="upload-card">
        <div 
          className={`dropzone-area ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileChange}
            className="file-input-hidden"
          />
          <div className="dropzone-icon-circle">
            <LuUpload className="dropzone-icon" />
          </div>
          <span className="dropzone-title">Drop your research paper here</span>
          <span className="dropzone-sub">or browse PDF files from your computer</span>

          <div className="dropzone-badges">
            <span className="badge-pill">Supported format: PDF</span>
            <span className="badge-pill">PyMuPDF parser</span>
            <span className="badge-pill">Chunk size: 600 tokens</span>
          </div>

          <button
            type="button"
            className="choose-btn"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            Browse PDF Files
          </button>
        </div>

        {selectedFiles.length > 0 && (
          <div className="selected-files-section">
            <div className="selected-files-header">
              <h4>Ready to Index ({selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'})</h4>
              <button 
                type="button" 
                className="clear-all-link"
                onClick={() => setSelectedFiles([])}
              >
                Clear all
              </button>
            </div>
            
            <ul className="file-list">
              {selectedFiles.map((file, idx) => (
                <li key={idx} className="file-list-item">
                  <div className="file-info-group">
                    <div className="file-icon-box">
                      <LuFileText className="file-icon" />
                    </div>
                    <div className="file-meta">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="remove-file-btn"
                    onClick={() => removeFile(idx)}
                    title="Remove"
                  >
                    <LuX />
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className={`upload-submit-btn ${uploading ? 'loading' : ''}`}
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className="btn-spinner"></span>
                  Extracting Text & Generating Vectors...
                </>
              ) : (
                <>
                  <LuSparkles /> Index {selectedFiles.length} {selectedFiles.length === 1 ? 'Paper' : 'Papers'} into FAISS
                </>
              )}
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="upload-error-alert">
            <LuCircleAlert className="error-icon" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {uploadResults.length > 0 && (
        <div className="upload-status-section">
          <div className="status-section-header">
            <h3>Successfully Indexed Documents</h3>
            <span className="success-tag">RAG Knowledge Base Updated</span>
          </div>
          <div className="status-cards-list">
            {uploadResults.map((paper) => (
              <div key={paper.id} className="status-result-card">
                <div className="status-check">
                  <LuCircleCheck className="check-icon" />
                  <div className="status-filename-wrap">
                    <strong>{paper.filename}</strong>
                    <span className="status-sub">Ready for semantic search and Q&A</span>
                  </div>
                </div>
                <div className="status-meta">
                  <span className="badge-chunks">{paper.chunks} chunks indexed</span>
                  <span className="badge-pages">{paper.pages} pages</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
