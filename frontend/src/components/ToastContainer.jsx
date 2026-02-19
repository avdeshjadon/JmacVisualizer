/**
 * ═══════════════════════════════════════════════════════════
 *  Built with ♥ by Avdesh Jadon
 *  GitHub: https://github.com/avdeshjadon
 *
 *  This software is free to use. If you find it helpful:
 *  ⭐ Star the repository | 🍴 Fork the project | 🤝 Contribute
 * ═══════════════════════════════════════════════════════════
 */
import React, { useRef, useCallback } from 'react'

export default function ToastContainer() {
  const containerRef = useRef(null)

  return (
    <div className="toast-container" id="toast-container" ref={containerRef}></div>
  )
}

// Global toast function — call from anywhere
export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container')
  if (!container) return

  const toast = document.createElement('div')
  toast.className = `toast ${type}`

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }

  toast.innerHTML = `
    <span style="font-size:1.1rem;font-weight:700">${icons[type] || 'ℹ'}</span>
    <span>${message}</span>
  `

  container.appendChild(toast)

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease-in forwards'
    setTimeout(() => toast.remove(), 300)
  }, duration)
}
