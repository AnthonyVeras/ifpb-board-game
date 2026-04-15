interface Props { fill: string; stroke: string; size: number }

export function SquareSVG({ fill, stroke, size }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`sg-${fill}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.25" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
        <filter id={`ss-${fill}`}>
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={stroke} floodOpacity="0.5" />
        </filter>
      </defs>
      <rect x="12" y="12" width="76" height="76" rx="8" fill={fill} stroke={stroke} strokeWidth="4" filter={`url(#ss-${fill})`} />
      <rect x="12" y="12" width="76" height="76" rx="8" fill={`url(#sg-${fill})`} />
      <rect x="24" y="24" width="52" height="52" rx="4" fill="none" stroke={stroke} strokeWidth="2" opacity="0.2" />
      <rect x="18" y="18" width="24" height="10" rx="3" fill="white" opacity="0.1" />
    </svg>
  )
}
