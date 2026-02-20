import React, { useState, useEffect } from 'react';
import { formatSize } from '../utils/helpers';

export default function QuickClean({ onDelete, onRefresh }) {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/clean-targets');
      if (!res.ok) throw new Error('Failed to load cleanup targets');
      const data = await res.json();
      setTargets(data);
    } catch (err) {
      console.error('Failed to fetch clean targets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const handleClean = (path, size, name) => {
    onDelete(path, size, () => {
        // Callback after successful deletion
        fetchTargets();
        if (onRefresh) onRefresh();
    });
  };

  if (error) {
    return (
      <div className="quick-clean-loading" style={{ color: 'var(--danger)' }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '8px'}}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>Error loading targets</span>
      </div>
    );
  }

  if (loading && targets.length === 0) {
    return (
      <div className="quick-clean-loading">
        <div className="spinner-sm"></div>
        <span>Finding junk...</span>
      </div>
    );
  }

  return (
    <div className="quick-clean-grid">
      {targets.map((t) => (
        <div className="quick-clean-card" key={t.id} data-sb-tooltip={`${t.name}\nPath: ${t.path}\nSize: ${formatSize(t.size)}`}>
          <div className="qc-info">
            <div className="qc-name">{t.name}</div>
            <div className="qc-size">{formatSize(t.size)}</div>
          </div>
          <button 
            className="qc-btn" 
            disabled={t.size === 0}
            onClick={() => handleClean(t.path, t.size, t.name)}
          >
            Clean
          </button>
        </div>
      ))}
    </div>
  );
}
