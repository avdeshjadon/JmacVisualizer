import React from 'react'

export default function Tooltip({ tooltipRef }) {
  return (
    <div className="tooltip" id="tooltip" ref={tooltipRef}></div>
  )
}
