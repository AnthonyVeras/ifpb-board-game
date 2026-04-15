import { useEffect, useCallback } from 'react'
import { useWindowWidth } from '../../lib/hooks'
import { LayoutGroup, AnimatePresence, motion } from 'framer-motion'
import type { Position } from '../../types'
import { useGameStore } from '../../store/gameStore'
import { useOnlineStore } from '../../store/onlineStore'
import { posEq, getHomeBaseCells } from '../../lib/boardUtils'
import { Cell } from './Cell'
import { PathOverlay } from './PathOverlay'

export function Board() {
  const windowWidth = useWindowWidth()
  const CELL_SIZE = Math.min(64, Math.floor((Math.min(windowWidth, 900) - 32) / 10))
  const {
    board,
    selectedPiece,
    validMoves,
    validJumps,
    currentPath,
    lastMove,
    phase,
    capturedCircleEvent,
    currentTurn,
    arrangingSelectedPiece,
    arrangingCurrentPlayer,
    readyPlayers,
  } = useGameStore()

  // Online store — we get these without subscribing to re-renders on every
  // property, since we only need them inside callbacks
  const onlineStatus = useOnlineStore(s => s.status)
  const myColor = useOnlineStore(s => s.myColor)
  const sendAction = useOnlineStore(s => s.sendAction)

  const isOnline = onlineStatus === 'playing'
  const isMyTurn = !isOnline || currentTurn === myColor

  // Direct game store actions (for local mode)
  const selectPieceDirect = useGameStore(s => s.selectPiece)
  const placeReturnedCircleDirect = useGameStore(s => s.placeReturnedCircle)
  const selectArrangingPieceDirect = useGameStore(s => s.selectArrangingPiece)

  // Circle return target slots
  const circleReturnSlots: Position[] = capturedCircleEvent
    ? getHomeBaseCells(capturedCircleEvent.piece.color).filter(pos =>
        !board[pos.row]?.[pos.col]?.piece
      )
    : []

  // Arranging: highlight base cells for the current arranging player
  const arrangingBaseCells: Position[] = phase === 'arranging'
    ? (() => {
        if (isOnline && myColor) {
          return readyPlayers.includes(myColor) ? [] : getHomeBaseCells(myColor)
        }
        return arrangingCurrentPlayer ? getHomeBaseCells(arrangingCurrentPlayer) : []
      })()
    : []

  const handleCellClick = useCallback((pos: Position) => {
    // ─── Arranging phase ───────────────────────
    if (phase === 'arranging') {
      if (isOnline) {
        if (!myColor || readyPlayers.includes(myColor)) return
        sendAction({ type: 'select_arranging_piece', pos, color: myColor })
      } else {
        if (!arrangingCurrentPlayer || readyPlayers.includes(arrangingCurrentPlayer)) return
        selectArrangingPieceDirect(pos, arrangingCurrentPlayer)
      }
      return
    }

    // ─── Circle return phase ───────────────────
    if (phase === 'circle-return') {
      const isTarget = circleReturnSlots.some(s => posEq(s, pos))
      if (isTarget) {
        if (isOnline && isMyTurn) {
          sendAction({ type: 'place_returned_circle', pos })
        } else if (!isOnline) {
          placeReturnedCircleDirect(pos)
        }
      }
      return
    }

    // ─── Playing phase ─────────────────────────
    if (phase === 'playing') {
      if (isOnline && isMyTurn) {
        sendAction({ type: 'select_piece', pos })
      } else if (!isOnline) {
        selectPieceDirect(pos)
      }
    }
  }, [phase, circleReturnSlots, isOnline, isMyTurn, myColor, readyPlayers,
      arrangingCurrentPlayer, sendAction, placeReturnedCircleDirect,
      selectPieceDirect, selectArrangingPieceDirect])

  // Keyboard: Enter to confirm, Backspace to undo
  const { confirmMove, undoLastStep, currentPath: path } = useGameStore()
  const sendActionForKeys = useOnlineStore(s => s.sendAction)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const online = useOnlineStore.getState()
      const isOnlineNow = online.status === 'playing'
      const curTurn = useGameStore.getState().currentTurn
      const myTurn = !isOnlineNow || curTurn === online.myColor

      // Don't handle keyboard during arranging
      if (useGameStore.getState().phase === 'arranging') return
      if (!myTurn) return

      if (e.key === 'Enter' && path.length >= 2) {
        if (isOnlineNow) {
          sendActionForKeys({ type: 'confirm_move' })
        } else {
          confirmMove()
        }
      }
      if (e.key === 'Backspace') {
        if (isOnlineNow) {
          sendActionForKeys({ type: 'undo_last_step' })
        } else {
          undoLastStep()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [confirmMove, undoLastStep, path, sendActionForKeys])

  if (!board.length) return null

  return (
    <div className="board-container" style={{ position: 'relative' }}>
      {/* Wooden frame effect */}
      <div style={{
        position: 'absolute',
        inset: -4,
        borderRadius: 14,
        background: 'linear-gradient(145deg, #8b6914 0%, #5d4037 50%, #3e2723 100%)',
        zIndex: -1,
      }} />

      {/* Board grid */}
      <LayoutGroup>
        <div
          className="board-grid"
          style={{
            gridTemplateColumns: `repeat(10, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(10, ${CELL_SIZE}px)`,
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const pos = { row: rIdx, col: cIdx }
              const isSelected = !!selectedPiece && posEq(selectedPiece, pos)
              const isValidMove = validMoves.some(m => posEq(m, pos))
              const isValidJump = validJumps.some(j => posEq(j, pos))
              const isInPath = currentPath.some(p => posEq(p, pos))
              const isLastMove = !!lastMove && (
                posEq(lastMove.from, pos) ||
                lastMove.path.some(p => posEq(p, pos))
              )
              const isCircleReturnTarget = circleReturnSlots.some(s => posEq(s, pos))
              const isArrangingSelected = !!arrangingSelectedPiece && posEq(arrangingSelectedPiece, pos)
              const isArrangingBase = arrangingBaseCells.some(b => posEq(b, pos))

              return (
                <Cell
                  key={`${rIdx}-${cIdx}`}
                  cell={cell}
                  cellSize={CELL_SIZE}
                  isSelected={isSelected || isArrangingSelected}
                  isValidMove={isValidMove}
                  isValidJump={isValidJump}
                  isInPath={isInPath}
                  isLastMove={isLastMove}
                  isCircleReturnTarget={isCircleReturnTarget}
                  isArrangingBase={isArrangingBase}
                  isArrangingSelected={isArrangingSelected}
                  onClick={handleCellClick}
                />
              )
            })
          )}
        </div>
      </LayoutGroup>

      {/* Path SVG overlay */}
      <PathOverlay path={currentPath} cellSize={CELL_SIZE} />

      {/* Circle return banner */}
      <AnimatePresence>
        {phase === 'circle-return' && capturedCircleEvent && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'absolute',
              top: -56,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(255,111,0,0.95)',
              color: 'white',
              textAlign: 'center',
              padding: '10px 24px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 14,
              boxShadow: '0 4px 16px rgba(255,111,0,0.4)',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(8px)',
            }}>
            ⬅ Jogador {capturedCircleEvent.piece.color.toUpperCase()}: escolha onde o círculo retorna
          </motion.div>
        )}
      </AnimatePresence>

      {/* Arranging phase banner */}
      <AnimatePresence>
        {phase === 'arranging' && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'absolute',
              top: -56,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(30,136,229,0.95)',
              color: 'white',
              textAlign: 'center',
              padding: '10px 24px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 14,
              boxShadow: '0 4px 16px rgba(30,136,229,0.4)',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(8px)',
            }}>
            🔄 Redistribua suas peças — clique para trocar posições
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

