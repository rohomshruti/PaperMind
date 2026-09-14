import React from 'react';
import { 
  LuLayoutDashboard, 
  LuUpload, 
  LuFiles, 
  LuMessageSquare, 
  LuFileText, 
  LuGitCompare,
  LuSparkles
} from 'react-icons/lu';
import './Sidebar.css';

const Sidebar = ({ activeTab, setActiveTab, ragStatus = 'Online' }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LuLayoutDashboard /> },
    { id: 'upload', label: 'Upload Papers', icon: <LuUpload /> },
    { id: 'papers', label: 'Papers', icon: <LuFiles /> },
    { id: 'chat', label: 'Chat', icon: <LuMessageSquare /> },
    { id: 'summary', label: 'Summary', icon: <LuFileText /> },
    { id: 'compare', label: 'Compare', icon: <LuGitCompare /> },
  ];

  const isOnline = (ragStatus || '').toLowerCase() === 'online';

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand" onClick={() => setActiveTab('dashboard')} role="button" tabIndex={0}>
          <div className="sidebar-brand-icon-wrapper">
            <LuSparkles className="sidebar-brand-icon" />
          </div>
          <div className="sidebar-brand-info">
            <span className="sidebar-brand-title">PaperMind</span>
            <span className="sidebar-brand-subtitle">AI Research Assistant</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">WORKSPACE</div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {isActive && <span className="active-pill-glow" />}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-status-card">
          <div className="status-badge-row">
            <span className="version-label">PaperMind v1.0</span>
            <span className={`engine-badge ${isOnline ? 'online' : 'offline'}`}>
              <span className="status-dot-pulse"></span>
              {isOnline ? 'AI Engine Online' : 'AI Offline'}
            </span>
          </div>
          <p className="pipeline-desc">Local RAG Pipeline</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
