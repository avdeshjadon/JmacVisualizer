import React from 'react'
import { formatSize, getPercentage } from '../utils/helpers'
import { getColor, FILE_COLORS } from '../utils/colors'

export default function Sidebar({ hoveredNode, rootNode, onDelete, onNavigate }) {
  return (
    <aside className="sidebar glass-panel" id="sidebar">
      <div className="sidebar-header">
        <h2>File Details</h2>
      </div>
      <div className="sidebar-body">
        <section className="sidebar-section">
          <h3>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Selected Item
          </h3>
          <div className="sidebar-section-content">
            <SidebarDetail d={hoveredNode} root={rootNode} onDelete={onDelete} />
          </div>
        </section>

        {/* Directory Contents */}
        <section className="sidebar-section" id="dir-contents-section">
          <h3>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Directory Contents
          </h3>
          <div className="sidebar-section-content">
            <FolderList root={rootNode} onNavigate={onNavigate} />
          </div>
        </section>

        {/* Top files list */}
        <section className="sidebar-section" id="top-files-section">
          <h3>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
              <path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
            Largest Items
          </h3>
          <div className="sidebar-section-content">
            <TopFilesList root={rootNode} onNavigate={onNavigate} />
          </div>
        </section>

        {/* Legend */}
        <section className="sidebar-section">
          <h3>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            File Types
          </h3>
          <div className="sidebar-section-content">
            <Legend root={rootNode} />
          </div>
        </section>
      </div>
    </aside>
  )
}

function FolderList({ root, onNavigate }) {
  if (!root || !root.children) return <div className="empty-state">Empty directory</div>

  // Sort: Directories first, then files. Both alphabetical.
  const sorted = [...root.children].sort((a, b) => {
    const aIsDir = a.data.type === 'directory'
    const bIsDir = b.data.type === 'directory'
    if (aIsDir && !bIsDir) return -1
    if (!aIsDir && bIsDir) return 1
    return a.data.name.localeCompare(b.data.name)
  })

  return (
    <ul className="file-list" id="folder-list">
      {sorted.map((d, i) => {
        const isDir = d.data.type === 'directory'
        const c = getColor(d)
        return (
          <li key={d.data.path || i} 
              onClick={() => { if (isDir && d.data.path) onNavigate(d.data.path) }}
              style={{ cursor: isDir ? 'pointer' : 'default' }}
          >
            <span className="color-dot" style={{ background: c }}></span>
            <div className={`file-info ${isDir ? 'is-directory' : ''}`}>
              <div className="file-name" title={d.data.name}>
                {d.data.name}
              </div>
              <div className="file-size">{formatSize(d.data.size || d.value)}</div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function SidebarDetail({ d, root, onDelete }) {
  if (!d || !d.data) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p>Hover over a segment for details</p>
      </div>
    )
  }

  const pct = getPercentage(d, root).toFixed(2)
  const isDir = d.data.type === 'directory'
  const canDelete = d.data.path && d.data.type !== 'other'

  return (
    <div className="file-detail">
      <div className="detail-header">
        <div className="detail-icon-box" style={{ color: getColor(d) }}>
          {isDir ? '📁' : '📄'}
        </div>
        <div className="detail-main-info">
          <div className="detail-name" title={d.data.name}>{d.data.name}</div>
          <code className="detail-path" title={d.data.path}>{d.data.path}</code>
        </div>
      </div>

      <div className="detail-stats-grid">
        <div className="detail-stat-card">
          <span className="detail-stat-label">Size</span>
          <span className="detail-stat-value accent">{formatSize(d.data.size || d.value)}</span>
        </div>
        <div className="detail-stat-card">
          <span className="detail-stat-label">Percentage</span>
          <span className="detail-stat-value">{pct}%</span>
        </div>
        <div className="detail-stat-card">
          <span className="detail-stat-label">Type</span>
          <span className="detail-stat-value">{isDir ? 'Directory' : (d.data.extension || 'File')}</span>
        </div>
        {isDir && d.children && (
          <div className="detail-stat-card">
            <span className="detail-stat-label">Items</span>
            <span className="detail-stat-value">{d.children.length}</span>
          </div>
        )}
      </div>

      {canDelete && (
        <div className="detail-actions">
          <button className="btn btn-delete-sm btn-block" onClick={() => onDelete(d.data.path, d.data.size || d.value)}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '8px'}}>
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
            Delete Item
          </button>
        </div>
      )}
    </div>
  )
}

function TopFilesList({ root, onNavigate }) {
  if (!root || !root.children) return <div className="empty-state">No items found</div>

  const allNodes = []
  function collect(node) {
    if (node.children) {
      node.children.forEach(collect)
    }
    if (node.data && node.data.type !== 'other') {
      allNodes.push(node)
    }
  }
  root.children.forEach(collect)
  allNodes.sort((a, b) => (b.data.size || b.value) - (a.data.size || a.value))
  const top = allNodes.slice(0, 8)
  const maxSize = top[0] ? (top[0].data.size || top[0].value) : 1

  return (
    <ul className="file-list" id="top-files-list">
      {top.map((d, i) => {
        const c = getColor(d)
        const currentSize = d.data.size || d.value
        const pct = (currentSize / maxSize * 100).toFixed(0)
        return (
          <li key={d.data.path || i} onClick={() => { if (d.data.path) onNavigate(d.data.path) }}>
            <span className="color-dot" style={{ background: c }}></span>
            <div className="file-info">
              <div className="file-name" title={d.data.path}>
                {d.data.name}
              </div>
              <div className="file-size">{formatSize(currentSize)}</div>
            </div>
            <div className="file-bar">
              <div className="file-bar-fill" style={{ width: `${pct}%`, background: c }}></div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Legend({ root }) {
  if (!root) return <div className="empty-state">No data available</div>

  const extMap = {}
  function collect(node) {
    if (node.data) {
      const key = node.data.type === 'directory' ? 'directory' : (node.data.extension || '.none')
      extMap[key] = (extMap[key] || 0) + (node.data.size || node.value)
    }
    if (node.children) node.children.forEach(collect)
  }
  collect(root)

  const sorted = Object.entries(extMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)

  return (
    <div className="legend" id="legend">
      {sorted.map(([ext, size]) => {
        const c = ext === 'directory' ? '#7c5cfc' : (FILE_COLORS[ext] || '#555')
        return (
          <div className="legend-item" key={ext}>
            <span className="legend-dot" style={{ background: c }}></span>
            {ext === 'directory' ? 'Folders' : ext} · {formatSize(size)}
          </div>
        )
      })}
    </div>
  )
}
