import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { useOnlineStore } from '../store/onlineStore'
import { Board } from '../components/Board/Board'
import { PlayerPanel } from '../components/UI/PlayerPanel'
import { ConfirmMove } from '../components/UI/ConfirmMove'
import { VictoryModal } from '../components/UI/VictoryModal'

const COLOR_HEX: Record<string, string> = {
  red: '#E53935', blue: '#1E88E5', yellow: '#FDD835', green: '#43A047'
}
const TURN_LABELS: Record<string, string> = {
  red: 'Vermelho', blue: 'Azul', yellow: 'Amarelo', green: 'Verde'
}

export function GamePage() {
  const navigate = useNavigate()
  const {
    phase, players, currentTurn, winner, resetGame,
    readyPlayers, arrangingCurrentPlayer, markReady,
  } = useGameStore()
  const {
    status: onlineStatus, myColor, leaveRoom, players: onlinePlayers,
    sendAction,
  } = useOnlineStore()

  const isOnline = onlineStatus === 'playing'
  const isMyTurn = !isOnline || currentTurn === myColor

  useEffect(() => {
    if (phase === 'setup') navigate('/')
  }, [phase, navigate])

  if (phase === 'setup' || !players.length) return null

  const currentPlayer = players.find(p => p.color === currentTurn)
  const turnColor = COLOR_HEX[currentTurn]

  // Find the online player name for current turn
  const onlinePlayerName = isOnline
    ? onlinePlayers.find(p => p.color === currentTurn)?.name
    : undefined

  const handleHome = () => {
    if (isOnline) leaveRoom()
    resetGame()
    navigate('/')
  }

  const handlePlayAgain = () => {
    if (isOnline) {
      leaveRoom()
      resetGame()
      navigate('/lobby')
    } else {
      resetGame()
      navigate('/setup')
    }
  }

  const handleMarkReady = (color: string) => {
    if (isOnline) {
      sendAction({ type: 'mark_ready', color: color as any })
    } else {
      markReady(color as any)
    }
  }

  // For arranging phase: determine which color(s) can interact
  const isArranging = phase === 'arranging'

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 16px',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        maxWidth: 920,
        marginBottom: 20,
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <button
          className="btn btn-ghost"
          onClick={handleHome}
          style={{ padding: '8px 14px', fontSize: 13 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Menu
        </button>

        <AnimatePresence mode="wait">
          {/* Arranging phase header */}
          {isArranging && (
            <motion.div
              key="arranging"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              style={{
                padding: '8px 20px',
                borderRadius: 20,
                backgroundColor: 'rgba(30,136,229,0.12)',
                border: '1.5px solid rgba(30,136,229,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                style={{ fontSize: 14 }}
              >
                🔄
              </motion.div>
              <span style={{
                color: 'var(--blue)',
                fontWeight: 700,
                fontSize: 14,
              }}>
                {isOnline
                  ? (myColor && !readyPlayers.includes(myColor)
                    ? 'Organize suas peças e clique Pronto!'
                    : 'Aguardando todos ficarem prontos...')
                  : `${arrangingCurrentPlayer ? TURN_LABELS[arrangingCurrentPlayer] : ''}: Organize suas peças`
                }
              </span>
            </motion.div>
          )}

          {/* Playing / circle-return phase header */}
          {phase !== 'finished' && !isArranging && (
            <motion.div
              key={currentTurn + phase}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              style={{
                padding: '8px 20px',
                borderRadius: 20,
                backgroundColor: `${turnColor}12`,
                border: `1.5px solid ${turnColor}55`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: turnColor,
                  boxShadow: `0 0 6px ${turnColor}`,
                }}
              />
              <span style={{
                color: turnColor,
                fontWeight: 700,
                fontSize: 14,
              }}>
                {phase === 'circle-return'
                  ? 'Escolha onde o círculo retorna'
                  : isOnline
                    ? isMyTurn
                      ? 'Sua vez!'
                      : `Vez de ${onlinePlayerName ?? TURN_LABELS[currentTurn]}`
                    : `Vez de ${currentPlayer?.name ?? TURN_LABELS[currentTurn]}`
                }
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Online indicator */}
        {isOnline && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 8,
            backgroundColor: 'rgba(67,160,71,0.1)',
            border: '1px solid rgba(67,160,71,0.25)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--green)',
          }}>
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'var(--green)',
              }}
            />
            Online
          </div>
        )}

        {/* Not-my-turn overlay badge */}
        {isOnline && !isMyTurn && phase === 'playing' && (
          <div style={{
            padding: '6px 14px',
            borderRadius: 8,
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-subtle)',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-muted)',
          }}>
            👀 Observando
          </div>
        )}

        {/* Player count */}
        <div style={{
          padding: '6px 14px',
          borderRadius: 8,
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          fontSize: 12,
          fontWeight: 500,
        }}>
          {players.length} jogadores
        </div>
      </div>

      {/* Main game area */}
      <div style={{
        display: 'flex',
        gap: 28,
        alignItems: 'flex-start',
        width: '100%',
        maxWidth: 920,
      }}>
        {/* Board + controls */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          {/* View-only overlay when not my turn in online mode (only during playing) */}
          {isOnline && !isMyTurn && phase === 'playing' && (
            <div style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              cursor: 'not-allowed',
            }} />
          )}
          <Board />
          {/* Show confirm only when it's my turn or local mode, and during playing phase */}
          {phase === 'playing' && (isMyTurn || !isOnline) && <ConfirmMove />}
        </div>

        {/* Side panel */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          minWidth: 220,
          position: 'sticky',
          top: 20,
        }}>
          <PlayerPanel
            players={players}
            currentTurn={currentTurn}
            winner={winner}
          />

          {/* ─── Arranging phase panel ──────────────────────────── */}
          {isArranging && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
              style={{ padding: '16px 18px' }}
            >
              <h4 style={{
                color: 'var(--text-muted)',
                margin: '0 0 12px',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                fontWeight: 600,
              }}>
                🔄 Redistribuição de Peças
              </h4>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: 12,
                margin: '0 0 14px',
                lineHeight: 1.6,
              }}>
                {isOnline
                  ? 'Clique em duas peças no seu campo base para trocar suas posições. Quando estiver satisfeito, clique em Pronto.'
                  : 'Cada jogador pode reorganizar suas peças no campo base. Clique em uma peça e depois em outra posição para trocar.'
                }
              </p>

              {/* Ready status per player */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {players.map(player => {
                  const isReady = readyPlayers.includes(player.color)
                  const isCurrentArranging = !isOnline && arrangingCurrentPlayer === player.color
                  const canClickReady = isOnline
                    ? (myColor === player.color && !isReady)
                    : (isCurrentArranging && !isReady)

                  return (
                    <motion.div
                      key={player.color}
                      layout
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        borderRadius: 10,
                        backgroundColor: isReady
                          ? 'rgba(67,160,71,0.1)'
                          : isCurrentArranging
                            ? `${COLOR_HEX[player.color]}15`
                            : 'var(--bg-elevated)',
                        border: `1px solid ${
                          isReady
                            ? 'rgba(67,160,71,0.3)'
                            : isCurrentArranging
                              ? `${COLOR_HEX[player.color]}44`
                              : 'var(--border-subtle)'
                        }`,
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Color dot */}
                      <div style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: COLOR_HEX[player.color],
                        flexShrink: 0,
                      }} />

                      {/* Name */}
                      <span style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 600,
                        color: isCurrentArranging ? COLOR_HEX[player.color] : 'var(--text-primary)',
                      }}>
                        {player.name}
                      </span>

                      {/* Status / Button */}
                      {isReady ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--green)',
                            backgroundColor: 'rgba(67,160,71,0.15)',
                            padding: '3px 10px',
                            borderRadius: 6,
                            letterSpacing: 0.5,
                          }}
                        >
                          ✓ Pronto
                        </motion.span>
                      ) : canClickReady ? (
                        <button
                          onClick={() => handleMarkReady(player.color)}
                          className="btn btn-primary"
                          style={{
                            padding: '4px 14px',
                            fontSize: 12,
                            fontWeight: 700,
                            borderRadius: 8,
                            lineHeight: '1.4',
                          }}
                        >
                          Pronto ✓
                        </button>
                      ) : (
                        <span style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          fontStyle: 'italic',
                        }}>
                          {isOnline ? 'Aguardando...' : 'Aguardando...'}
                        </span>
                      )}
                    </motion.div>
                  )
                })}
              </div>

              {/* Instructions */}
              <div style={{
                marginTop: 14,
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: 'rgba(30,136,229,0.06)',
                border: '1px solid rgba(30,136,229,0.15)',
              }}>
                <p style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  margin: 0,
                  lineHeight: 1.5,
                }}>
                  💡 Clique em uma peça no campo base, depois clique em outra posição (peça ou vazio) para trocar.
                </p>
              </div>
            </motion.div>
          )}

          {/* My color card (online only) */}
          {isOnline && myColor && (
            <div className="card" style={{
              padding: '14px 16px',
              backgroundColor: `${COLOR_HEX[myColor]}0A`,
              borderColor: `${COLOR_HEX[myColor]}33`,
            }}>
              <h4 style={{
                color: 'var(--text-muted)',
                margin: '0 0 8px',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                fontWeight: 600,
              }}>
                Sua Cor
              </h4>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: COLOR_HEX[myColor],
                  boxShadow: `0 0 12px ${COLOR_HEX[myColor]}44`,
                }} />
                <span style={{
                  fontWeight: 700,
                  fontSize: 16,
                  color: COLOR_HEX[myColor],
                }}>
                  {TURN_LABELS[myColor]}
                </span>
              </div>
            </div>
          )}

          {/* How to play card */}
          {!isArranging && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <h4 style={{
                color: 'var(--text-muted)',
                margin: '0 0 10px',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                fontWeight: 600,
              }}>
                Como jogar
              </h4>
              <ul style={{
                color: 'var(--text-secondary)',
                fontSize: 12,
                margin: 0,
                paddingLeft: 16,
                lineHeight: '1.8',
                listStyleType: 'none',
              }}>
                {[
                  { icon: '👆', text: 'Clique na peça para selecionar' },
                  { icon: '📍', text: 'Clique num ponto para mover' },
                  { icon: '💫', text: 'Anel pulsante = salto disponível' },
                  { icon: '🔗', text: 'Encadeie saltos e confirme' },
                  { icon: '⌨️', text: 'Enter = confirmar | ⌫ = desfazer' },
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', paddingLeft: 0 }}>
                    <span style={{ fontSize: 13, width: 20, flexShrink: 0 }}>{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Victory modal */}
      <AnimatePresence>
        {phase === 'finished' && winner && (
          <VictoryModal
            winner={winner}
            players={players}
            onPlayAgain={handlePlayAgain}
            onHome={handleHome}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
