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
// Tooltip.jsx -- Floating Tooltip for SunburstChart Segments
// ============================================================
// Renders a floating tooltip div whose position and content are controlled
// imperatively via a forwarded ref rather than through React state, to avoid
// the latency of a re-render cycle on every mouse-move event inside the D3
// SunburstChart.
//
// The parent (ChartContainer) holds the ref and calls tooltip methods from
// within D3 mousemove/mouseleave handlers. This pattern keeps tooltip updates
// synchronous with mouse events without React overhead.
//
// Props:
//   tooltipRef {React.RefObject} -- Ref forwarded from ChartContainer and
//                                   used by SunburstChart's D3 event handlers
//                                   to set innerHTML, style.left, style.top,
//                                   and visibility on the tooltip element.
// ----------------------------------------------------------------------------
import React from 'react'

export default function Tooltip({ tooltipRef }) {
  return (
    <div className="tooltip" id="tooltip" ref={tooltipRef}></div>
  )
}
