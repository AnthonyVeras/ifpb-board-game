import { motion } from 'framer-motion'
import type { Cell as CellType, Position } from '../../types'
import { PieceComponent } from '../Pieces/PieceComponent'

interface Props {
  cell: CellType
  cellSize: number
  isSelected: boolean
  isValidMove: boolean
  isValidJump: boolean
  isInPath: boolean
  isLastMove: boolean
  isCircleReturnTarget: boolean
  isArrangingBase?: boolean
  isArrangingSelected?: boolean
  onClick: (pos: Position) => void
}

// Chess.com inspired colors with richer tones
function getBaseBg(row: number, col: number, type: CellType['type']): string {
  switch (type) {
    case 'corner': return '#2a2420'
    case 'base-red': return 'rgba(229,57,53,0.18)'
    case 'base-blue': return 'rgba(30,136,229,0.18)'
    case 'base-yellow': return 'rgba(253,216,53,0.15)'
    case 'base-green': return 'rgba(67,160,71,0.18)'
    case 'playable': {
      const isLight = (row + col) % 2 === 0
      return isLight ? '#ecd5a8' : '#b08b5a'
    }
  }
}

function getBaseTextForType(type: CellType['type']): string {
  switch (type) {
    case 'base-red': return 'rgba(229,57,53,0.5)'
    case 'base-blue': return 'rgba(30,136,229,0.5)'
    case 'base-yellow': return 'rgba(253,216,53,0.4)'
    case 'base-green': return 'rgba(67,160,71,0.5)'
    default: return 'transparent'
  }
}

export function Cell({
  cell, cellSize, isSelected, isValidMove, isValidJump,
  isInPath, isLastMove, isCircleReturnTarget,
  isArrangingBase, isArrangingSelected, onClick
}: Props) {
  const bg = getBaseBg(cell.row, cell.col, cell.type)
  const isCorner = cell.type === 'corner'
  const isBase = cell.type.startsWith('base-')
  const isPlayable = cell.type === 'playable'
  const isClickable = isValidMove || isValidJump || isCircleReturnTarget || isArrangingBase || (cell.piece && !isCorner)
  const isLight = isPlayable && (cell.row + cell.col) % 2 === 0

  return (
    <div
      className={isClickable ? 'board-cell board-cell--clickable' : 'board-cell'}
      style={{
        width: cellSize,
        height: cellSize,
        backgroundColor: bg,
        boxSizing: 'border-box',
      }}
      onClick={() => !isCorner && onClick({ row: cell.row, col: cell.col })}
    >
      {/* Corner label */}
      {isCorner && (
        <span style={{
          fontSize: cellSize * 0.2,
          fontWeight: 800,
          color: '#4a3c2e',
          userSelect: 'none',
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}>
          IFPB
        </span>
      )}

      {/* Base indicator line */}
      {isBase && !cell.piece && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: cellSize * 0.15,
            height: cellSize * 0.15,
            borderRadius: '50%',
            backgroundColor: getBaseTextForType(cell.type),
          }} />
        </div>
      )}

      {/* Arranging base highlight */}
      {isArrangingBase && !isArrangingSelected && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(30,136,229,0.12)',
          border: '1px solid rgba(30,136,229,0.25)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />
      )}

      {/* Selection highlight — chess.com style colored background */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: isArrangingSelected ? 'rgba(30,136,229,0.4)' : 'rgba(255, 255, 100, 0.45)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />
      )}

      {/* Last move highlight — chess.com style subtle yellow */}
      {isLastMove && !isSelected && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: isLight ? 'rgba(255, 255, 100, 0.42)' : 'rgba(180, 180, 50, 0.42)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Path highlight (current jump chain) */}
      {isInPath && !isSelected && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(100, 200, 255, 0.25)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />
      )}

      {/* Circle return target */}
      {isCircleReturnTarget && !cell.piece && (
        <motion.div
          animate={{ scale: [0.85, 1.05, 0.85], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          style={{
            width: cellSize * 0.4,
            height: cellSize * 0.4,
            borderRadius: '50%',
            border: '3px solid #FF6F00',
            backgroundColor: 'rgba(255,111,0,0.15)',
            position: 'absolute',
            zIndex: 2,
          }}
        />
      )}

      {/* Valid move dot — chess.com style */}
      {isValidMove && !cell.piece && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            width: cellSize * 0.28,
            height: cellSize * 0.28,
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.22)',
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}

      {/* Valid move on occupied cell — large ring */}
      {isValidMove && cell.piece && (
        <div style={{
          position: 'absolute',
          inset: 3,
          borderRadius: '50%',
          border: `4px solid rgba(0,0,0,0.25)`,
          pointerEvents: 'none',
          zIndex: 2,
        }} />
      )}

      {/* Valid jump ring — animated glow */}
      {isValidJump && !cell.piece && (
        <motion.div
          animate={{
            scale: [0.75, 0.95, 0.75],
            opacity: [0.4, 0.9, 0.4],
          }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          style={{
            width: cellSize * 0.38,
            height: cellSize * 0.38,
            borderRadius: '50%',
            border: '3px solid rgba(80,180,255,0.85)',
            backgroundColor: 'rgba(80,180,255,0.12)',
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 2,
            boxShadow: '0 0 8px rgba(80,180,255,0.3)',
          }}
        />
      )}

      {/* Valid jump on occupied cell */}
      {isValidJump && cell.piece && (
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: 3,
            borderRadius: '50%',
            border: '3px solid rgba(80,180,255,0.85)',
            pointerEvents: 'none',
            zIndex: 2,
            boxShadow: '0 0 6px rgba(80,180,255,0.2)',
          }}
        />
      )}

      {/* Piece */}
      {cell.piece && (
        <div style={{ zIndex: 3, position: 'relative' }}>
          <PieceComponent
            piece={cell.piece}
            size={cellSize * 0.78}
            isSelected={isSelected}
          />
        </div>
      )}
    </div>
  )
}
