/**
 * ═══════════════════════════════════════════════════════════
 *  Built with ♥ by Avdesh Jadon
 *  GitHub: https://github.com/avdeshjadon
 *
 *  This software is free to use. If you find it helpful:
 *  ⭐ Star the repository | 🍴 Fork the project | 🤝 Contribute
 * ═══════════════════════════════════════════════════════════
 */
import React, { useState, useEffect } from 'react'
import { fetchDiskInfo } from '../utils/api'
import { formatSize, formatSizeGB } from '../utils/helpers'

const CATEGORY_PATHS = {
  'Photos': '/Pictures',
  'Music': '/Music',
  'Videos': '/Movies',
  'Downloads': '/Downloads',
  'Documents': '/Documents',
  'Apps': '/Applications',
}

export default function StorageOverview({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const info = await fetchDiskInfo()
        setData(info);
      } catch (err) {
        console.error('Failed to load disk info:', err)
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Listen for refresh events
    const handleRefresh = () => loadData();
    window.addEventListener('refresh-disk', handleRefresh);
    return () => window.removeEventListener('refresh-disk', handleRefresh);
  }, [])

  if (loading && !data) {
    return (
      <section className="storage-overview glass-panel loading-state">
        <div className="spinner-sm"></div>
        <span>Analyzing Macintosh HD...</span>
      </section>
    );
  }

  if (!data) return null;

  const handleSegmentClick = (catName) => {
    const subPath = CATEGORY_PATHS[catName];
    if (subPath && onNavigate) {
      // Typically home + subPath, but backend roots also helps
      // For now, let's assume we want to navigate to the user's home folder + subPath
      // Or just navigate to the path if it's absolute.
      // The backend categorizer uses os.path.expanduser("~"), so these are home relative.
      // We'll try to find the full path.
      onNavigate('~' + subPath);
    }
  };

  return (
    <section className="storage-overview glass-panel" id="storage-overview">
      <div className="storage-header">
        <div className="storage-title">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="3" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <span>Macintosh HD</span>
        </div>
        <div className="storage-stats">
          <span className="stat-used">{formatSizeGB(data.used)}</span>
          <span className="stat-sep">of</span>
          <span className="stat-total">{formatSizeGB(data.total)}</span>
          <span className="stat-sep">used</span>
          <span className="stat-free-badge">{formatSizeGB(data.free)} available</span>
        </div>
      </div>

      <div className="storage-bar-wrapper">
        <div className="storage-bar">
          {data.categories.map((cat, i) => {
            const pct = (cat.size / data.total * 100);
            if (pct < 0.2) return null;
            const hasPath = !!CATEGORY_PATHS[cat.name];
            return (
              <div 
                key={cat.name}
                className={`storage-segment ${hasPath ? 'clickable' : ''}`}
                style={{ 
                  width: `${pct}%`, 
                  background: cat.color,
                  animationDelay: `${i * 0.1}s` 
                }}
                onClick={() => handleSegmentClick(cat.name)}
              >
                <div className="storage-segment-tooltip">
                  <div className="tooltip-header">
                    <span className="dot" style={{ background: cat.color }}></span>
                    <strong>{cat.name}</strong>
                  </div>
                  <div className="tooltip-body">
                    <div className="size">{formatSize(cat.size)}</div>
                    <div className="pct">{pct.toFixed(1)}% of total</div>
                    {hasPath && <div className="hint">Click to explore folder</div>}
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Free Segment */}
          <div 
            className="storage-segment free-segment"
            style={{ width: `${(data.free / data.total * 100)}%` }}
          >
            <div className="storage-segment-tooltip">
              <div className="tooltip-header">
                <span className="dot" style={{ background: 'rgba(255,255,255,0.2)' }}></span>
                <strong>Free Space</strong>
              </div>
              <div className="tooltip-body">
                <div className="size">{formatSize(data.free)}</div>
                <div className="pct">{(data.free / data.total * 100).toFixed(1)}% available</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="storage-legend">
        {data.categories.slice(0, 6).map(cat => (
          <div className="storage-legend-item" key={cat.name}>
            <span className="storage-legend-dot" style={{ background: cat.color }}></span>
            <span className="name">{cat.name}</span>
            <span className="storage-legend-size">{formatSizeGB(cat.size)}</span>
          </div>
        ))}
        <div className="storage-legend-item">
          <span className="storage-legend-dot free"></span>
          <span className="name">Free</span>
          <span className="storage-legend-size">{formatSizeGB(data.free)}</span>
        </div>
      </div>
    </section>
  )
}
