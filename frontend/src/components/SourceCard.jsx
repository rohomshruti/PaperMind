import React from 'react';
import { LuFileText } from 'react-icons/lu';
import './SourceCard.css';

const SourceCard = ({ source }) => {
  return (
    <div className="source-citation-chip" title={`${source.paper} (Page ${source.page})`}>
      <LuFileText className="citation-icon" />
      <span className="citation-paper">{source.paper}</span>
      <span className="citation-bullet">•</span>
      <span className="citation-page">Page {source.page}</span>
    </div>
  );
};

export default SourceCard;
