import React, { useState, useEffect } from 'react';
import { getPapers, comparePapers } from '../services/api';
import SourceCard from './SourceCard';
import { 
  LuGitCompare, 
  LuFileText, 
  LuSparkles, 
  LuCheck, 
  LuUpload, 
  LuLayers, 
  LuTable,
  LuCpu,
  LuDatabase,
  LuTrendingUp,
  LuBookOpen
} from 'react-icons/lu';
import './Comparison.css';

// Lightweight Markdown Formatter for AI synthesis text
const FormattedSynthesis = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="comp-bullet-list">
          {currentList.map((item, i) => (
            <li key={i}>{formatInline(item)}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const formatInline = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(trimmed.slice(2));
      return;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      currentList.push(trimmed.replace(/^\d+\.\s/, ''));
      return;
    }

    flushList();

    if (!trimmed) return;

    if (trimmed.startsWith('### ')) {
      elements.push(<h4 key={index} className="comp-heading-h4">{formatInline(trimmed.slice(4))}</h4>);
    } else if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={index} className="comp-heading-h3">{formatInline(trimmed.slice(3))}</h3>);
    } else {
      elements.push(<p key={index} className="comp-paragraph">{formatInline(line)}</p>);
    }
  });

  flushList();

  return <div className="comp-formatted-body">{elements}</div>;
};

const Comparison = ({ setActiveTab }) => {
  const [papers, setPapers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadPapers();
  }, []);

  const loadPapers = async () => {
    try {
      const data = await getPapers();
      setPapers(data);
      // Pre-select first two if available
      if (data.length >= 2) {
        setSelectedIds([data[0].id, data[1].id]);
      } else if (data.length === 1) {
        setSelectedIds([data[0].id]);
      }
    } catch (err) {
      console.error('Failed to load papers for comparison:', err);
    }
  };

  const handleTogglePaper = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(papers.map((p) => p.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      setErrorMessage('Please select at least two papers to compare.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setComparisonResult(null);

    try {
      const data = await comparePapers(selectedIds);
      setComparisonResult(data);
    } catch (err) {
      console.error('Comparison error:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to compare papers.';
      setErrorMessage(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comparison-container">
      <div className="comparison-header">
        <div className="comp-header-text">
          <h2>Multi-Paper Comparison</h2>
          <p>Select two or more papers to generate a side-by-side methodology and metrics matrix.</p>
        </div>
      </div>

      {papers.length === 0 ? (
        <div className="comparison-empty-card">
          <div className="empty-icon-circle">
            <LuFileText className="empty-comp-icon" />
          </div>
          <h3>No research papers uploaded</h3>
          <p>You need to upload at least 2 papers to perform a comparative analysis.</p>
          <button className="comp-upload-btn" onClick={() => setActiveTab('upload')}>
            <LuUpload /> Upload Papers
          </button>
        </div>
      ) : papers.length === 1 ? (
        <div className="comparison-empty-card">
          <div className="empty-icon-circle">
            <LuFileText className="empty-comp-icon" />
          </div>
          <h3>Only 1 paper indexed</h3>
          <p>You have 1 paper uploaded (<strong>{papers[0].filename}</strong>). Upload at least one more paper to enable side-by-side matrix comparison.</p>
          <button className="comp-upload-btn" onClick={() => setActiveTab('upload')}>
            <LuUpload /> Upload Second Paper
          </button>
        </div>
      ) : (
        <>
          <div className="paper-selection-card">
            <div className="selection-card-header">
              <div className="selection-title-group">
                <h4>Select Papers to Compare</h4>
                <span className="selected-count-badge">
                  {selectedIds.length} of {papers.length} selected
                </span>
              </div>

              <div className="selection-actions">
                <div className="quick-select-buttons">
                  <button 
                    type="button" 
                    className="text-btn" 
                    onClick={handleSelectAll}
                    disabled={selectedIds.length === papers.length}
                  >
                    Select All
                  </button>
                  <span className="btn-divider">•</span>
                  <button 
                    type="button" 
                    className="text-btn" 
                    onClick={handleClearSelection}
                    disabled={selectedIds.length === 0}
                  >
                    Clear
                  </button>
                </div>

                <button
                  className="trigger-compare-btn"
                  onClick={handleCompare}
                  disabled={loading || selectedIds.length < 2}
                >
                  <LuGitCompare /> {loading ? 'Analyzing Papers...' : 'Compare Selected Papers'}
                </button>
              </div>
            </div>

            <div className="papers-checkbox-grid">
              {papers.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={`paper-choice-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleTogglePaper(p.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleTogglePaper(p.id);
                      }
                    }}
                  >
                    <div className={`choice-checkbox ${isSelected ? 'checked' : ''}`}>
                      {isSelected && <LuCheck />}
                    </div>
                    <div className="choice-info">
                      <strong title={p.filename}>{p.filename}</strong>
                      <span>{p.pages} pages • {p.chunks} chunks</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {errorMessage && (
            <div className="comp-error-alert">{errorMessage}</div>
          )}

          {loading && (
            <div className="comp-loading-card">
              <div className="loading-spinner"></div>
              <h4>Synthesizing Comparative Analysis...</h4>
              <p>Extracting datasets, models, methodologies, and benchmark metrics across {selectedIds.length} papers with Gemini 3.6.</p>
            </div>
          )}

          {!loading && comparisonResult && (
            <div className="comp-results-section">
              {/* Matrix Card */}
              <div className="comp-table-card">
                <div className="table-card-header">
                  <div className="table-title-group">
                    <div className="table-icon-pill">
                      <LuTable />
                    </div>
                    <div>
                      <h3>Comparative Matrix</h3>
                      <p>Side-by-side benchmark of models, datasets, approaches, and performance</p>
                    </div>
                  </div>
                  <span className="matrix-badge">{comparisonResult.table.length} Papers Compared</span>
                </div>

                <div className="comp-table-wrapper">
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th>Paper</th>
                        <th>Dataset</th>
                        <th>Method</th>
                        <th>Model</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonResult.table.map((row, idx) => (
                        <tr key={idx}>
                          <td className="comp-paper-cell">
                            <div className="paper-cell-content">
                              <div className="paper-mini-icon">
                                <LuFileText />
                              </div>
                              <span className="paper-name-text" title={row.paper}>
                                {row.paper}
                              </span>
                            </div>
                          </td>
                          <td>
                            {row.dataset === 'Not found' ? (
                              <span className="val-not-found">Not specified</span>
                            ) : (
                              <span className="val-dataset">{row.dataset}</span>
                            )}
                          </td>
                          <td>
                            {row.method === 'Not found' ? (
                              <span className="val-not-found">Not specified</span>
                            ) : (
                              <span className="val-method">{row.method}</span>
                            )}
                          </td>
                          <td>
                            {row.model === 'Not found' ? (
                              <span className="val-not-found">Not specified</span>
                            ) : (
                              <span className="val-model">{row.model}</span>
                            )}
                          </td>
                          <td>
                            {row.result === 'Not found' ? (
                              <span className="val-not-found">Not specified</span>
                            ) : (
                              <span className="val-result">{row.result}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* AI Comparison Synthesis Card */}
              <div className="ai-comparison-card">
                <div className="ai-comparison-header">
                  <div className="ai-sparkle-pill">
                    <LuSparkles />
                  </div>
                  <div>
                    <h3>AI Comparative Synthesis</h3>
                    <span className="ai-subheading">Grounding synthesis generated by Gemini 3.6 Flash</span>
                  </div>
                </div>
                <div className="ai-comparison-body">
                  <FormattedSynthesis content={comparisonResult.ai_comparison} />
                </div>
              </div>

              {/* Sources */}
              {comparisonResult.sources && comparisonResult.sources.length > 0 && (
                <div className="comp-sources-box">
                  <span className="sources-label">Referenced Context Pages:</span>
                  <div className="sources-flex">
                    {comparisonResult.sources.map((src, i) => (
                      <SourceCard key={i} source={src} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !comparisonResult && !errorMessage && (
            <div className="comp-prompt-card">
              <div className="empty-icon-circle">
                <LuLayers />
              </div>
              <h3>Select Papers to Compare</h3>
              <p>
                Choose 2 or more research papers from the selector above and click <strong>Compare Selected Papers</strong> to generate a side-by-side methodology and metrics breakdown.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Comparison;
