import React from 'react'

export default function DeleteModal({ visible, path, size, onConfirm, onCancel }) {
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
        <p className="modal-warning">This will move the item to Trash</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" id="delete-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" id="delete-confirm" onClick={onConfirm}>
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
