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

const BG = 'radial-gradient(circle at 50% 30%, #1a1a2e 0%, #000005 100%)'
const SEARCH_BAR_H = 70

export default function SplitView({ data, width, height, chartType = 'sunburst', searchQuery = '', isClosing = false, onHoverNode, onClickNode }) {
  const svgRef = useRef(null)

  // ── Forward: render on data change ──────────────────────────────────────
  useEffect(() => {
    if (data && width && height && !isClosing) renderChart(data, searchQuery)
  }, [data, width, height, searchQuery, chartType])

  // ── Reverse: animate pieces back when closing ────────────────────────────
  useEffect(() => {
    if (!isClosing || !svgRef.current) return
    const d3 = window.d3
    if (!d3) return
    d3.select(svgRef.current)
      .selectAll('.split-node')
      .transition()
      .duration(480)
      .delay(function() {
        // Use stored index for stagger
        return parseInt(d3.select(this).attr('data-idx') || '0') * 14
      })
      .ease(d3.easeBackIn.overshoot(1.1))
      .attr('transform', function() {
        return d3.select(this).attr('data-pack') || 'translate(0,0) scale(0)'
      })
      .style('opacity', 0)
  }, [isClosing])

  function renderChart(data, query) {
    const d3 = window.d3
    if (!d3 || !svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const zoomGroup = svg.append('g')
    const zoomBehavior = d3.zoom().scaleExtent([0.1, 12]).on('zoom', e => zoomGroup.attr('transform', e.transform))
    svg.call(zoomBehavior)

    // Fixed reset-zoom button (not inside zoomGroup, so it stays in top-right corner)
    const resetBtn = svg.append('g')
      .attr('transform', `translate(${width - 86}, 10)`)
      .attr('cursor', 'pointer')
      .style('user-select', 'none')
    resetBtn.append('rect')
      .attr('rx', 8).attr('width', 76).attr('height', 26)
      .attr('fill', 'rgba(255,255,255,0.07)')
      .attr('stroke', 'rgba(255,255,255,0.18)').attr('stroke-width', 1)
      .attr('rx', 8)
    resetBtn.append('text').text('⊡ Reset Zoom')
      .attr('x', 38).attr('y', 17)
      .attr('text-anchor', 'middle').attr('font-size', '10px')
      .attr('fill', 'rgba(255,255,255,0.7)').attr('pointer-events', 'none')
    resetBtn
      .on('mouseenter', function() { d3.select(this).select('rect').attr('fill', 'rgba(255,255,255,0.15)') })
      .on('mouseleave', function() { d3.select(this).select('rect').attr('fill', 'rgba(255,255,255,0.07)') })
      .on('click', () => svg.transition().duration(400).ease(d3.easeCubicOut).call(zoomBehavior.transform, d3.zoomIdentity))

    const lq = (query || '').toLowerCase().trim()
    const isMatch = d => !lq || d.name.toLowerCase().includes(lq)
    const canvasH = height - SEARCH_BAR_H
    const offY = SEARCH_BAR_H

    // Only DIRECT children of the current folder
    const children = (data.children || []).slice()

    if (!children.length) return

    if (chartType === 'sunburst')        explodeSunburst(d3, zoomGroup, children, data, width, canvasH, offY, lq, isMatch)
    else if (chartType === 'circlepack') explodeCircles(d3, zoomGroup, children, data, width, canvasH, offY, lq, isMatch)
    else if (chartType === 'city')       explodeCity(d3, zoomGroup, children, data, width, canvasH, offY, lq, isMatch)
  }

  // ─── SUNBURST → Pie slices explode radially outward ──────────────────────
  function explodeSunburst(d3, g, children, data, W, H, offY, lq, isMatch) {
    const cx = W / 2, cy = offY + H / 2
    const radius = Math.min(W, H) / 2 * 0.63  // slightly bigger slices
    const PUSH = Math.min(W, H) * 0.13           // tight — pieces close together

    // Cube-root scaling: compresses size range so small files get bigger slices
    const pie = d3.pie().value(d => Math.cbrt(Math.max(d.size || 0, 1024))).sort(null)
    const slices = pie(children)

    const arc = d3.arc()
      .innerRadius(radius * 0.32)
      .outerRadius(radius)
      .padAngle(0.018)
      .padRadius(radius * 0.5)
      .cornerRadius(4)

    slices.forEach((s, i) => {
      const matched = isMatch(s.data)
      const col = getColor({ data: s.data, depth: 1 })
      const packT = `translate(${cx},${cy})`

      const ng = g.append('g')
        .attr('class', 'split-node')
        .attr('data-pack', packT)
        .attr('data-idx', i)
        .attr('transform', packT)
        .attr('cursor', s.data.type === 'directory' ? 'pointer' : 'default')
        .style('opacity', lq ? (matched ? 1 : 0.08) : 1)

      // Arc slice
      ng.append('path').attr('class', 'arc-path').attr('d', arc(s))
        .attr('fill', col)
        .attr('fill-opacity', s.data.type === 'directory' ? 0.58 : 0.88)
        .attr('stroke', '#0a0a1a').attr('stroke-width', 0.8)

      // Label ONLY inside the arc — only when arc is wide enough for text
      const arcSpan = (s.endAngle - s.startAngle) * radius  // arc length in px
      const arcHeight = radius * (1 - 0.32)  // radial height
      if (arcSpan > 22 && arcHeight > 14) {
        const [lx, ly] = arc.centroid(s)
        const fs = Math.max(7, Math.min(13, arcSpan / 8))
        const maxC = Math.max(2, Math.floor(arcSpan / (fs * 0.6)))

        ng.append('text')
          .attr('transform', `translate(${lx},${ly})`)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
          .attr('font-size', fs + 'px')
          .attr('fill', '#fff').attr('font-weight', 'bold')
          .attr('pointer-events', 'none')
          .style('opacity', 0)
          .text(s.data.name.length > maxC ? s.data.name.slice(0, maxC - 1) + '…' : s.data.name)
          .transition().delay(300 + i * 18).duration(260).style('opacity', 1)

        // Size on second line only if arc is large
        if (arcSpan > 55) {
          ng.append('text')
            .attr('transform', `translate(${lx},${ly + fs + 2})`)
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
            .attr('font-size', Math.max(6, fs - 2) + 'px')
            .attr('fill', 'rgba(255,255,255,0.55)').attr('pointer-events', 'none')
            .style('opacity', 0)
            .text(formatSize(s.data.size || 0))
            .transition().delay(340 + i * 18).duration(260).style('opacity', 1)
        }
      }

      // Explode outward
      const midA = (s.startAngle + s.endAngle) / 2 - Math.PI / 2
      const dx = Math.cos(midA) * PUSH, dy = Math.sin(midA) * PUSH
      ng.transition().duration(680).delay(50 + i * 22)
        .ease(d3.easeBackOut.overshoot(0.85))
        .attr('transform', `translate(${cx + dx},${cy + dy})`)

      ng.on('mouseenter', function(evt) {
          d3.select(this).select('.arc-path').transition().duration(150)
            .attr('fill-opacity', 1).attr('stroke', 'rgba(255,255,255,0.7)').attr('stroke-width', 1.5)
          onHoverNode({ data: s.data, value: s.data.size || 0 }, null, evt)
        })
        .on('mouseleave', function() {
          d3.select(this).select('.arc-path').transition().duration(150)
            .attr('fill-opacity', s.data.type === 'directory' ? 0.58 : 0.88)
            .attr('stroke', '#0a0a1a').attr('stroke-width', 0.8)
          onHoverNode(null, null, null)
        })
        .on('click', evt => { evt.stopPropagation(); if (s.data.type === 'directory' && s.data.path) onClickNode(s.data.path) })
    })
  }

  // ─── CIRCLEPACK → Circles push apart via force from packed positions ───────
  function explodeCircles(d3, g, children, data, W, H, offY, lq, isMatch) {
    const cx = W / 2, cy = offY + H / 2
    const totalSize = children.reduce((s, d) => s + (d.size || 0), 0) || children.length
    const maxSize = Math.max(...children.map(d => d.size || 0)) || 1
    const radiusScale = d3.scaleSqrt().domain([0, maxSize]).range([20, Math.min(W, H) * 0.24])

    // Fake hierarchy for pack layout (just 1 level deep)
    const fakeRoot = { name: '__root__', children }
    const hierarchy = d3.hierarchy(fakeRoot)
      .sum(d => d === fakeRoot ? 0 : Math.sqrt(Math.max(d.size || 0, 1024)))
      .sort((a, b) => (b.data.size || 0) - (a.data.size || 0))
    const diameter = Math.min(W, H) * 1.05
    d3.pack().size([diameter, diameter]).padding(6)(hierarchy)

    const leafNodes = hierarchy.children || []
    const packOffX = cx - diameter / 2
    const packOffY = cy - diameter / 2

    // Force sim to push circles farther apart from pack positions
    const fnodes = leafNodes.map(n => ({
      data: n.data, r: n.r,
      origX: packOffX + n.x, origY: packOffY + n.y,
      x: packOffX + n.x, y: packOffY + n.y,
    }))

    const sim = d3.forceSimulation(fnodes)
      .force('collide', d3.forceCollide(n => n.r + 16).strength(1).iterations(6))
      .force('charge', d3.forceManyBody().strength(n => -n.r * 6))
      .force('center', d3.forceCenter(cx, cy).strength(0.08))
      .stop()
    for (let i = 0; i < 280; i++) sim.tick()

    fnodes.forEach((n, i) => {
      const matched = isMatch(n.data)
      const col = getColor({ data: n.data, depth: 1 })
      const packT = `translate(${n.origX},${n.origY})`
      const explodeT = `translate(${n.x},${n.y})`

      const ng = g.append('g')
        .attr('class', 'split-node')
        .attr('data-pack', packT)
        .attr('data-idx', i)
        .attr('transform', packT)
        .attr('cursor', n.data.type === 'directory' ? 'pointer' : 'default')
        .style('opacity', lq ? (matched ? 1 : 0.08) : 1)

      // Glow
      ng.append('circle').attr('r', n.r + 12).attr('fill', col).attr('fill-opacity', 0.07)
      // Dashed ring
      ng.append('circle').attr('r', n.r + 4)
        .attr('fill', 'none').attr('stroke', col).attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4').attr('opacity', 0.3)
      // Main
      ng.append('circle').attr('class', 'main-circle').attr('r', n.r)
        .attr('fill', col).attr('fill-opacity', n.data.type === 'directory' ? 0.18 : 0.78)
        .attr('stroke', col).attr('stroke-width', 2.2)
      // Shimmer
      ng.append('circle').attr('r', n.r * 0.36)
        .attr('cx', -n.r * 0.22).attr('cy', -n.r * 0.26)
        .attr('fill', 'rgba(255,255,255,0.14)').attr('pointer-events', 'none')
      // Icon
      ng.append('text').text(n.data.type === 'directory' ? '📁' : '📄')
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('y', -n.r * 0.2).attr('font-size', Math.max(12, n.r * 0.5) + 'px')
        .attr('pointer-events', 'none')
      // Name
      const maxC = Math.max(3, Math.floor(n.r / 4.5))
      ng.append('text')
        .text(n.data.name.length > maxC ? n.data.name.slice(0, maxC - 1) + '…' : n.data.name)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('y', n.r * 0.26).attr('font-size', Math.max(7, Math.min(13, n.r * 0.3)) + 'px')
        .attr('fill', '#fff').attr('font-weight', 'bold').attr('pointer-events', 'none')
        .style('opacity', 0)
        .transition().delay(300 + i * 16).duration(250).style('opacity', 1)
      // Size
      if (n.r > 30) {
        ng.append('text').text(formatSize(n.data.size || 0))
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
          .attr('y', n.r * 0.55).attr('font-size', '9px')
          .attr('fill', 'rgba(255,255,255,0.45)').attr('pointer-events', 'none')
          .style('opacity', 0)
          .transition().delay(350 + i * 16).duration(250).style('opacity', 1)
      }

      ng.transition().duration(700).delay(60 + i * 18)
        .ease(d3.easeBackOut.overshoot(1.1))
        .attr('transform', explodeT)

      ng.on('mouseenter', function(evt) {
          d3.select(this).select('.main-circle').transition().duration(150)
            .attr('r', n.r * 1.1).attr('fill-opacity', 1)
          onHoverNode({ data: n.data, value: n.data.size || 0 }, null, evt)
        })
        .on('mouseleave', function() {
          d3.select(this).select('.main-circle').transition().duration(150)
            .attr('r', n.r).attr('fill-opacity', n.data.type === 'directory' ? 0.18 : 0.78)
          onHoverNode(null, null, null)
        })
        .on('click', evt => { evt.stopPropagation(); if (n.data.type === 'directory' && n.data.path) onClickNode(n.data.path) })
    })
  }

  // ─── CITY → Isometric blocks slide outward ────────────────────────────────
  function explodeCity(d3, g, children, data, W, H, offY, lq, isMatch) {
    const cx = W / 2, cy = offY + H / 2
    // Log-scale — even 0-byte files get floor=4, Library gets ~26. Ratio ~6.5× max.
    const mapSize = Math.min(W, H) * 1.7

    const fakeRoot = { name: '__root__', children }
    const hierarchy = d3.hierarchy(fakeRoot)
      .sum(d => d === fakeRoot ? 0 : Math.max(Math.log2(Math.max(d.size || 0, 512) / 512 + 1) + 1, 4))
      .sort((a, b) => (b.data.size || 0) - (a.data.size || 0))
    // treemapBinary guarantees all leaves receive a cell, even very small ones
    // Fixed grid layout:
    // Calculate grid dimensions based on number of children
    const numChildren = children.length
    const cols = Math.ceil(Math.sqrt(numChildren))
    const rows = Math.ceil(numChildren / cols)

    const cellWidth = mapSize / cols
    const cellHeight = mapSize / rows

    const iso = (x, y) => ({ x: x - y, y: (x + y) * 0.5 })
    const mapOffX = cx - mapSize * 0.5
    const mapOffY = cy - mapSize * 0.5
    const PUSH = Math.min(W, H) * 0.15

    // Cube-root height scale: small files still have visible height
    const maxSz = Math.max(...children.map(d => d.size || 0)) || 1
    const heightScale = d3.scalePow().exponent(0.33)
      .domain([0, maxSz]).range([10, 110])

    children.forEach((d, i) => {
      const matched = isMatch(d)

      // Calculate grid position
      const colIdx = i % cols
      const rowIdx = Math.floor(i / cols)

      const x0 = colIdx * cellWidth
      const y0 = rowIdx * cellHeight
      const x1 = x0 + cellWidth
      const y1 = y0 + cellHeight

      const rawW = x1 - x0, rawH = y1 - y0
      if (rawW < 1 || rawH < 1) return

      const bw = Math.max(2, rawW - 3)
      const bh_ = Math.max(2, rawH - 3)
      const bx = x0 + 1.5, by = y0 + 1.5
      const z = d.type === 'directory' ? 4 : Math.max(10, heightScale(d.size || 0))

      const p1 = iso(bx, by), p2 = iso(bx + bw, by)
      const p3 = iso(bx + bw, by + bh_), p4 = iso(bx, by + bh_)
      const p1t = { x: p1.x, y: p1.y - z }, p2t = { x: p2.x, y: p2.y - z }
      const p3t = { x: p3.x, y: p3.y - z }, p4t = { x: p4.x, y: p4.y - z }

      // Block centroid in screen space
      const bCX = mapOffX + (p1.x + p3.x) / 2
      const bCY = mapOffY + (p1.y + p3.y) / 2
      const vx = bCX - cx, vy = bCY - cy
      const vd = Math.sqrt(vx * vx + vy * vy) || 1
      const tx = (vx / vd) * PUSH, ty = (vy / vd) * PUSH

      const col = getColor({ data: d, depth: 1 })
      const bc = d3.color(col)
      const topC = d.type === 'directory'
        ? d3.color(col).brighter(0.2).copy({ opacity: 0.45 }).toString()
        : bc.brighter(0.5).toString()
      const leftC = bc.darker(0.5).toString()
      const rightC = bc.darker(1.1).toString()

      const mox = mapOffX, moy = mapOffY

      const ng = g.append('g')
        .attr('class', 'split-node')
        .attr('data-pack', 'translate(0,0)')
        .attr('data-idx', i)
        .style('opacity', lq ? (matched ? 1 : 0.06) : 1)
        .attr('cursor', d.type === 'directory' ? 'pointer' : 'default')

      // Left face
      ng.append('path')
        .attr('d', `M${mox+p4.x},${moy+p4.y}L${mox+p3.x},${moy+p3.y}L${mox+p3t.x},${moy+p3t.y}L${mox+p4t.x},${moy+p4t.y}Z`)
        .attr('fill', leftC).attr('stroke', 'rgba(0,0,0,0.3)').attr('stroke-width', 0.5)
      // Right face
      ng.append('path')
        .attr('d', `M${mox+p2.x},${moy+p2.y}L${mox+p3.x},${moy+p3.y}L${mox+p3t.x},${moy+p3t.y}L${mox+p2t.x},${moy+p2t.y}Z`)
        .attr('fill', rightC).attr('stroke', 'rgba(0,0,0,0.3)').attr('stroke-width', 0.5)
      // Roof / top face
      ng.append('path').attr('class', 'roof')
        .attr('d', `M${mox+p1t.x},${moy+p1t.y}L${mox+p2t.x},${moy+p2t.y}L${mox+p3t.x},${moy+p3t.y}L${mox+p4t.x},${moy+p4t.y}Z`)
        .attr('fill', topC)
        .attr('stroke', 'rgba(255,255,255,0.15)').attr('stroke-width', 0.8)

      // Icon on top of roof (folder vs file)
      const topCX = mox + (p1t.x + p3t.x) / 2
      const topCY = moy + (p1t.y + p3t.y) / 2
      const iconSize = Math.max(8, Math.min(16, Math.min(bw, bh_) * 0.35))
      if (iconSize >= 8) {
        ng.append('text')
          .text(d.type === 'directory' ? '📁' : '📄')
          .attr('x', topCX).attr('y', topCY - 2)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
          .attr('font-size', iconSize + 'px')
          .attr('pointer-events', 'none').style('opacity', 0)
          .transition().delay(340 + i * 10).duration(240).style('opacity', 1)
      }

      // Name label — show if block is big enough
      const labelW = Math.min(bw, bh_) * 0.7
      if (labelW > 16) {
        const fs = Math.max(7, Math.min(11, labelW / 6))
        const maxC = Math.max(2, Math.floor(labelW / (fs * 0.58)))
        ng.append('text')
          .text(d.name.length > maxC ? d.name.slice(0, maxC - 1) + '…' : d.name)
          .attr('x', topCX).attr('y', topCY + iconSize * 0.8 + 2)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
          .attr('font-size', fs + 'px').attr('fill', '#fff').attr('font-weight', 'bold')
          .attr('pointer-events', 'none').style('opacity', 0)
          .transition().delay(370 + i * 10).duration(240).style('opacity', 1)
      }

      // Slide outward
      ng.transition().duration(720).delay(60 + i * 12)
        .ease(d3.easeBackOut.overshoot(0.8))
        .style('transform', `translate(${tx}px,${ty}px)`)

      ng.on('mouseenter', function(evt) {
          d3.select(this).select('.roof').transition().duration(150).attr('fill', 'rgba(255,255,255,0.65)')
          onHoverNode({ data: d, value: d.size || 0 }, null, evt)
        })
        .on('mouseleave', function() {
          d3.select(this).select('.roof').transition().duration(150).attr('fill', topC)
          onHoverNode(null, null, null)
        })
        .on('click', evt => { evt.stopPropagation(); if (d.type === 'directory' && d.path) onClickNode(d.path) })
    })
  }

  return (
    <svg ref={svgRef} width={width} height={height}
      style={{ overflow: 'visible', background: BG }} />
  )
}

