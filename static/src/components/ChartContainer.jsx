import React, { useRef, useEffect, useCallback } from 'react'
import { getColor } from '../utils/colors'
import { formatSize, getPercentage } from '../utils/helpers'

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
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const currentRootRef = useRef(null)

  useEffect(() => {
    if (data) {
      renderSunburst(data)
    }
  }, [data])

  function renderSunburst(data) {
    const d3 = window.d3
    if (!d3 || !containerRef.current || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const chartWidth = containerRef.current.clientWidth
    const chartHeight = containerRef.current.clientHeight
    const radius = Math.min(chartWidth, chartHeight) / 2 * 0.85

    svg.attr('viewBox', `${-chartWidth / 2} ${-chartHeight / 2} ${chartWidth} ${chartHeight}`)

    // Create hierarchy
    const hierarchy = d3.hierarchy(data)
      .sum(d => (!d.children || d.children.length === 0) ? d.size : 0)
      .sort((a, b) => b.value - a.value)

    const root = d3.partition()
      .size([2 * Math.PI, radius])
      (hierarchy)

    currentRootRef.current = root

    // Arc generator
    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 - 1)

    // Create arcs with animation
    const paths = svg.selectAll('path')
      .data(root.descendants().filter(d => d.depth > 0))
      .join('path')
      .attr('fill', d => getColor(d))
      .attr('fill-opacity', d => {
        const maxDepth = d3.max(root.descendants(), n => n.depth)
        return 0.95 - (d.depth / (maxDepth + 2)) * 0.3
      })
      .attr('stroke', 'rgba(10, 10, 26, 0.5)')
      .attr('stroke-width', 0.5)
      .attr('cursor', d => d.data.type === 'directory' ? 'pointer' : 'default')
      .style('transition', 'fill-opacity 0.2s ease')
      .on('mouseenter', function (evt, d) {
        d3.select(this).attr('fill-opacity', 1).attr('stroke', 'rgba(255,255,255,0.3)').attr('stroke-width', 1.5)
        showTooltipFn(evt, d, root)
        onHoverNode(d, root)
      })
      .on('mousemove', function (evt) {
        positionTooltipFn(evt)
      })
      .on('mouseleave', function (evt, d) {
        const maxDepth = d3.max(root.descendants(), n => n.depth)
        d3.select(this)
          .attr('fill-opacity', 0.95 - (d.depth / (maxDepth + 2)) * 0.3)
          .attr('stroke', 'rgba(10, 10, 26, 0.5)')
          .attr('stroke-width', 0.5)
        hideTooltipFn()
        // Keep hoveredNode so sidebar & delete button stay visible
        // Only reset center info back to root
        onHoverNode(d, root, true)
      })
      .on('click', function (evt, d) {
        if (d.data.type === 'directory' && d.data.path) {
          onClickDirectory(d.data.path)
        }
      })

    // Entrance animation
    paths.each(function (d) {
      d._target = { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 }
    })
      .attr('d', function (d) {
        return arc({ x0: d.x0, x1: d.x1, y0: 0, y1: 0 })
      })
      .transition()
      .duration(800)
      .delay((d, i) => d.depth * 150 + i * 2)
      .ease(d3.easeCubicOut)
      .attrTween('d', function (d) {
        const iY0 = d3.interpolate(0, d._target.y0)
        const iY1 = d3.interpolate(0, d._target.y1)
        return function (t) {
          return arc({ x0: d.x0, x1: d.x1, y0: iY0(t), y1: iY1(t) })
        }
      })

    // Center circle
    svg.append('circle')
      .attr('r', root.y1 > 0 ? root.children[0].y0 - 2 : 50)
      .attr('fill', 'rgba(10, 10, 26, 0.3)')
      .attr('stroke', 'rgba(124, 92, 252, 0.2)')
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer')
      .style('transition', 'all 0.3s ease')
      .on('mouseenter', function () {
        d3.select(this).attr('fill', 'rgba(124, 92, 252, 0.08)').attr('stroke', 'rgba(124, 92, 252, 0.4)')
      })
      .on('mouseleave', function () {
        d3.select(this).attr('fill', 'rgba(10, 10, 26, 0.3)').attr('stroke', 'rgba(124, 92, 252, 0.2)')
      })
      .on('click', onGoBack)
  }

  // Tooltip functions using ref
  function showTooltipFn(evt, d, root) {
    const el = tooltipRef.current
    if (!el) return
    const pct = getPercentage(d, root).toFixed(1)
    el.innerHTML = `
      <div class="tt-name">${d.data.name}</div>
      <div><span class="tt-size">${formatSize(d.value)}</span> · <span class="tt-pct">${pct}%</span></div>
      ${d.data.type === 'directory' ? `<div style="color:var(--text-muted);font-size:0.72rem;margin-top:2px;">${d.children ? d.children.length : '?'} items</div>` : ''}
      <div class="tt-path">${d.data.path}</div>
    `
    el.classList.add('visible')
    positionTooltipFn(evt)
  }

  function positionTooltipFn(evt) {
    const el = tooltipRef.current
    if (!el) return
    const pad = 14
    let x = evt.clientX + pad
    let y = evt.clientY + pad
    const r = el.getBoundingClientRect()
    if (x + r.width > window.innerWidth) x = evt.clientX - r.width - pad
    if (y + r.height > window.innerHeight) y = evt.clientY - r.height - pad
    el.style.left = x + 'px'
    el.style.top = y + 'px'
  }

  function hideTooltipFn() {
    const el = tooltipRef.current
    if (!el) return
    el.classList.remove('visible')
  }

  return (
    <div className="chart-container glass-panel" id="chart-container" ref={containerRef}>
      <div className="chart-center-info" id="center-info">
        <div className="center-name" id="center-name">{centerName}</div>
        <div className="center-size" id="center-size">{centerSize}</div>
        <div className="center-items" id="center-items">{centerItems}</div>
      </div>
      <svg id="sunburst-chart" ref={svgRef}></svg>
    </div>
  )
}
