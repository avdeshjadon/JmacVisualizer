import React from 'react'

export default function Header({ breadcrumbParts, roots, onBreadcrumbClick, onRootChange, onBack, canGoBack }) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
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
        <select
          id="root-selector"
          className="root-selector"
          defaultValue=""
          onChange={(e) => { if (e.target.value) onRootChange(e.target.value); }}
        >
          <option value="">Select location…</option>
          {roots.map((r) => (
            <option key={r.path} value={r.path}>{r.name}</option>
          ))}
        </select>
        <button id="back-btn" className="btn btn-ghost" title="Go back" disabled={!canGoBack} onClick={onBack}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6" />
          </svg>
          Back
        </button>
      </div>
    </header>
  )
}
