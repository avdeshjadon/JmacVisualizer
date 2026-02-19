import React, { useEffect, useRef } from 'react'
import { getColor } from '../../utils/colors'

export default function CityChart({ data, width, height, onHoverNode, onClickNode, onGoBack }) {
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

    // --- Zoom ---
    const zoomGroup = svg.append('g')
    const zoom = d3.zoom()
      .scaleExtent([0.1, 50])
      .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform)
      })
    svg.call(zoom)

    // Center the city in the viewport
    const centerX = width / 2
    const centerY = height / 4
    // Center the city in the viewport
    const container = zoomGroup.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`)

    // Determine sizing: flatten distribution for visibility
    // Raise MIN_BYTES to ensure small files have a visible footprint
    const MIN_BYTES = 40000 // 40KB floor
    const root = d3.hierarchy(data)
      .sum(d => {
        if (!d.children || d.children.length === 0) {
          const size = d.size || 0
          // Use power 0.4 to boost smaller files relative to large ones
          return Math.pow(Math.max(size, MIN_BYTES), 0.4)
        }
        return 0
      })
      .sort((a, b) => (b.value || 0) - (a.value || 0))

    const mapSize = Math.min(width, height) * 1.5
    d3.treemap()
      .size([mapSize, mapSize])
      .paddingInner(3)
      .paddingOuter(6)
      .round(true)
      (root)

    // --- Isometric Projection ---
    const iso = (x, y) => ({ x: (x - y), y: (x + y) * 0.5 })

    // --- Height Scale (based on actual size, not layout value) ---
    const allFiles = root.descendants().filter(d => !d.children || d.children.length === 0)
    const maxSize = d3.max(allFiles, d => d.data.size || 0) || 1
    const heightScale = d3.scaleSqrt().domain([0, maxSize]).range([5, 180])

    // --- Painter's Algorithm: back-to-front ---
    const nodes = root.descendants()
    nodes.sort((a, b) => (a.x0 + a.y0) - (b.x0 + b.y0))

    // --- Render each node ---
    nodes.forEach(d => {
      if (d === root) return

      const isFile = !d.children || d.children.length === 0
      const pad = isFile ? 1 : 2
      const w = Math.max(0, (d.x1 - d.x0) - pad * 2)
      const h = Math.max(0, (d.y1 - d.y0) - pad * 2)
      const x = d.x0 + pad
      const y = d.y0 + pad

      if (w <= 0 || h <= 0) return

      // Height: files use actual size; folders get flat base
      const fileSize = d.data.size || 0
      const z = isFile ? Math.max(5, heightScale(fileSize)) : 2

      // ISO vertices
      const p1 = iso(x,     y    )
      const p2 = iso(x + w, y    )
      const p3 = iso(x + w, y + h)
      const p4 = iso(x,     y + h)
      const p1t = { x: p1.x, y: p1.y - z }
      const p2t = { x: p2.x, y: p2.y - z }
      const p3t = { x: p3.x, y: p3.y - z }
      const p4t = { x: p4.x, y: p4.y - z }

      // Colors
      const baseC = d3.color(getColor(d))
      const topC   = isFile ? baseC.brighter(0.3).toString()  : 'rgba(255,255,255,0.04)'
      const leftC  = isFile ? baseC.darker(0.3).toString()    : d3.color(getColor(d)).darker(1.5).toString()
      const rightC = isFile ? baseC.darker(0.7).toString()    : d3.color(getColor(d)).darker(2.5).toString()
      const strokeC = isFile ? 'none' : 'rgba(255,255,255,0.08)'

      const g = container.append('g')

      // Left face
      g.append('path')
        .attr('d', `M${p4.x},${p4.y} L${p3.x},${p3.y} L${p3t.x},${p3t.y} L${p4t.x},${p4t.y} Z`)
        .attr('fill', leftC)
        .attr('stroke', strokeC)

      // Right face
      g.append('path')
        .attr('d', `M${p2.x},${p2.y} L${p3.x},${p3.y} L${p3t.x},${p3t.y} L${p2t.x},${p2t.y} Z`)
        .attr('fill', rightC)
        .attr('stroke', strokeC)

      // Top face
      g.append('path')
        .attr('class', 'roof')
        .attr('d', `M${p1t.x},${p1t.y} L${p2t.x},${p2t.y} L${p3t.x},${p3t.y} L${p4t.x},${p4t.y} Z`)
        .attr('fill', topC)
        .attr('stroke', isFile ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)')
        .attr('stroke-dasharray', isFile ? 'none' : '3,3')

      // Interactivity
      if (isFile || d.depth <= 3) {
        g.attr('cursor', 'pointer')
          .on('mouseenter', function(evt) {
            d3.select(this).select('.roof').attr('fill', 'rgba(255,255,255,0.7)')
            onHoverNode(d, root, evt)
          })
          .on('mouseleave', function() {
            d3.select(this).select('.roof').attr('fill', topC)
            onHoverNode(null, null, null)
          })
          .on('click', (evt) => {
            evt.stopPropagation()
            if (d.data.type === 'directory' && d.data.path) {
              onClickNode(d.data.path)
            }
          })
      }
    })
  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ overflow: 'visible', background: 'radial-gradient(circle at 50% 30%, #1a1a2e 0%, #000005 100%)' }}
    />
  )
}
