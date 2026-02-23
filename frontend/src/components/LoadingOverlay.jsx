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
// LoadingOverlay.jsx -- Full-Screen Loading Indicator
// =====================================================
// Renders an animated full-viewport overlay with a PC/monitor scanning
// animation and a status text line. Displayed during filesystem scans to
// give the user visual feedback that work is in progress.
//
// The overlay uses CSS opacity + visibility transitions to fade in/out
// smoothly rather than mounting/unmounting from the DOM, which prevents
// layout shift when the scan completes.
//
// Props:
//   visible    {boolean} -- Controls overlay display (true = scanning).
//   statusText {string}  -- Dynamic message shown below the animation
//                           (e.g. "Scanning /Users/...", "Initializing...").
// ----------------------------------------------------------------------------
import React, { useEffect, useState } from 'react'

export default function LoadingOverlay({ visible }) {
  const [isVisible, setIsVisible] = useState(visible)

  useEffect(() => {
    if (visible) setIsVisible(true)
    else setTimeout(() => setIsVisible(false), 500)
  }, [visible])

  if (!isVisible && !visible) return null

  return (
    <div className={`loading-overlay${visible ? '' : ' hidden'}`}>
      <div className="pc-scanner-container">
        
        {/* Monitor Structure */}
        <div className="monitor-group">
          <div className="monitor-frame">
            <div className="monitor-screen">
              {/* Internal abstract file system */}
              <div className="screen-content">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="screen-file-row">
                    <div className="file-icon"></div>
                    <div className="file-line" style={{ width: `${Math.random() * 40 + 30}%` }}></div>
                  </div>
                ))}
              </div>
              <div className="screen-scan-overlay"></div>
              <div className="screen-scan-line"></div>
              <div className="screen-glare"></div>
            </div>
            <div className="monitor-chin">
              <div className="monitor-led"></div>
            </div>
          </div>
          
          <div className="monitor-neck"></div>
          <div className="monitor-base"></div>
        </div>

      </div>
    </div>
  )
}
