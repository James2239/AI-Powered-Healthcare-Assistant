import React from 'react';
import './SearchHistory.css';

export default function SearchHistory({ history, onSelect, onClear }) {
  if (!history || history.length === 0) return null;
  return (
    <div className="search-history-root">
      <div className="search-history-header">
        <span>History</span>
        <button className="clear-btn" title="Clear history" onClick={onClear} aria-label="Clear history">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="8" width="2" height="7" rx="1" fill="#d32f2f"/>
            <rect x="9" y="8" width="2" height="7" rx="1" fill="#d32f2f"/>
            <rect x="13" y="8" width="2" height="7" rx="1" fill="#d32f2f"/>
            <rect x="4" y="5" width="12" height="2" rx="1" fill="#d32f2f"/>
            <rect x="7" y="2" width="6" height="2" rx="1" fill="#d32f2f"/>
            <rect x="2" y="7" width="16" height="2" rx="1" fill="#ffcdd2"/>
            <rect x="3" y="7" width="14" height="10" rx="2" stroke="#d32f2f" strokeWidth="1.5" fill="none"/>
          </svg>
        </button>
      </div>
      <ul className="search-history-list">
        {history.map((item, idx) => (
          <li key={idx} onClick={() => onSelect(item)} title={item}>
            {item.length > 32 ? item.slice(0, 32) + '…' : item}
          </li>
        ))}
      </ul>
    </div>
  );
}
