// ----------------------------------------------------------------------------
// Jmac Visualizer -- macOS Disk Usage Analyzer and Storage Manager
// ----------------------------------------------------------------------------
// Author   : Avdesh Jadon
// GitHub   : https://github.com/avdeshjadon
// License  : MIT License -- free to use, modify, and distribute.
//            See LICENSE file in the project root for full license text.
// ----------------------------------------------------------------------------
// If this project helped you, consider starring the repository, opening a
// pull request, or reporting issues on GitHub. Contributions are welcome.
// ----------------------------------------------------------------------------
//
// ToastContainer.jsx -- Notification Toast System
// ==================================================
// Provides a lightweight, self-managing toast notification system. Renders an
// absolutely-positioned container in the bottom-right corner of the screen
// that stacks transient notification messages with type-based styling.
//
// Usage (imperative API via module-level singleton):
//   import ToastContainer, { showToast } from './ToastContainer'
//   showToast('File deleted', 'success', 3000)
//   showToast('Permission denied', 'error')
//   showToast('Scanning...', 'info', 2000)
//
// Each toast auto-dismisses after the specified duration (default 4000 ms).
// <ToastContainer /> must be rendered exactly once in the component tree
// (typically at the App root level) to receive and display toasts.
// ----------------------------------------------------------------------------
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
