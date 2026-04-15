import { useMemo } from 'react'
import type { Position } from '../../types'

interface Props {
  path: Position[]
  cellSize: number
  boardOffset?: number
}

export function PathOverlay({ path, cellSize }: Props) {
  const points = useMemo(() =>
    path.map(p => ({
      x: p.col * cellSize + cellSize / 2,
      y: p.row * cellSize + cellSize / 2,
    })),
    [path, cellSize]
  )

  if (points.length < 2) return null

  const pathD = points.map((pt, i) =>
    i === 0 ? `M ${pt.x} ${pt.y}` : `L ${pt.x} ${pt.y}`
  ).join(' ')

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {/* Shadow line for depth */}
      <path
        d={pathD}
        fill="none"
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Main animated dashed line */}
      <path
        d={pathD}
        fill="none"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="3"
        strokeDasharray="10 6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="path-line"
      />

      {/* Waypoint dots */}
      {points.slice(1, -1).map((pt, i) => (
        <g key={i}>
          <circle cx={pt.x} cy={pt.y} r={7} fill="rgba(0,0,0,0.3)" /> {/* shadow */}
          <circle
            cx={pt.x}
            cy={pt.y}
            r={5}
            fill="rgba(255,255,255,0.85)"
            stroke="rgba(80,180,255,0.6)"
            strokeWidth="2"
          />
        </g>
      ))}

      {/* Destination marker — glowing ring */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={10}
        fill="rgba(0,0,0,0.2)"
      />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={8}
        fill="rgba(80,200,255,0.9)"
        stroke="white"
        strokeWidth="2.5"
      />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={3}
        fill="white"
      />

      {/* Origin marker */}
      <circle
        cx={points[0].x}
        cy={points[0].y}
        r={5}
        fill="rgba(255,255,255,0.5)"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="1.5"
      />
    </svg>
  )
}
