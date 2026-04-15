import type { PlayerColor } from '../../../types'

interface Props { fill: string; stroke: string; size: number; color: PlayerColor }

// The triangle POINTS in the direction the piece is heading (toward opponent base)
const ROTATIONS: Record<PlayerColor, number> = {
  red: 180,    // points down
  blue: 0,     // points up
  yellow: 90,  // points right
  green: 270,  // points left
}

export function TriangleSVG({ fill, stroke, size, color }: Props) {
  const rotation = ROTATIONS[color]
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`tg-${fill}-${color}`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.3" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
        <filter id={`ts-${fill}-${color}`}>
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={stroke} floodOpacity="0.5" />
        </filter>
      </defs>
      <g transform={`rotate(${rotation}, 50, 50)`}>
        <polygon
          points="50,10 90,86 10,86"
          fill={fill}
          stroke={stroke}
          strokeWidth="4"
          strokeLinejoin="round"
          filter={`url(#ts-${fill}-${color})`}
        />
        <polygon
          points="50,10 90,86 10,86"
          fill={`url(#tg-${fill}-${color})`}
        />
        <polygon
          points="50,28 76,74 24,74"
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          opacity="0.2"
          strokeLinejoin="round"
        />
        <polygon
          points="50,18 40,36 60,36"
          fill="white"
          opacity="0.12"
        />
      </g>
    </svg>
  )
}
