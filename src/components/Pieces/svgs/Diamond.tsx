interface Props { fill: string; stroke: string; size: number }

export function DiamondSVG({ fill, stroke, size }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`dg-${fill}`} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.3" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
        <filter id={`ds-${fill}`}>
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={stroke} floodOpacity="0.5" />
        </filter>
      </defs>
      <polygon
        points="50,8 92,50 50,92 8,50"
        fill={fill}
        stroke={stroke}
        strokeWidth="4"
        strokeLinejoin="round"
        filter={`url(#ds-${fill})`}
      />
      <polygon
        points="50,8 92,50 50,92 8,50"
        fill={`url(#dg-${fill})`}
      />
      <polygon
        points="50,24 76,50 50,76 24,50"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        opacity="0.2"
        strokeLinejoin="round"
      />
      <polygon
        points="50,16 38,30 62,30"
        fill="white"
        opacity="0.1"
      />
    </svg>
  )
}
