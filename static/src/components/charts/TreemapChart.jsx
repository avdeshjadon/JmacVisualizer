import React, { useEffect, useRef } from 'react'
import { getColor } from '../../utils/colors'
import { formatSize } from '../../utils/helpers'

const BG = 'radial-gradient(circle at 50% 30%, #1a1a2e 0%, #000005 100%)'

export default function TreemapChart({ data, width, height, onHoverNode, onClickNode }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (data && width && height) {
      renderChart(data)
    }
  }, [data, width, height])

  function renderChart(data) {
    const d3 = window.d3
    if (!d3 || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // √(size) scaling — big files dominate, tiny files still visible
    const root = d3.hierarchy(data)
      .sum(d => (!d.children || d.children.length === 0) ? Math.sqrt(Math.max(d.size || 0, 1024)) : 0)
      .sort((a, b) => (b.data.size || 0) - (a.data.size || 0))

    // KEY FIX: use flat padding (no paddingTop cascade) so subfolders don't lose space
    d3.treemap()
      .size([width, height])
      .paddingOuter(2)   // small outer gap between top-level items
      .paddingInner(1)   // 1px gap between all items at every level
      .round(true)
      (root)

    // Zoom
    const containerGroup = svg.append('g').attr('class', 'treemap-container')
    const zoom = d3.zoom()
      .scaleExtent([0.1, 50])
      .on('zoom', (event) => { containerGroup.attr('transform', event.transform) })
    svg.call(zoom)

    // Render ALL descendants (folders + files)
    const nodes = containerGroup.selectAll('g')
      .data(root.descendants().filter(d => d.depth > 0))
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)

    // Background rect for each node
    nodes.append('rect')
      .attr('width',  d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => getColor(d))
      .attr('fill-opacity', d => {
        // Folders are semi-transparent containers; files are opaque
        if (d.children) return 0.12 + (d.depth * 0.04) // Deeper folders slightly more visible
        return 0.85
      })
      .attr('stroke', d => d.children ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)')
      .attr('stroke-width', d => d.children ? 1 : 0.5)
      .attr('rx', 2)
      .attr('cursor', d => d.data.type === 'directory' ? 'pointer' : 'default')
      .on('mouseenter', function(evt, d) {
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2).raise()
        onHoverNode(d, root, evt)
      })
      .on('mouseleave', function(evt, d) {
        d3.select(this)
          .attr('stroke', d.children ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)')
          .attr('stroke-width', d.children ? 1 : 0.5)
        onHoverNode(null, null, null)
      })
      .on('click', function(evt, d) {
        if (d.data.type === 'directory' && d.data.path) {
          onClickNode(d.data.path)
        }
      })

  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ overflow: 'hidden', background: BG }}
    />
  )
}
