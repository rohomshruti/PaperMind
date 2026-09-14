import React from 'react';
import { LuDatabase, LuSparkles } from 'react-icons/lu';
import './Navbar.css';

const PAGE_META = {
  dashboard: {
    title: 'Platform Dashboard',
    description: 'Overview of indexed papers, vector embeddings, and RAG pipeline.',
  },
  upload: {
    title: 'Upload Research Papers',
    description: 'Add PDF papers to extract text, generate embeddings, and index into FAISS.',
  },
  papers: {
    title: 'Research Paper Library',
    description: 'Manage indexed papers, inspect page chunks, and control your knowledge base.',
  },
  chat: {
    title: 'AI Research Assistant',
    description: 'Ask questions and receive grounded Gemini answers with page-level citations.',
  },
  summary: {
    title: 'Paper Summary',
    description: 'Generate structured 8-section AI breakdown for any research paper.',
  },
  compare: {
    title: 'Multi-Paper Comparison',
    description: 'Side-by-side comparative analysis of datasets, methods, and empirical results.',
  },
};

const Navbar = ({ activeTab = 'dashboard', ragStatus = 'Online' }) => {
  const meta = PAGE_META[activeTab] || PAGE_META.dashboard;
  const isOnline = (ragStatus || '').toLowerCase() === 'online';

  return (
    <header className="top-header">
      <div className="header-context">
        <h1 className="header-page-title">{meta.title}</h1>
        <p className="header-page-desc">{meta.description}</p>
      </div>

      <div className="header-meta-actions">
        <div className="header-index-pill">
          <LuDatabase className="index-icon" />
          <span>FAISS Index</span>
          <span className="index-divider"></span>
          <span className={`index-status-dot ${isOnline ? 'online' : 'offline'}`} />
          <span className="index-status-text">{isOnline ? 'Active' : 'Offline'}</span>
        </div>
        <div className="header-ai-pill">
          <LuSparkles className="ai-icon" />
          <span>Gemini 3.6</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
