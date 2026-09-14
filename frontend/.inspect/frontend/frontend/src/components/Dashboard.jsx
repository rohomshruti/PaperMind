import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/api';
import { 
  LuFileText, 
  LuLayers, 
  LuMessageCircle, 
  LuArrowRight,
  LuUpload,
  LuMessageSquare,
  LuFileUp,
  LuCpu,
  LuDatabase,
  LuTextSearch,
  LuBot,
  LuSparkles
} from 'react-icons/lu';
import './Dashboard.css';

const Dashboard = ({ setActiveTab }) => {
  const [stats, setStats] = useState({
    total_papers: 0,
    total_chunks: 0,
    questions_asked: 0,
    rag_status: 'Checking...',
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      setStats(prev => ({ ...prev, rag_status: 'Offline' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const pipelineSteps = [
    { num: 1, title: 'Upload PDF', desc: 'Raw document ingestion & validation', icon: <LuFileUp /> },
    { num: 2, title: 'Extract Text', desc: 'PyMuPDF page-level extraction', icon: <LuFileText /> },
    { num: 3, title: 'Split into Chunks', desc: 'Sliding token window with overlap', icon: <LuLayers /> },
    { num: 4, title: 'Create Embeddings', desc: 'all-MiniLM-L6-v2 384-d vectors', icon: <LuCpu /> },
    { num: 5, title: 'Store in FAISS', desc: 'Fast L2/Cosine similarity index', icon: <LuDatabase /> },
    { num: 6, title: 'Retrieve Relevant Context', desc: 'Top-k semantic similarity search', icon: <LuTextSearch /> },
    { num: 7, title: 'Gemini Generates Answer', desc: 'Grounded response with page citations', icon: <LuBot /> }
  ];

  return (
    <div className="dashboard-container">
      {/* Top Hero Section */}
      <div className="hero-banner">
        <div className="hero-content">
          <div className="hero-badge">
            <LuSparkles className="hero-badge-icon" />
            <span>AI Research Paper Assistant</span>
          </div>
          <h1 className="hero-title">Welcome to PaperMind</h1>
          <p className="hero-tagline">AI Research Paper Assistant</p>
          <p className="hero-description">
            Upload research papers, ask questions, generate summaries, and explore research with AI-powered RAG.
          </p>
          <div className="hero-actions">
            <button className="hero-primary-btn" onClick={() => setActiveTab('upload')}>
              <LuUpload /> Upload Papers
            </button>
            <button className="hero-secondary-btn" onClick={() => setActiveTab('chat')}>
              <LuMessageSquare /> Ask Questions
            </button>
          </div>
        </div>
        <div className="hero-illustration">
          <div className="illustration-card">
            <div className="illustration-header">
              <span className="dot dot-red"></span>
              <span className="dot dot-yellow"></span>
              <span className="dot dot-green"></span>
              <span className="illustration-title">RAG Context Engine</span>
            </div>
            <div className="illustration-body">
              <div className="doc-preview-line line-wide"></div>
              <div className="doc-preview-line line-medium"></div>
              <div className="doc-citation-tag">
                <LuFileText /> andrew-ng-machine-learning... Page 113
              </div>
              <div className="ai-response-preview">
                <LuBot className="ai-spark" />
                <span>Grounded Gemini synthesis verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Statistics Cards */}
      <div className="metrics-grid">
        <div className="metric-card card-blue">
          <div className="metric-icon-box"><LuFileText /></div>
          <div className="metric-info">
            <span className="metric-label">Total Papers</span>
            <span className="metric-value">{loading ? '—' : stats.total_papers}</span>
            <span className="metric-sub">Indexed PDF documents in library</span>
          </div>
        </div>

        <div className="metric-card card-indigo">
          <div className="metric-icon-box"><LuLayers /></div>
          <div className="metric-info">
            <span className="metric-label">Total Chunks</span>
            <span className="metric-value">{loading ? '—' : stats.total_chunks.toLocaleString()}</span>
            <span className="metric-sub">Vectorized passages in FAISS index</span>
          </div>
        </div>

        <div className="metric-card card-purple">
          <div className="metric-icon-box"><LuMessageCircle /></div>
          <div className="metric-info">
            <span className="metric-label">Questions Asked</span>
            <span className="metric-value">{loading ? '—' : stats.questions_asked}</span>
            <span className="metric-sub">Queries grounded with page citations</span>
          </div>
        </div>
      </div>

      {/* 3 Quick Action Cards */}
      <div className="dashboard-section">
        <div className="section-title-wrap">
          <h2>Quick Actions</h2>
          <p>Instant shortcuts to core AI research paper workflows</p>
        </div>
        <div className="actions-grid">
          <div className="action-card" onClick={() => setActiveTab('upload')} role="button" tabIndex={0}>
            <div className="action-icon-wrap icon-blue">
              <LuUpload />
            </div>
            <div className="action-content">
              <h3 className="action-heading">Upload Papers</h3>
              <p className="action-desc">Add PDF research papers and build your searchable knowledge base.</p>
            </div>
            <button className="action-cta-btn" onClick={(e) => { e.stopPropagation(); setActiveTab('upload'); }}>
              Upload Paper <LuArrowRight />
            </button>
          </div>

          <div className="action-card" onClick={() => setActiveTab('chat')} role="button" tabIndex={0}>
            <div className="action-icon-wrap icon-indigo">
              <LuMessageSquare />
            </div>
            <div className="action-content">
              <h3 className="action-heading">Ask Questions</h3>
              <p className="action-desc">Ask questions and get answers grounded in your research papers.</p>
            </div>
            <button className="action-cta-btn" onClick={(e) => { e.stopPropagation(); setActiveTab('chat'); }}>
              Open Chat <LuArrowRight />
            </button>
          </div>

          <div className="action-card" onClick={() => setActiveTab('summary')} role="button" tabIndex={0}>
            <div className="action-icon-wrap icon-violet">
              <LuFileText />
            </div>
            <div className="action-content">
              <h3 className="action-heading">Generate Summary</h3>
              <p className="action-desc">Generate a structured AI summary of your research paper.</p>
            </div>
            <button className="action-cta-btn" onClick={(e) => { e.stopPropagation(); setActiveTab('summary'); }}>
              Generate Summary <LuArrowRight />
            </button>
          </div>
        </div>
      </div>

      {/* 7-Step RAG Workflow Section */}
      <div className="workflow-section">
        <div className="section-title-wrap">
          <div className="workflow-badge">ARCHITECTURE</div>
          <h2>How PaperMind Works</h2>
          <p>Production Retrieval-Augmented Generation (RAG) pipeline workflow</p>
        </div>

        <div className="workflow-grid">
          {pipelineSteps.map((step) => (
            <div key={step.num} className="workflow-step-card">
              <div className="step-badge-row">
                <span className="step-number">0{step.num}</span>
                <span className="step-icon-bubble">{step.icon}</span>
              </div>
              <h4 className="step-title">{step.title}</h4>
              <p className="step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
