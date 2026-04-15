import { motion } from 'framer-motion'
import type { Player, PlayerColor } from '../../types'

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
  players: Player[]
  currentTurn: PlayerColor
  winner: PlayerColor | null
}

export function PlayerPanel({ players, currentTurn, winner }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h3 style={{
        color: 'var(--text-muted)',
        margin: '0 0 4px',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        fontWeight: 600,
      }}>
        Jogadores
      </h3>
      <div className="player-panel-list">
        {players.map((p, i) => {
          const isActive = p.color === currentTurn && !winner
          const isWinner = p.color === winner
          return (
            <motion.div
              key={p.color}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              layout
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                backgroundColor: isActive
                  ? `${COLORS[p.color]}15`
                  : isWinner
                    ? 'rgba(255,215,0,0.08)'
                    : 'var(--bg-card)',
                border: isActive
                  ? `2px solid ${COLORS[p.color]}88`
                  : isWinner
                    ? '2px solid rgba(255,215,0,0.5)'
                    : '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Active indicator glow */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: `radial-gradient(ellipse at 0% 50%, ${COLORS[p.color]}15, transparent 70%)`,
                  pointerEvents: 'none',
                }} />
              )}

              {/* Color indicator */}
              <div style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor: COLORS[p.color],
                flexShrink: 0,
                boxShadow: isActive
                  ? `0 0 10px ${COLORS[p.color]}88, 0 0 4px ${COLORS[p.color]}66`
                  : 'none',
                transition: 'box-shadow 0.3s',
              }} />

              <div style={{ flex: 1, position: 'relative', zIndex: 1, minWidth: 0 }}>
                <div style={{
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 14,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {p.name}
                </div>
                <div style={{
                  color: isActive ? COLORS[p.color] : 'var(--text-muted)',
                  fontSize: 11,
                  fontWeight: 500,
                }}>
                  {COLOR_NAMES[p.color]}
                </div>
              </div>

              {/* Active turn indicator */}
              {isActive && !winner && (
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: COLORS[p.color],
                    boxShadow: `0 0 6px ${COLORS[p.color]}`,
                  }}
                />
              )}

              {/* Winner star */}
              {isWinner && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  style={{ color: 'gold', fontSize: 20, textShadow: '0 0 8px rgba(255,215,0,0.6)' }}
                >
                  ★
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
