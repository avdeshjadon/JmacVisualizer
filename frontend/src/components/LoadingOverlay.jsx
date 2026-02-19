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
