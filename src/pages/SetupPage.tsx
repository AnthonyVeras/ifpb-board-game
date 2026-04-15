import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Player, PlayerColor } from '../types'
import { useGameStore } from '../store/gameStore'

const COLORS: PlayerColor[] = ['red', 'blue', 'yellow', 'green']
const COLOR_LABELS: Record<PlayerColor, string> = {
  red: 'Vermelho', blue: 'Azul', yellow: 'Amarelo', green: 'Verde'
}
const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#E53935', blue: '#1E88E5', yellow: '#FDD835', green: '#43A047'
}
const TIMER_OPTIONS = [
  { label: 'Ilimitado', value: null },
  { label: '15s', value: 15000 },
  { label: '30s', value: 30000 },
  { label: '60s', value: 60000 },
]

export function SetupPage() {
  const navigate = useNavigate()
  const initGame = useGameStore(s => s.initGame)

  const [playerCount, setPlayerCount] = useState(2)
  const [names, setNames] = useState<Record<PlayerColor, string>>({
    red: 'Jogador 1', blue: 'Jogador 2', yellow: 'Jogador 3', green: 'Jogador 4'
  })
  const [timerMs, setTimerMs] = useState<number | null>(null)

  const activeColors = COLORS.slice(0, playerCount)

  const handleStart = () => {
    const players: Player[] = activeColors.map(c => ({
      color: c,
      name: names[c],
      timerMs,
      timeLeft: timerMs,
      isActive: true,
    }))
    initGame(players)
    navigate('/game')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card"
        style={{
          padding: '40px 44px',
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <h2 style={{
          margin: '0 0 32px',
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: -0.5,
        }}>
          Configurar Jogo
        </h2>

        {/* Player count */}
        <div style={{ marginBottom: 28 }}>
          <label style={{
            color: 'var(--text-muted)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            display: 'block',
            marginBottom: 10,
            fontWeight: 600,
          }}>
            Número de Jogadores
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={playerCount === n ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Player names */}
        <div style={{ marginBottom: 28 }}>
          <label style={{
            color: 'var(--text-muted)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            display: 'block',
            marginBottom: 10,
            fontWeight: 600,
          }}>
            Nomes
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeColors.map(c => (
              <motion.div
                key={c}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <div style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  backgroundColor: COLOR_HEX[c],
                  flexShrink: 0,
                  boxShadow: `0 0 8px ${COLOR_HEX[c]}44`,
                }} />
                <input
                  value={names[c]}
                  onChange={e => setNames(prev => ({ ...prev, [c]: e.target.value }))}
                  placeholder={COLOR_LABELS[c]}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    outline: 'none',
                    fontFamily: 'var(--font)',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = COLOR_HEX[c]}
                  onBlur={e => e.target.style.borderColor = 'var(--border-medium)'}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Timer */}
        <div style={{ marginBottom: 36 }}>
          <label style={{
            color: 'var(--text-muted)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            display: 'block',
            marginBottom: 10,
            fontWeight: 600,
          }}>
            Tempo por Jogada
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {TIMER_OPTIONS.map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => setTimerMs(opt.value)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 8,
                  border: timerMs === opt.value
                    ? '2px solid var(--blue)'
                    : '1px solid var(--border-medium)',
                  backgroundColor: timerMs === opt.value
                    ? 'rgba(30,136,229,0.12)'
                    : 'var(--bg-card)',
                  color: timerMs === opt.value ? 'var(--blue)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.15s',
                  fontFamily: 'var(--font)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/')}
            style={{ flex: 1, padding: '13px 0', fontSize: 15 }}
          >
            ← Voltar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleStart}
            style={{ flex: 2, padding: '13px 0', fontSize: 16, fontWeight: 700 }}
          >
            Iniciar Jogo →
          </button>
        </div>
      </motion.div>
    </div>
  )
}
