import React, { useState, useEffect } from 'react';
import { getPapers, getPaperSummary } from '../services/api';
import SourceCard from './SourceCard';
import { 
  LuFileText, 
  LuSparkles, 
  LuTarget, 
  LuDatabase, 
  LuCpu, 
  LuTrendingUp, 
  LuTriangleAlert, 
  LuSquareCheck,
  LuCircleHelp,
  LuBookOpen,
  LuBot
} from 'react-icons/lu';
import './Summary.css';

const Summary = ({ setActiveTab }) => {
  const [papers, setPapers] = useState([]);
  const [selectedPaperId, setSelectedPaperId] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadPapers();
  }, []);

  const loadPapers = async () => {
    try {
      const data = await getPapers();
      setPapers(data);
      if (data.length > 0) {
        setSelectedPaperId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load papers for summary:', err);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedPaperId) return;

    setLoading(true);
    setErrorMessage('');
    setSummaryData(null);

    try {
      const data = await getPaperSummary(selectedPaperId);
      setSummaryData(data);
    } catch (err) {
      console.error('Summary error:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to generate summary.';
      setErrorMessage(detail);
    } finally {
      setLoading(false);
    }
  };

  const sectionConfig = {
    objective: { title: 'Paper Overview & Objective', icon: <LuTarget />, color: 'blue' },
    research_problem: { title: 'Problem Statement & Context', icon: <LuCircleHelp />, color: 'indigo' },
    methodology: { title: 'Methodology & Approach', icon: <LuCpu />, color: 'purple' },
    dataset: { title: 'Dataset & Benchmarks', icon: <LuDatabase />, color: 'cyan' },
    model_algorithm: { title: 'Model Architecture / Algorithm', icon: <LuBot />, color: 'blue' },
    results: { title: 'Key Findings & Results', icon: <LuTrendingUp />, color: 'emerald' },
    limitations: { title: 'Limitations & Assumptions', icon: <LuTriangleAlert />, color: 'amber' },
    conclusion: { title: 'Conclusion & Contributions', icon: <LuSquareCheck />, color: 'green' }
  };

  return (
    <div className="summary-container">
      <div className="summary-header">
        <div className="summary-title-wrap">
          <h2>Structured Paper Summary</h2>
          <p>Automated 8-section breakdown extracted and synthesized from the research paper.</p>
        </div>

        {papers.length > 0 && (
          <div className="summary-controls">
            <select
              className="paper-dropdown"
              value={selectedPaperId}
              onChange={(e) => setSelectedPaperId(e.target.value)}
              disabled={loading}
            >
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.filename} ({p.pages} pages)
                </option>
              ))}
            </select>
            <button
              className="generate-btn"
              onClick={handleGenerateSummary}
              disabled={loading || !selectedPaperId}
            >
              <LuSparkles /> {loading ? 'Analyzing Paper...' : 'Generate Summary'}
            </button>
          </div>
        )}
      </div>

      {papers.length === 0 ? (
        <div className="summary-empty-card">
          <div className="empty-icon-circle">
            <LuFileText className="empty-summary-icon" />
          </div>
          <h3>No research papers uploaded</h3>
          <p>Please upload a research paper first to generate an automated structured summary.</p>
          <button className="summary-upload-btn" onClick={() => setActiveTab('upload')}>
            Upload Papers
          </button>
        </div>
      ) : (
        <>
          {errorMessage && (
            <div className="summary-error-alert">{errorMessage}</div>
          )}

          {loading && (
            <div className="summary-loading-card">
              <div className="loading-spinner"></div>
              <h4>Analyzing Paper Context with Gemini 3.6...</h4>
              <p>Retrieving key sections: Problem Statement, Objective, Dataset, Methodology, Model, Results, Limitations & Conclusion.</p>
            </div>
          )}

          {!loading && summaryData && (
            <div className="summary-results-wrapper">
              <div className="summary-result-banner">
                <div className="summary-banner-info">
                  <div className="banner-badge">
                    <LuBookOpen />
                    <span>Synthesized Research Breakdown</span>
                  </div>
                  <h3>{summaryData.filename}</h3>
                </div>
                <div className="banner-meta-badge">
                  <span className="dot dot-green"></span>
                  <span>8 Core Dimensions Analyzed</span>
                </div>
              </div>

              <div className="sections-grid">
                {Object.keys(sectionConfig).map((key) => {
                  const cfg = sectionConfig[key];
                  const value = summaryData.summary[key] || 'Not found';
                  const isNotFound = value === 'Not found' || value === 'Not specified';

                  return (
                    <div key={key} className={`summary-section-card card-accent-${cfg.color}`}>
                      <div className="section-card-header">
                        <div className={`section-icon-box box-${cfg.color}`}>
                          {cfg.icon}
                        </div>
                        <div className="section-title-meta">
                          <span className="section-category-tag">{key.replace('_', ' ')}</span>
                          <h4>{cfg.title}</h4>
                        </div>
                      </div>
                      <div className="section-card-body">
                        {isNotFound ? (
                          <div className="not-found-pill">
                            <span>Not specified in retrieved sections</span>
                          </div>
                        ) : (
                          <p>{value}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {summaryData.sources && summaryData.sources.length > 0 && (
                <div className="summary-sources-box">
                  <span className="sources-label">Referenced Context Pages:</span>
                  <div className="sources-flex">
                    {summaryData.sources.map((src, i) => (
                      <SourceCard key={i} source={src} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !summaryData && !errorMessage && (
            <div className="summary-prompt-card">
              <div className="prompt-icon-box">
                <LuSparkles />
              </div>
              <h3>Generate an 8-Section AI Breakdown</h3>
              <p>Select a research paper from the dropdown above and click <strong>Generate Summary</strong> to extract the core methodology, benchmark metrics, and contributions.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Summary;
