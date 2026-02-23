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
// Header.jsx -- Application Header Bar Component
// =================================================
// Renders the top navigation bar containing the animated SVG logo, the
// application title, a breadcrumb trail reflecting the current scan path,
// and a Hard Refresh button that triggers a full cache-clearing re-scan.
//
// The entire header element is marked as -webkit-app-region: drag so the
// user can drag the app window by clicking on empty header space. Interactive
// child elements (breadcrumb items, buttons) are explicitly marked no-drag.
//
// Props:
//   breadcrumbParts  {Array<{name, path}>} -- Path segments for breadcrumb.
//   roots            {Array<{name, path}>} -- Available filesystem roots.
//   onBreadcrumbClick(path)                -- Called when a crumb is clicked.
//   onRootChange(path)                     -- Called when root selector changes.
//   onRefresh()                            -- Called when Refresh is clicked.
// ----------------------------------------------------------------------------
import React from 'react'

export default function Header({ breadcrumbParts, roots, onBreadcrumbClick, onRootChange, onRefresh }) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo tooltip-trigger" title="Jmac Visualizer Logo">
          <svg viewBox="0 0 100 100" width="30" height="30" fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(124, 92, 252, 0.4))' }}>
            <defs>
              <linearGradient id="logo-min-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c5cfc" />
                <stop offset="50%" stopColor="#fc5c8c" />
                <stop offset="100%" stopColor="#2ed573" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="40" stroke="url(#logo-min-grad)" strokeWidth="8" opacity="0.9" strokeDasharray="180 60" />
            <circle cx="50" cy="50" r="24" stroke="url(#logo-min-grad)" strokeWidth="6" opacity="0.7" strokeDasharray="80 30" transform="rotate(120 50 50)" />
            <circle cx="50" cy="50" r="8" fill="url(#logo-min-grad)" />
          </svg>
        </div>
        <h1>Jmac Visualizer</h1>
      </div>
      <div className="header-center">
        <div className="breadcrumb" id="breadcrumb">
          {breadcrumbParts.map((part, i) => {
            const isLast = i === breadcrumbParts.length - 1;
            return (
              <React.Fragment key={part.path}>
                <span
                  className={`breadcrumb-item${isLast ? ' active' : ''}`}
                  data-path={part.path}
                  onClick={() => onBreadcrumbClick(part.path)}
                >
                  {part.name}
                </span>
                {!isLast && <span className="breadcrumb-sep">›</span>}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <div className="header-right">
        <button id="refresh-btn" className="btn btn-ghost" title="Refresh scan" onClick={onRefresh}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Hard Refresh
        </button>
      </div>
    </header>
  )
}

