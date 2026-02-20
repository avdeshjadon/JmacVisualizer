import React, { useRef, useState, useEffect, useCallback } from 'react'
import { formatSize, getPercentage } from '../utils/helpers'
import SunburstChart from './charts/SunburstChart'

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
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 })

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
    onHoverNode(d, root)
  }, [onHoverNode])

  // Tooltip Logic
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
    
    // For directories, show top children
    if (isDir && d.children) {
      const topChildren = [...d.children]
        .sort((a, b) => (b.data.size || 0) - (a.data.size || 0))
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
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <SunburstChart 
          data={data} 
          width={dimensions.width} 
          height={dimensions.height}
          onHoverNode={handleHoverNode}
          onClickNode={onClickDirectory}
          onGoBack={onGoBack}
        />
      </div>
    </div>
  )
}
