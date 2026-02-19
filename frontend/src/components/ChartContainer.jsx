/**
 * ═══════════════════════════════════════════════════════════
 *  Built with ♥ by Avdesh Jadon
 *  GitHub: https://github.com/avdeshjadon
 *
 *  This software is free to use. If you find it helpful:
 *  ⭐ Star the repository | 🍴 Fork the project | 🤝 Contribute
 * ═══════════════════════════════════════════════════════════
 */
import React, { useRef, useState, useEffect, useCallback } from 'react'
import { formatSize, getPercentage } from '../utils/helpers'
import SunburstChart from './charts/SunburstChart'
import TreemapChart from './charts/TreemapChart'
import CirclePackChart from './charts/CirclePackChart'
import CityChart from './charts/CityChart'
import SplitView from './charts/SplitView'

// Chart types
const CHART_TYPES = [
  { id: 'sunburst', label: 'Sunburst', icon: '◎' },
  { id: 'treemap', label: 'Treemap', icon: '⊞' },
  { id: 'circlepack', label: 'Circle Pack', icon: '○' },
  { id: 'city', label: 'City', icon: '◫' },
]

export default function ChartContainer({
  data,
  centerName,
  centerSize,
  centerItems,
  tooltipRef,
  onHoverNode,
  onClickDirectory,
  onGoBack,
}) {
  const containerRef = useRef(null)
  const [chartType, setChartType] = useState('sunburst')
  const [isSplit, setIsSplit] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [splitSearch, setSplitSearch] = useState('')
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 })

  // Reset split view when switching folders or charts
  useEffect(() => { setIsSplit(false); setIsClosing(false); setSplitSearch('') }, [data, chartType])

  // Close split with reverse animation: animate out → then unmount
  function closeSplit() {
    setIsClosing(true)
    setTimeout(() => {
      setIsSplit(false)
      setIsClosing(false)
      setSplitSearch('')
    }, 520) // slightly longer than animation duration
  }

  // Handle Resize
  useEffect(() => {
    function updateDims() {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current
        setDimensions({ width: clientWidth, height: clientHeight })
      }
    }
    
    // Initial and on resize
    updateDims()
    window.addEventListener('resize', updateDims)
    return () => window.removeEventListener('resize', updateDims)
  }, [])

  // Tooltip handler wrapper
  const handleHoverNode = useCallback((d, root, evt) => {
    if (d && evt) {
      showTooltip(evt, d, root)
    } else {
      hideTooltip()
    }
    // Propagate to parent (Sidebar updates)
    // Note: Some charts might pass null for root if not applicable, handle gracefully
    onHoverNode(d, root)
  }, [onHoverNode])

  // Tooltip Logic (moved from render function)
  function showTooltip(evt, d, root) {
    const el = tooltipRef.current
    if (!el) return
    
    // Calculate percentage if root is provided
    let pctStr = ''
    if (root) {
      pctStr = getPercentage(d, root).toFixed(1) + '%'
    }

    // Rich Tooltip Content
    const isDir = d.data.type === 'directory'
    
    let content = `
      <div class="tt-header">
        <div class="tt-name">${d.data.name}</div>
        <div class="tt-meta">
          <span class="tt-size">${formatSize(d.data.size || 0)}</span>
          ${pctStr ? ` · <span class="tt-pct">${pctStr}</span>` : ''}
        </div>
      </div>
      <div class="tt-path">${d.data.path}</div>
    `
    
    // For directories, show top children (Plan: Rich Tooltip)
    if (isDir && d.children) {
      const topChildren = [...d.children]
        .sort((a, b) => (b.data.size || 0) - (a.data.size || 0)) // Sort by actual size
        .slice(0, 5)
      
      let listHtml = '<div class="tt-files">'
      topChildren.forEach(child => {
         listHtml += `
           <div class="tt-file-row">
             <span class="tt-file-name">${child.data.type === 'directory' ? '📁' : '📄'} ${child.data.name}</span>
             <span class="tt-file-size">${formatSize(child.data.size || 0)}</span>
           </div>
         `
      })
      if (d.children.length > 5) {
        listHtml += `<div class="tt-more">+ ${d.children.length - 5} more...</div>`
      }
      listHtml += '</div>'
      content += listHtml
    } else if (isDir) {
       content += `<div class="tt-empty">Empty directory</div>`
    }

    el.innerHTML = content
    el.classList.add('visible')
    positionTooltip(evt, el)
  }

  function positionTooltip(evt, el) {
    const pad = 14
    let x = evt.clientX + pad
    let y = evt.clientY + pad
    const r = el.getBoundingClientRect()
    
    // Boundary check
    if (x + r.width > window.innerWidth) x = evt.clientX - r.width - pad
    if (y + r.height > window.innerHeight) y = evt.clientY - r.height - pad
    
    // Additional bottom check
    if (y + r.height > window.innerHeight) y = window.innerHeight - r.height - pad

    el.style.left = x + 'px'
    el.style.top = y + 'px'
  }

  function hideTooltip() {
    const el = tooltipRef.current
    if (el) el.classList.remove('visible')
  }

  return (
    <div className="chart-container glass-panel" id="chart-container" ref={containerRef}>
      
      {/* Chart Type Selector */}
      <div className="chart-selector">
        {/* Split button — not for treemap */}
        {chartType !== 'treemap' && data && data.children && data.children.length > 0 && (
          <button
            className={`chart-type-btn ${isSplit ? 'active' : ''}`}
            onClick={() => isSplit ? closeSplit() : setIsSplit(true)}
            title={isSplit ? 'Close Split View' : 'Split — scatter children for readability'}
            style={{ fontSize: '16px', marginRight: 4 }}
          >
            {isSplit ? '✕' : '⊹'}
          </button>
        )}
        <div style={{width: 1, background: 'var(--glass-border)', margin: '0 4px', alignSelf: 'stretch'}} />
        {CHART_TYPES.map(type => (
          <button 
            key={type.id}
            className={`chart-type-btn ${!isSplit && chartType === type.id ? 'active' : ''}`}
            onClick={() => { setChartType(type.id); setIsSplit(false) }}
            title={type.label}
          >
            {type.icon}
          </button>
        ))}
      </div>

      {/* Search bar — visible only in split mode */}
      {isSplit && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          width: '320px',
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '24px',
          padding: '6px 14px',
          backdropFilter: 'blur(12px)',
          gap: 8,
        }}>
          <span style={{ fontSize: 14, opacity: 0.6 }}>🔍</span>
          <input
            autoFocus
            type="text"
            placeholder="Search folders…"
            value={splitSearch}
            onChange={e => setSplitSearch(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '13px',
              width: '100%',
              fontFamily: 'inherit',
            }}
          />
          {splitSearch && (
            <button
              onClick={() => setSplitSearch('')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0, fontSize: 14 }}
            >✕</button>
          )}
        </div>
      )}

      {isSplit && chartType !== 'treemap' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5,
          transition: 'opacity 500ms ease-in-out',
          opacity: isClosing ? 0 : 1,
          pointerEvents: isClosing ? 'none' : 'auto',
        }}>
          <SplitView
            data={data}
            width={dimensions.width}
            height={dimensions.height}
            chartType={chartType}
            searchQuery={splitSearch}
            isClosing={isClosing}
            onHoverNode={handleHoverNode}
            onClickNode={onClickDirectory}
          />
        </div>
      )}

      {/* Normal Charts — always rendered, visible behind split overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        transition: 'opacity 350ms ease-in-out',
        opacity: (isSplit && !isClosing) ? 0 : 1,
        pointerEvents: (isSplit && !isClosing) ? 'none' : 'auto',
      }}>
        {chartType === 'sunburst' && (
          <SunburstChart 
            data={data} 
            width={dimensions.width} 
            height={dimensions.height}
            onHoverNode={handleHoverNode}
            onClickNode={onClickDirectory}
            onGoBack={onGoBack}
          />
        )}

        {chartType === 'treemap' && (
          <TreemapChart 
            data={data} 
            width={dimensions.width} 
            height={dimensions.height}
            onHoverNode={handleHoverNode}
            onClickNode={onClickDirectory}
          />
        )}
        
        {chartType === 'circlepack' && (
          <CirclePackChart 
            data={data} 
            width={dimensions.width} 
            height={dimensions.height}
            onHoverNode={handleHoverNode}
            onClickNode={onClickDirectory}
          />
        )}

        {chartType === 'city' && (
          <CityChart 
            data={data} 
            width={dimensions.width} 
            height={dimensions.height}
            onHoverNode={handleHoverNode}
            onClickNode={onClickDirectory}
            onGoBack={onGoBack}
          />
        )}
      </div>

    </div>
  )
}
