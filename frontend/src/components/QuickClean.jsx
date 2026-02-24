// ----------------------------------------------------------------------------
// Jmac Visualizer -- macOS Disk Usage Analyzer and Storage Manager
// ----------------------------------------------------------------------------
// Author   : Avdesh Jadon
// GitHub   : https://github.com/avdeshjadon
// License  : MIT License -- free to use, modify, and distribute.
//            See LICENSE file in the project root for full license text.
// ----------------------------------------------------------------------------
// If this project helped you, consider starring the repository, opening a
// pull request, or reporting issues on GitHub. Contributions are welcome.
// ----------------------------------------------------------------------------
//
// QuickClean.jsx -- One-Click Cleanup Targets Panel
// ===================================================
// Fetches and displays the sizes of four common macOS junk locations:
// User Caches, User Logs, Trash, and Downloads. Each entry shows its
// current size and a "Clean" button that directly deletes the target
// WITHOUT opening the DeleteModal and WITHOUT triggering the fullscreen
// LoadingOverlay.
//
// Each card has its own inline spinner so the user knows which item is
// being cleaned.  After deletion the card's size updates live by
// re-fetching /api/clean-targets.
//
// Special cases
//   Trash  -- always permanent=true  (emptying the Trash is irreversible by design)
//   Others -- permanent=false        (moves to Trash so the user can recover)
//
// Props:
//   onCleanDone() -- Called after any successful clean to let the parent
//                    refresh the storage overview bar.
// ----------------------------------------------------------------------------
import React, { useState, useEffect, useCallback } from 'react';
import { formatSize } from '../utils/helpers';
import { fetchCleanTargets, deleteItem } from '../utils/api';

export default function QuickClean({ onCleanDone }) {
  const [targets, setTargets]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  // Which target id is currently being cleaned
  const [cleaningId, setCleaningId] = useState(null);
  // Per-target toast message (shown inline under the card)
  const [statusMsg, setStatusMsg]   = useState({});

  // ── Fetch sizes from the backend ─────────────────────────────────────────
  const fetchTargetsData = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchCleanTargets();
      setTargets(data);
    } catch (err) {
      console.error('Failed to fetch clean targets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTargetsData();

    // Also refresh when the parent fires a hard-refresh event
    const handleRefresh = () => fetchTargetsData();
    window.addEventListener('refresh-disk', handleRefresh);
    return () => window.removeEventListener('refresh-disk', handleRefresh);
  }, [fetchTargetsData]);

  // ── Handle click on a Clean button ───────────────────────────────────────
  const handleClean = async (target) => {
    if (cleaningId) return; // already cleaning something

    // Trash is always emptied permanently; everything else goes to Trash
    const permanent = target.id === 'trash';

    setCleaningId(target.id);
    setStatusMsg(prev => ({ ...prev, [target.id]: null }));

    try {
      const result = await deleteItem(target.path, permanent);

      if (result.success) {
        setStatusMsg(prev => ({
          ...prev,
          [target.id]: { type: 'success', text: result.message || 'Done!' },
        }));

        // Live-update this card's size immediately
        await fetchTargetsData();

        // Notify parent to refresh the storage overview bar
        window.dispatchEvent(new CustomEvent('refresh-disk'));
        if (onCleanDone) onCleanDone();
      } else {
        setStatusMsg(prev => ({
          ...prev,
          [target.id]: { type: 'error', text: result.error || 'Failed' },
        }));
      }
    } catch (err) {
      setStatusMsg(prev => ({
        ...prev,
        [target.id]: { type: 'error', text: err.message },
      }));
    } finally {
      setCleaningId(null);
      // Auto-clear status message after 3 s
      setTimeout(() => {
        setStatusMsg(prev => ({ ...prev, [target.id]: null }));
      }, 3000);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
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
      {targets.map((t) => {
        const isCleaning = cleaningId === t.id;
        const msg        = statusMsg[t.id];
        const isEmpty    = t.size === 0;

        return (
          <div
            className="quick-clean-card"
            key={t.id}
            data-sb-tooltip={`${t.name}\nPath: ${t.path}\nSize: ${formatSize(t.size)}`}
          >
            <div className="qc-info">
              <div className="qc-name">{t.name}</div>
              {/* Show live-updating size with a subtle pulsing style while cleaning */}
              <div className="qc-size" style={isCleaning ? { opacity: 0.5 } : {}}>
                {formatSize(t.size)}
              </div>
            </div>

            <button
              className={`qc-btn${isCleaning ? ' qc-btn--cleaning' : ''}`}
              disabled={isEmpty || !!cleaningId}
              onClick={() => handleClean(t)}
              title={
                t.id === 'trash'
                  ? 'Permanently empty Trash'
                  : `Move ${t.name} to Trash`
              }
            >
              {isCleaning ? (
                /* Inline mini spinner — no fullscreen overlay */
                <span className="qc-spinner" />
              ) : (
                'Clean'
              )}
            </button>

            {/* Inline status message (success / error) */}
            {msg && (
              <div
                className="qc-status-msg"
                style={{ color: msg.type === 'success' ? 'var(--accent)' : 'var(--danger)' }}
              >
                {msg.text}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
