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
// DeleteModal.jsx -- Deletion Confirmation Dialog
// =================================================
// Modal overlay that asks the user to confirm before deleting a file or
// directory. Presents two action choices to avoid accidental data loss:
//
//   Move to Trash   -- Safer default; item is recoverable from macOS Trash.
//   Delete Forever  -- Immediately calls shutil.rmtree / os.remove on the
//                      backend; cannot be undone.
//
// The modal is hidden via CSS (not unmounted) to preserve transition
// animations. The Escape key and clicking outside the card both dismiss it.
//
// Props:
//   visible   {boolean}  -- Whether the modal is shown.
//   path      {string}   -- Filesystem path of the item to be deleted.
//   size      {string}   -- Human-readable size string (e.g. "1.2 GB").
//   onConfirm(permanent) -- Called with true (permanent) or false (trash).
//   onCancel()           -- Called when the user dismisses without action.
// ----------------------------------------------------------------------------
import React, { useState, useEffect } from 'react'

export default function DeleteModal({ visible, path, size, onConfirm, onCancel }) {
  const [permanent, setPermanent] = useState(false)

  // Reset when visibility changes
  useEffect(() => {
    if (visible) setPermanent(false)
  }, [visible])

  return (
    <div
      className={`modal-overlay${visible ? ' visible' : ''}`}
      id="delete-modal"
      onClick={(e) => { if (e.target.id === 'delete-modal') onCancel(); }}
    >
      <div className="modal glass-panel">
        <div className="modal-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>
        <h3 className="modal-title">Delete this item?</h3>
        <p className="modal-path" id="delete-modal-path">{path}</p>
        <p className="modal-size" id="delete-modal-size">{size}</p>
        
        <div className="modal-permanent-option">
          <label className="checkbox-container">
            <input 
              type="checkbox" 
              checked={permanent} 
              onChange={(e) => setPermanent(e.target.checked)} 
            />
            <span className="checkmark"></span>
            Delete permanently (bypass Trash)
          </label>
        </div>

        <p className="modal-warning">
          {permanent ? "WARNING: This cannot be undone!" : "This will move the item to Trash"}
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" id="delete-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" id="delete-confirm" onClick={() => onConfirm(permanent)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
