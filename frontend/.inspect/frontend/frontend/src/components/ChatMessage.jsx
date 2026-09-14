import React, { useState } from 'react';
import SourceCard from './SourceCard';
import { LuSparkles, LuCopy, LuCheck, LuUser } from 'react-icons/lu';
import './ChatMessage.css';

const FormattedContent = ({ content }) => {
  if (!content) return null;

  // Split into lines for structured reading
  const lines = content.split('\n');
  const elements = [];
  let currentList = [];
  let inCodeBlock = false;
  let codeBuffer = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="chat-bullet-list">
          {currentList.map((item, i) => (
            <li key={i}>{formatInline(item)}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const flushCode = () => {
    if (codeBuffer.length > 0) {
      elements.push(
        <pre key={`code-${elements.length}`} className="chat-code-block">
          <code>{codeBuffer.join('\n')}</code>
        </pre>
      );
      codeBuffer = [];
    }
  };

  const formatInline = (text) => {
    // Handle **bold**
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

    // Code block check
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // Bullet point check
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(trimmed.slice(2));
      return;
    }

    // Numbered list check
    if (/^\d+\.\s/.test(trimmed)) {
      currentList.push(trimmed.replace(/^\d+\.\s/, ''));
      return;
    }

    // Non-list line
    flushList();

    if (!trimmed) {
      // Empty line spacer
      return;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(<h4 key={index} className="chat-heading-h4">{formatInline(trimmed.slice(4))}</h4>);
    } else if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={index} className="chat-heading-h3">{formatInline(trimmed.slice(3))}</h3>);
    } else {
      elements.push(<p key={index} className="chat-paragraph">{formatInline(line)}</p>);
    }
  });

  flushList();
  flushCode();

  return <div className="formatted-chat-body">{elements}</div>;
};

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`chat-message-row ${isUser ? 'user-row' : 'bot-row'}`}>
      <div className="message-header-row">
        <div className="sender-meta">
          <div className={`avatar-box ${isUser ? 'user-avatar' : 'bot-avatar'}`}>
            {isUser ? <LuUser /> : <LuSparkles />}
          </div>
          <span className="sender-name">{isUser ? 'You' : 'PaperMind Assistant'}</span>
        </div>

        {!isUser && (
          <button className="copy-answer-btn" onClick={handleCopy} title="Copy answer to clipboard">
            {copied ? (
              <>
                <LuCheck className="copy-icon copied" /> Copied!
              </>
            ) : (
              <>
                <LuCopy className="copy-icon" /> Copy
              </>
            )}
          </button>
        )}
      </div>

      <div className={`message-bubble ${isUser ? 'user-bubble' : 'bot-bubble'}`}>
        <FormattedContent content={message.content} />

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="sources-container">
            <span className="sources-title">Sources</span>
            <div className="sources-list">
              {message.sources.map((src, idx) => (
                <SourceCard key={idx} source={src} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
