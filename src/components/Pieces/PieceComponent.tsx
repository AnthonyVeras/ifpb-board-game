import { motion } from 'framer-motion'
import type { Piece } from '../../types'
import { CircleSVG } from './svgs/Circle'
import { SquareSVG } from './svgs/Square'
import { TriangleSVG } from './svgs/Triangle'
import { DiamondSVG } from './svgs/Diamond'

const FILLS: Record<string, string> = {
  red: '#E53935',
  blue: '#1E88E5',
  yellow: '#FDD835',
  green: '#43A047',
}

const STROKES: Record<string, string> = {
  red: '#b71c1c',
  blue: '#0d47a1',
  yellow: '#f9a825',
  green: '#1b5e20',
}

const GLOWS: Record<string, string> = {
  red: 'rgba(229,57,53,0.6)',
  blue: 'rgba(30,136,229,0.6)',
  yellow: 'rgba(253,216,53,0.6)',
  green: 'rgba(67,160,71,0.6)',
}

interface Props {
  piece: Piece
  size: number
  isSelected?: boolean
  isCapturing?: boolean
}

export function PieceComponent({ piece, size, isSelected }: Props) {
  const fill = FILLS[piece.color]
  const stroke = STROKES[piece.color]
  const glow = GLOWS[piece.color]

  const svg = (() => {
    switch (piece.type) {
      case 'circle':   return <CircleSVG fill={fill} stroke={stroke} size={size} />
      case 'square':   return <SquareSVG fill={fill} stroke={stroke} size={size} />
      case 'triangle': return <TriangleSVG fill={fill} stroke={stroke} size={size} color={piece.color} />
      case 'diamond':  return <DiamondSVG fill={fill} stroke={stroke} size={size} />
    }
  })()

  return (
    <motion.div
      layoutId={piece.id}
      layout
      animate={{
        scale: isSelected ? 1.12 : 1,
        filter: isSelected
          ? `drop-shadow(0 0 10px ${glow}) drop-shadow(0 0 5px ${glow})`
          : `drop-shadow(0 2px 3px rgba(0,0,0,0.3))`,
      }}
      transition={{
        layout: { type: 'spring', stiffness: 350, damping: 28, mass: 0.8 },
        scale: { type: 'spring', stiffness: 500, damping: 25 },
        filter: { duration: 0.2 },
      }}
      className="piece-wrapper"
      style={{ lineHeight: 0 }}
    >
      {svg}
    </motion.div>
  )
}
