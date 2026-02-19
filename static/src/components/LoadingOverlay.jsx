import React from 'react'

export default function LoadingOverlay({ visible, statusText }) {
  return (
    <div id="loading-overlay" className={`loading-overlay${visible ? '' : ' hidden'}`}>
      <div className="loader">
        <div className="loader-ring"></div>
        <div className="loader-ring"></div>
        <div className="loader-ring"></div>
        <div className="loader-text">Scanning Filesystem…</div>
        <div className="loader-subtext" id="scan-status">
          {statusText || 'Preparing deep scan'}
        </div>
      </div>
    </div>
  )
}
