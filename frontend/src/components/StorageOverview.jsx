import React, { useEffect, useRef } from 'react'
import { fetchDiskInfo } from '../utils/api'
import { formatSize, formatSizeGB } from '../utils/helpers'

export default function StorageOverview() {
  const barRef = useRef(null)
  const legendRef = useRef(null)
  const statUsedRef = useRef(null)
  const statTotalRef = useRef(null)
  const statFreeRef = useRef(null)

  useEffect(() => {
    renderStorageBar()
  }, [])

  async function renderStorageBar() {
    try {
      const info = await fetchDiskInfo()

      // Update stats
      if (statUsedRef.current) statUsedRef.current.textContent = formatSizeGB(info.used)
      if (statTotalRef.current) statTotalRef.current.textContent = formatSizeGB(info.total)
      if (statFreeRef.current) statFreeRef.current.textContent = formatSizeGB(info.free) + ' available'

      // Build bar segments
      let barHTML = ''
      let legendHTML = ''

      info.categories.forEach((cat, i) => {
        const pct = (cat.size / info.total * 100)
        if (pct < 0.1) return

        barHTML += `
          <div class="storage-segment"
               style="width:${pct}%;background:${cat.color};animation-delay:${i * 0.08}s"
               title="${cat.name}: ${formatSize(cat.size)}">
            <div class="storage-segment-tooltip">
              <strong>${cat.name}</strong><br>
              ${formatSize(cat.size)} · ${pct.toFixed(1)}%
            </div>
          </div>
        `

        legendHTML += `
          <div class="storage-legend-item">
            <span class="storage-legend-dot" style="background:${cat.color}"></span>
            <span>${cat.name}</span>
            <span class="storage-legend-size">${formatSizeGB(cat.size)}</span>
          </div>
        `
      })

      // Free space segment
      const freePct = (info.free / info.total * 100)
      barHTML += `
        <div class="storage-segment free-segment"
             style="width:${freePct}%"
             title="Free: ${formatSize(info.free)}">
          <div class="storage-segment-tooltip">
            <strong>Free Space</strong><br>
            ${formatSize(info.free)} · ${freePct.toFixed(1)}%
          </div>
        </div>
      `

      legendHTML += `
        <div class="storage-legend-item">
          <span class="storage-legend-dot" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15)"></span>
          <span>Free</span>
          <span class="storage-legend-size">${formatSizeGB(info.free)}</span>
        </div>
      `

      if (barRef.current) barRef.current.innerHTML = barHTML
      if (legendRef.current) legendRef.current.innerHTML = legendHTML

      // Animate segments in
      if (barRef.current) {
        requestAnimationFrame(() => {
          barRef.current.querySelectorAll('.storage-segment').forEach((seg, i) => {
            seg.style.opacity = '0'
            seg.style.transform = 'scaleX(0)'
            setTimeout(() => {
              seg.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
              seg.style.opacity = '1'
              seg.style.transform = 'scaleX(1)'
            }, i * 80)
          })
        })
      }
    } catch (err) {
      console.error('Failed to load disk info:', err)
    }
  }

  return (
    <section className="storage-overview glass-panel" id="storage-overview">
      <div className="storage-header">
        <div className="storage-title">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="3" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <span>Macintosh HD</span>
        </div>
        <div className="storage-stats" id="storage-stats">
          <span className="stat-used" id="stat-used" ref={statUsedRef}>—</span>
          <span className="stat-sep">of</span>
          <span className="stat-total" id="stat-total" ref={statTotalRef}>256 GB</span>
          <span className="stat-sep">used</span>
          <span className="stat-free-badge" id="stat-free-badge" ref={statFreeRef}>— available</span>
        </div>
      </div>
      <div className="storage-bar-wrapper">
        <div className="storage-bar" id="storage-bar" ref={barRef}></div>
      </div>
      <div className="storage-legend" id="storage-legend" ref={legendRef}></div>
    </section>
  )
}
