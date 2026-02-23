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
// Footer.jsx -- Application Footer Component
// ============================================
// Renders a minimal, fixed-height footer bar at the bottom of the application
// containing the project name, author credit, and a GitHub link. Styled to
// blend with the app's dark glassmorphism theme without drawing attention
// away from the main chart and sidebar content above it.
// ----------------------------------------------------------------------------
import React from 'react'

export default function Footer() {
  return (
    <footer className="app-footer">
      <span>Made by Avdesh Jadon</span>
    </footer>
  )
}
