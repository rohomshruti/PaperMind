import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import UploadZone from './components/UploadZone';
import PaperList from './components/PaperList';
import Chat from './components/Chat';
import Summary from './components/Summary';
import Comparison from './components/Comparison';
import { getHealth } from './services/api';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [ragStatus, setRagStatus] = useState('Online');

  useEffect(() => {
    checkHealth();
    // Poll health check occasionally
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const data = await getHealth();
      setRagStatus(data.rag_status || 'Online');
    } catch {
      setRagStatus('Offline');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'upload':
        return <UploadZone onUploadSuccess={() => setActiveTab('papers')} />;
      case 'papers':
        return <PaperList setActiveTab={setActiveTab} />;
      case 'chat':
        return <Chat />;
      case 'summary':
        return <Summary setActiveTab={setActiveTab} />;
      case 'compare':
        return <Comparison setActiveTab={setActiveTab} />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} ragStatus={ragStatus} />
      <div className="app-main-column">
        <Navbar activeTab={activeTab} ragStatus={ragStatus} />
        <main className="main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
