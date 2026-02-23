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
// PermissionsOverlay.jsx -- Full Disk Access Required Screen
// ============================================================
// Shown instead of the main application when the backend reports that the
// process does not have Full Disk Access (fullDiskAccess: false from
// GET /api/check-permissions). Provides user-facing instructions and two
// action buttons:
//
//   Open System Settings -- Calls POST /api/request-permissions, which uses
//                           'open x-apple.systempreferences:...' to navigate
//                           the user to Privacy -> Full Disk Access.
//   I Have Granted Access -- Re-runs the permission check (onCheck), which
//                            transitions to the main app if access was granted.
//
// This component is displayed before any scan is performed, so it has no
// dependency on scan state and can render independently as the first thing
// the user sees on restricted systems.
//
// Props:
//   onCheck()   -- Re-check permissions and proceed if now granted.
//   onRequest() -- Open macOS System Settings to the FDA privacy pane.
// ----------------------------------------------------------------------------
import React from 'react';

export default function PermissionsOverlay({ onCheck, onRequest }) {
  return (
    <div className="permissions-overlay">
      <div className="permissions-modal glass-panel">
        <div className="permissions-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h2>Full Disk Access Required</h2>
        <p>Jmac Visualizer needs Full Disk Access to accurately scan your entire system, including hidden system files and other user directories.</p>
        <p className="permissions-instruction">Click "Open Settings" below, then check the box next to JmacVisualizer or your terminal app.</p>
        
        <div className="permissions-actions">
          <button className="btn btn-primary" onClick={onRequest}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Open Settings
          </button>
          <button className="btn btn-ghost" onClick={onCheck}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            I've Granted Access
          </button>
        </div>
      </div>
    </div>
  );
}
