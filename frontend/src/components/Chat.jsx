import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage, getPapers } from '../services/api';
import ChatMessage from './ChatMessage';
import { LuSend, LuRotateCcw, LuFilter, LuSparkles, LuCircleHelp } from 'react-icons/lu';
import './Chat.css';

const SAMPLE_QUESTIONS = [
  "What dataset was used?",
  "What methodology was proposed?",
  "Which model was used?",
  "What accuracy was achieved?",
  "What are the limitations?",
  "What problem does the paper solve?",
  "What future work was suggested?",
  "Compare the methodologies of the uploaded papers."
];

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState([]);
  const [selectedPaperId, setSelectedPaperId] = useState('all');
  const [errorNotice, setErrorNotice] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadPapers();
  }, []);

  const loadPapers = async () => {
    try {
      const data = await getPapers();
      setPapers(data);
    } catch (err) {
      console.error('Failed to load papers in chat:', err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (questionToSend) => {
    const query = questionToSend || inputValue;
    if (!query.trim() || loading) return;

    setErrorNotice('');
    const userMsg = { role: 'user', content: query.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue('');
    setLoading(true);

    try {
      // Build history payload (last 6 messages)
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const paperIds = selectedPaperId === 'all' ? null : [selectedPaperId];

      const res = await sendChatMessage({
        question: query.trim(),
        history: historyPayload,
        paper_ids: paperIds,
      });

      const botMsg = {
        role: 'assistant',
        content: res.answer,
        sources: res.sources || [],
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to get answer.';
      setErrorNotice(detail);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${detail}`,
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    setErrorNotice('');
  };

  const selectedPaper = papers.find((p) => p.id === selectedPaperId);
  const scopeLabel = selectedPaperId === 'all' ? 'All uploaded papers' : selectedPaper ? selectedPaper.filename : 'All papers';

  return (
    <div className="chat-page-container">
      <div className="chat-top-bar">
        <div className="chat-title-meta">
          <h2>Ask about your research papers</h2>
          <p>Real RAG similarity search and grounded Gemini answers with page citations.</p>
        </div>
        <div className="chat-actions-bar">
          <div className="paper-filter-wrapper">
            <LuFilter className="filter-icon" />
            <select
              value={selectedPaperId}
              onChange={(e) => setSelectedPaperId(e.target.value)}
              className="paper-select"
            >
              <option value="all">All uploaded papers ({papers.length})</option>
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.filename}
                </option>
              ))}
            </select>
          </div>
          {messages.length > 0 && (
            <button className="clear-chat-btn" onClick={handleClearHistory} title="Clear conversation history">
              <LuRotateCcw /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="chat-messages-scroll">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon-circle">
              <LuSparkles className="chat-empty-icon" />
            </div>
            <h3>Ask PaperMind about your research</h3>
            <p>Upload a paper and start asking questions.</p>

            <div className="sample-chips-grid">
              {SAMPLE_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  className="sample-chip"
                  onClick={() => handleSend(q)}
                >
                  <LuCircleHelp className="chip-icon" />
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages-thread">
            {messages.map((msg, index) => (
              <ChatMessage key={index} message={msg} />
            ))}
            {loading && (
              <div className="chat-message-row bot-row">
                <div className="message-header-row">
                  <div className="sender-meta">
                    <div className="avatar-box bot-avatar">
                      <LuSparkles />
                    </div>
                    <span className="sender-name">PaperMind Assistant</span>
                  </div>
                </div>
                <div className="message-bubble bot-bubble loading-bubble">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="loading-text">Searching FAISS index & formulating grounded answer...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {errorNotice && (
        <div className="chat-error-banner">
          {errorNotice}
        </div>
      )}

      <div className="chat-input-wrapper">
        <div className="chat-input-box">
          <div className="input-context-pill">
            <span className="context-label">Context Scope:</span>
            <span className="context-value">{scopeLabel}</span>
          </div>
          <div className="input-controls-row">
            <textarea
              className="chat-textarea"
              rows={2}
              placeholder="Ask a question about datasets, methodologies, models, or results..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="chat-send-btn"
              onClick={() => handleSend()}
              disabled={loading || !inputValue.trim()}
              title="Send query"
            >
              <LuSend /> Ask
            </button>
          </div>
        </div>
        <span className="keyboard-hint">Press Enter to send • Shift + Enter for new line</span>
      </div>
    </div>
  );
};

export default Chat;
