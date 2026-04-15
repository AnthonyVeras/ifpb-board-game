interface Props { fill: string; stroke: string; size: number }

export function CircleSVG({ fill, stroke, size }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <radialGradient id={`cg-${fill}`} cx="40%" cy="35%" r="55%">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </radialGradient>
        <filter id={`cs-${fill}`}>
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={stroke} floodOpacity="0.5" />
        </filter>
      </defs>
      <circle cx="50" cy="50" r="38" fill={fill} stroke={stroke} strokeWidth="4" filter={`url(#cs-${fill})`} />
      <circle cx="50" cy="50" r="38" fill={`url(#cg-${fill})`} />
      <circle cx="50" cy="50" r="26" fill="none" stroke={stroke} strokeWidth="2" opacity="0.2" />
      <circle cx="38" cy="34" r="8" fill="white" opacity="0.15" />
    </svg>
  )
}
