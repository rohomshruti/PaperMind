import React, { useState, useEffect, useMemo } from 'react';
import { getPapers, deletePaper } from '../services/api';
import { 
  LuTrash2, 
  LuFileText, 
  LuRefreshCw, 
  LuUpload, 
  LuSearch, 
  LuMessageSquare, 
  LuSparkles,
  LuCheck
} from 'react-icons/lu';
import './PaperList.css';

const PaperList = ({ setActiveTab }) => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPapersList = async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await getPapers();
      setPapers(data);
    } catch (err) {
      console.error('Failed to fetch papers:', err);
      setMessage('Failed to load papers. Is backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapersList();
  }, []);

  const handleDelete = async (paperId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This will remove its vectors from the FAISS index.`)) {
      return;
    }

    setDeletingId(paperId);
    try {
      await deletePaper(paperId);
      setPapers((prev) => prev.filter((p) => p.id !== paperId));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete paper.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  const filteredPapers = useMemo(() => {
    if (!searchQuery.trim()) return papers;
    const q = searchQuery.toLowerCase();
    return papers.filter((p) => (p.filename || '').toLowerCase().includes(q));
  }, [papers, searchQuery]);

  return (
    <div className="papers-container">
      <div className="papers-header">
        <div>
          <h2>Research Paper Library</h2>
          <p>Inspect vectorized PDF documents, chunk statistics, and manage your FAISS knowledge base.</p>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={fetchPapersList} title="Refresh library">
            <LuRefreshCw className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="add-paper-btn" onClick={() => setActiveTab('upload')}>
            <LuUpload /> Upload PDF
          </button>
        </div>
      </div>

      {message && <div className="papers-alert">{message}</div>}

      <div className="papers-toolbar">
        <div className="search-box">
          <LuSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search indexed research papers by filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>
        <div className="papers-count-badge">
          {filteredPapers.length} of {papers.length} {papers.length === 1 ? 'paper' : 'papers'}
        </div>
      </div>

      <div className="papers-card">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Loading research paper library...</span>
          </div>
        ) : papers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-circle">
              <LuFileText className="empty-icon" />
            </div>
            <h3>No research papers indexed yet</h3>
            <p>Upload academic papers or technical manuals to build your semantic search index.</p>
            <button className="empty-upload-btn" onClick={() => setActiveTab('upload')}>
              <LuUpload /> Upload Papers
            </button>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-circle">
              <LuSearch className="empty-icon" />
            </div>
            <h3>No matching papers found</h3>
            <p>No indexed document matches "{searchQuery}". Try a different keyword or clear search.</p>
            <button className="empty-upload-btn" onClick={() => setSearchQuery('')}>
              Clear Search Filter
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="papers-table">
              <thead>
                <tr>
                  <th>Paper Document</th>
                  <th>Pages</th>
                  <th>FAISS Chunks</th>
                  <th>Indexed Status</th>
                  <th>Upload Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPapers.map((paper) => (
                  <tr key={paper.id}>
                    <td className="paper-name-cell">
                      <div className="paper-row-icon-box">
                        <LuFileText className="row-paper-icon" />
                      </div>
                      <div className="paper-title-meta">
                        <span className="paper-main-title" title={paper.filename}>{paper.filename}</span>
                        <span className="paper-id-sub">ID: {paper.id.substring(0, 8)}</span>
                      </div>
                    </td>
                    <td>
                      <span className="pages-badge">{paper.pages} pages</span>
                    </td>
                    <td>
                      <span className="chunk-badge">{paper.chunks} vectors</span>
                    </td>
                    <td>
                      <span className="status-pill-ready">
                        <LuCheck className="status-pill-icon" /> Indexed
                      </span>
                    </td>
                    <td className="date-cell">{formatDate(paper.upload_date)}</td>
                    <td>
                      <div className="row-actions">
                        <button 
                          className="action-link-btn" 
                          onClick={() => setActiveTab('chat')}
                          title="Ask questions about this paper"
                        >
                          <LuMessageSquare /> Chat
                        </button>
                        <button 
                          className="action-link-btn" 
                          onClick={() => setActiveTab('summary')}
                          title="View structured summary"
                        >
                          <LuSparkles /> Summary
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(paper.id, paper.filename)}
                          disabled={deletingId === paper.id}
                          title="Delete paper from index"
                        >
                          <LuTrash2 /> {deletingId === paper.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaperList;
