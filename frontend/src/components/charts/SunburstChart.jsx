/**
 * ═══════════════════════════════════════════════════════════
 *  Built with ♥ by Avdesh Jadon
 *  GitHub: https://github.com/avdeshjadon
 *
 *  This software is free to use. If you find it helpful:
 *  ⭐ Star the repository | 🍴 Fork the project | 🤝 Contribute
 * ═══════════════════════════════════════════════════════════
 */
import React, { useEffect, useRef } from 'react'
import { getColor } from '../../utils/colors'
import { formatSize } from '../../utils/helpers'

const BG = 'transparent'

export default function SunburstChart({ data, width, height, onHoverNode, onClickNode, onGoBack }) {
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

    const radius = Math.min(width, height) / 2 * 0.92

    // Zoom
    const containerGroup = svg.append('g')
    const zoom = d3.zoom()
      .scaleExtent([0.1, 100])
      .on('zoom', (event) => { containerGroup.attr('transform', event.transform) })
    svg.call(zoom)

    const g = containerGroup.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`)

    // KEY FIX: cube-root scaling compresses 1GB vs 1KB from 1,000,000:1 → 100:1
    // This ensures very small folders still get meaningful arc angles
    const hierarchy = d3.hierarchy(data)
      .sum(d => (!d.children || d.children.length === 0) ? Math.cbrt(Math.max(d.size || 0, 512)) : 0)
      .sort((a, b) => (b.data.size || 0) - (a.data.size || 0))

    const root = d3.partition()
      .size([2 * Math.PI, radius])
      (hierarchy)

    // KEY FIX: limit to 4 depth levels to avoid rings becoming sub-pixel thin
    const MAX_DEPTH = 4
    const depthRadius = radius / MAX_DEPTH

    // Arc — each depth level gets equal radial width for clarity
    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.003))
      .padRadius(depthRadius)
      .innerRadius(d => Math.min(d.depth, MAX_DEPTH) * depthRadius)
      .outerRadius(d => Math.min(d.depth + 1, MAX_DEPTH) * depthRadius - 1)

    // Hover arc (expanded)
    const hoverArc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.003))
      .padRadius(depthRadius)
      .innerRadius(d => Math.max(0, Math.min(d.depth, MAX_DEPTH) * depthRadius - 3))
      .outerRadius(d => Math.min(d.depth + 1, MAX_DEPTH) * depthRadius + 4)

    // Render all arcs for depth 1..MAX_DEPTH
    // Hide arcs that are too tiny to be meaningful (< 1px)
    const paths = g.selectAll('path')
      .data(root.descendants().filter(d => {
        if (d.depth === 0) return false
        if (d.depth > MAX_DEPTH) return false
        // Show arc only if angular width > 0.003 rad (avoids sub-pixel slivers)
        return (d.x1 - d.x0) > 0.002
      }))
      .join('path')
      .attr('d', arc)
      .attr('fill', d => getColor(d))
      .attr('fill-opacity', d => {
        // Files: more opaque; folders: semi-transparent
        const isFile = !d.data.children || d.data.children.length === 0
        return isFile ? 0.9 : 0.6 - (d.depth * 0.05)
      })
      .attr('stroke', 'rgba(10, 10, 26, 0.6)')
      .attr('stroke-width', 0.5)
      .attr('cursor', d => d.data.type === 'directory' ? 'pointer' : 'default')
      .on('mouseenter', function(evt, d) {
        d3.select(this)
          .raise()
          .transition().duration(150)
          .attr('d', hoverArc)
          .attr('fill-opacity', 1)
          .attr('stroke', 'rgba(255,255,255,0.8)')
          .attr('stroke-width', 1.5)
        onHoverNode(d, root, evt)
      })
      .on('mouseleave', function(evt, d) {
        const isFile = !d.data.children || d.data.children.length === 0
        d3.select(this)
          .transition().duration(150)
          .attr('d', arc)
          .attr('fill-opacity', isFile ? 0.9 : 0.6 - (d.depth * 0.05))
          .attr('stroke', 'rgba(10, 10, 26, 0.6)')
          .attr('stroke-width', 0.5)
        onHoverNode(null, null, null)
      })
      .on('click', function(evt, d) {
        if (d.data.type === 'directory' && d.data.path) {
          onClickNode(d.data.path)
        }
      })

    // Entrance animation - grow from center
    paths
      .attr('d', d => arc({ ...d, x0: 0, x1: 0 }))
      .transition()
      .duration(700)
      .delay((d, i) => d.depth * 100 + i * 1)
      .ease(d3.easeCubicOut)
      .attrTween('d', function(d) {
        const iX0 = d3.interpolate(0, d.x0)
        const iX1 = d3.interpolate(0, d.x1)
        return t => arc({ ...d, x0: iX0(t), x1: iX1(t) })
      })

    // Center back-button circle
    const innerR = depthRadius - 2
    g.append('circle')
      .attr('r', innerR)
      .attr('fill', 'rgba(10, 10, 26, 0.4)')
      .attr('stroke', 'rgba(124, 92, 252, 0.3)')
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer')
      .on('mouseenter', function() {
        d3.select(this).attr('fill', 'rgba(124, 92, 252, 0.1)').attr('stroke', 'rgba(124, 92, 252, 0.6)')
      })
      .on('mouseleave', function() {
        d3.select(this).attr('fill', 'rgba(10, 10, 26, 0.4)').attr('stroke', 'rgba(124, 92, 252, 0.3)')
      })
      .on('click', onGoBack)

    // Center label
    const textGroup = g.append('g').attr('pointer-events', 'none').attr('text-anchor', 'middle')
    textGroup.append('text')
      .text(() => {
        const n = root.data.name
        return n && n.length > 14 ? n.substring(0, 11) + '…' : (n || 'Root')
      })
      .attr('y', -6)
      .attr('fill', '#fff')
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')

    textGroup.append('text')
      .text(() => formatSize(root.data.size || 0))
      .attr('y', 12)
      .attr('fill', 'rgba(255,255,255,0.7)')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')

    onHoverNode(root, root, null)
  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ overflow: 'visible' }}
    />
  )
}
