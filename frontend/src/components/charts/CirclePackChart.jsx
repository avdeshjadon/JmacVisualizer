import React, { useEffect, useRef } from 'react'
import { getColor } from '../../utils/colors'

export default function CirclePackChart({ data, width, height, onHoverNode, onClickNode }) {
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
    
    const margin = 20
    const diameter = Math.min(width, height) - margin

    const zoomGroup = svg.append('g')
    const g = zoomGroup.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`)

    const zoom = d3.zoom()
      .scaleExtent([0.1, 50])
      .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform)
      })
    svg.call(zoom)

    // √(size) scaling: big files = bigger circles, tiny files still visible
    const root = d3.hierarchy(data)
      .sum(d => (!d.children || d.children.length === 0) ? Math.sqrt(Math.max(d.size || 0, 1024)) : 0)
      .sort((a, b) => (b.data.size || 0) - (a.data.size || 0))

    const pack = d3.pack()
      .size([diameter, diameter])
      .padding(d => d.depth === 1 ? 20 : 5) 
      (root)

    // Render circles
    const circles = g.selectAll('circle')
      .data(root.descendants().slice(1)) // Skip root
      .join('circle')
      .attr('fill', d => getColor(d))
      .attr('fill-opacity', d => d.children ? 0.15 : 0.8)
      .attr('stroke', d => d.children ? getColor(d) : 'none')
      .attr('stroke-width', d => d.children ? 1 : 0)
      .attr('stroke-opacity', 0.6)
      .on('mouseenter', function (evt, d) {
        d3.select(this)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .attr('fill-opacity', 1)
        onHoverNode(d, root, evt)
       })
      .on('mouseleave', function (evt, d) {
        d3.select(this)
          .attr('stroke', d.children ? getColor(d) : 'none')
          .attr('stroke-width', d.children ? 1 : 0)
          .attr('fill-opacity', d.children ? 0.15 : 0.8)
        onHoverNode(null, null, null)
      })
      .on('click', function(evt, d) {
        if (d.data.type === 'directory' && d.data.path) {
          evt.stopPropagation()
          onClickNode(d.data.path)
        }
      })

    // Animation
    circles
      .attr('transform', d => `translate(${d.x - diameter / 2},${d.y - diameter / 2})`)
      .attr('r', 0)
      .transition().duration(800).ease(d3.easeBackOut)
      .attr('r', d => d.r)

  }

  return (
    <svg ref={svgRef} width={width} height={height} style={{ overflow: 'visible', background: 'radial-gradient(circle at 50% 30%, #1a1a2e 0%, #000005 100%)' }}></svg>
  )
}
