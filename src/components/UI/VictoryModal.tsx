import { useEffect } from 'react'
import { motion } from 'framer-motion'
import type { PlayerColor } from '../../types'

const COLOR_NAMES: Record<PlayerColor, string> = {
  red: 'Vermelho',
  blue: 'Azul',
  yellow: 'Amarelo',
  green: 'Verde',
}

const COLORS: Record<PlayerColor, string> = {
  red: '#E53935',
  blue: '#1E88E5',
  yellow: '#FDD835',
  green: '#43A047',
}

interface Props {
  winner: PlayerColor
  players: { color: PlayerColor; name: string }[]
  onPlayAgain: () => void
  onHome: () => void
}

export function VictoryModal({ winner, players, onPlayAgain, onHome }: Props) {
  const winnerPlayer = players.find(p => p.color === winner)
  const winnerColor = COLORS[winner]

  useEffect(() => {
    let cancelled = false

    void import('canvas-confetti').then(({ default: confetti }) => {
      if (cancelled) return

      const end = Date.now() + 4000
      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 65,
          origin: { x: 0, y: 0.6 },
          colors: [winnerColor, '#ffffff', '#ffd700'],
        })
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 65,
          origin: { x: 1, y: 0.6 },
          colors: [winnerColor, '#ffffff', '#ffd700'],
        })
        if (Date.now() < end && !cancelled) requestAnimationFrame(frame)
      }

      frame()
    })

    return () => {
      cancelled = true
    }
  }, [winner, winnerColor])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <motion.div
        initial={{ scale: 0.3, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.1 }}
        style={{
          background: 'linear-gradient(145deg, #1e1e1e 0%, #151515 100%)',
          borderRadius: 20,
          padding: '48px 56px',
          textAlign: 'center',
          border: `2px solid ${winnerColor}55`,
          boxShadow: `0 0 60px ${winnerColor}22, 0 24px 48px rgba(0,0,0,0.5)`,
          minWidth: 360,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          top: -60,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${winnerColor}20, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.3 }}
          style={{ fontSize: 64, marginBottom: 16, position: 'relative' }}
        >
          🏆
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            background: `linear-gradient(135deg, ${winnerColor}, #ffd700)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: 36,
            margin: '0 0 8px',
            fontWeight: 900,
            letterSpacing: -0.5,
          }}
        >
          Vitória!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ color: '#ddd', fontSize: 20, margin: '0 0 36px' }}
        >
          <strong style={{ color: winnerColor }}>{winnerPlayer?.name ?? COLOR_NAMES[winner]}</strong> venceu!
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          style={{ display: 'flex', gap: 12, justifyContent: 'center' }}
        >
          <button
            className="btn btn-primary"
            onClick={onPlayAgain}
            style={{
              padding: '12px 28px',
              fontSize: 15,
              background: `linear-gradient(135deg, ${winnerColor}, ${winnerColor}cc)`,
              boxShadow: `0 4px 16px ${winnerColor}44`,
            }}
          >
            Jogar Novamente
          </button>
          <button
            className="btn btn-ghost"
            onClick={onHome}
            style={{ padding: '12px 28px', fontSize: 15 }}
          >
            Menu Principal
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
