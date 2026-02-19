import React from 'react'
import { formatSize, getPercentage } from '../utils/helpers'
import { getColor, FILE_COLORS } from '../utils/colors'

export default function Sidebar({ hoveredNode, rootNode, onDelete, onNavigate }) {
  return (
    <aside className="sidebar glass-panel" id="sidebar">
      <div className="sidebar-header">
        <h2>File Details</h2>
      </div>
      <div className="sidebar-content" id="sidebar-content">
        <SidebarDetail d={hoveredNode} root={rootNode} onDelete={onDelete} />
      </div>

      {/* Top files list */}
      <div className="sidebar-section" id="top-files-section">
        <h3>Largest Items</h3>
        <TopFilesList root={rootNode} onNavigate={onNavigate} />
      </div>

      {/* Legend */}
      <div className="sidebar-section">
        <h3>File Types</h3>
        <Legend root={rootNode} />
      </div>
    </aside>
  )
}

function SidebarDetail({ d, root, onDelete }) {
  if (!d || !d.data) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
        <p>Hover over a segment to see details</p>
      </div>
    )
  }

  const pct = getPercentage(d, root).toFixed(2)
  const isDir = d.data.type === 'directory'
  const canDelete = d.data.path && d.data.type !== 'other'

  return (
    <div className="file-detail">
      <div className="detail-name">{isDir ? '📁' : '📄'} {d.data.name}</div>
      <div className="detail-path">{d.data.path}</div>
      <div className="detail-row">
        <span className="detail-label">Size</span>
        <span className="detail-value">{formatSize(d.value)}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">% of parent</span>
        <span className="detail-value">{pct}%</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Type</span>
        <span className="detail-value">{isDir ? 'Directory' : (d.data.extension || 'File')}</span>
      </div>
      {isDir && d.children && (
        <div className="detail-row">
          <span className="detail-label">Items</span>
          <span className="detail-value">{d.children.length}</span>
        </div>
      )}
      {canDelete && (
        <button className="btn btn-delete-sm" onClick={() => onDelete(d.data.path, d.value)}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
          Delete
        </button>
      )}
    </div>
  )
}

function TopFilesList({ root, onNavigate }) {
  if (!root || !root.children) return <ul className="file-list" id="top-files-list"></ul>

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
  allNodes.sort((a, b) => b.value - a.value)
  const top = allNodes.slice(0, 10)
  const maxSize = top[0] ? top[0].value : 1

  return (
    <ul className="file-list" id="top-files-list">
      {top.map((d, i) => {
        const c = getColor(d)
        const pct = (d.value / maxSize * 100).toFixed(0)
        return (
          <li key={d.data.path || i} data-path={d.data.path} onClick={() => { if (d.data.path) onNavigate(d.data.path) }}>
            <span className="color-dot" style={{ background: c }}></span>
            <div className="file-info">
              <div className="file-name" title={d.data.path}>
                {d.data.type === 'directory' ? '📁 ' : ''}{d.data.name}
              </div>
              <div className="file-size">{formatSize(d.value)}</div>
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
  if (!root) return <div className="legend" id="legend"></div>

  const extMap = {}
  function collect(node) {
    if (node.data) {
      const key = node.data.type === 'directory' ? 'directory' : (node.data.extension || '.none')
      extMap[key] = (extMap[key] || 0) + node.value
    }
    if (node.children) node.children.forEach(collect)
  }
  collect(root)

  const sorted = Object.entries(extMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)

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
