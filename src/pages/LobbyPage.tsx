import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnlineStore } from '../store/onlineStore'
import { isSupabaseConfigured } from '../lib/supabaseClient'

const COLOR_HEX: Record<string, string> = {
  red: '#E53935',
  blue: '#1E88E5',
  yellow: '#FDD835',
  green: '#43A047',
}

const COLOR_LABELS: Record<string, string> = {
  red: 'Vermelho',
  blue: 'Azul',
  yellow: 'Amarelo',
  green: 'Verde',
}

export function LobbyPage() {
  const navigate = useNavigate()
  const { roomCode: urlCode } = useParams<{ roomCode: string }>()

  const [playerName, setPlayerName] = useState('')
  const [joinCode, setJoinCode] = useState(urlCode?.toUpperCase() ?? '')
  const [mode, setMode] = useState<'none' | 'create' | 'join'>(urlCode ? 'join' : 'none')
  const [copied, setCopied] = useState(false)

  const {
    roomCode,
    isHost,
    players,
    status,
    myColor,
    errorMessage,
    createRoom,
    joinRoom,
    startGame,
    leaveRoom,
  } = useOnlineStore()

  const configured = isSupabaseConfigured()

  // Auto-join if URL has room code and we get a name
  useEffect(() => {
    if (urlCode && playerName && status === 'idle') {
      setMode('join')
      setJoinCode(urlCode.toUpperCase())
    }
  }, [urlCode, playerName, status])

  // Navigate to game when game starts
  useEffect(() => {
    if (status === 'playing') {
      navigate('/game')
    }
  }, [status, navigate])

  // Cleanup on unmount if still waiting
  useEffect(() => {
    return () => {
      const currentStatus = useOnlineStore.getState().status
      if (currentStatus === 'waiting' || currentStatus === 'creating' || currentStatus === 'joining') {
        // Don't leave if game is playing
      }
    }
  }, [])

  const handleCreate = async () => {
    if (!playerName.trim()) return
    await createRoom(playerName.trim())
  }

  const handleJoin = async () => {
    if (!playerName.trim() || joinCode.length < 6) return
    await joinRoom(joinCode, playerName.trim())
  }

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleBack = () => {
    if (status === 'waiting') {
      leaveRoom()
    }
    if (mode !== 'none') {
      setMode('none')
    } else {
      navigate('/')
    }
  }

  const isInLobby = status === 'waiting'
  const canStart = isHost && (players.length === 2 || players.length === 4)

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <button
        className="btn btn-ghost"
        onClick={handleBack}
        style={{ position: 'absolute', top: 24, left: 24, padding: '8px 14px', fontSize: 13 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Voltar
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{
          padding: '40px 44px',
          width: '100%',
          maxWidth: 480,
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* ─── Not configured warning ──────────────────────────────── */}
        {!configured && (
          <div style={{
            backgroundColor: 'rgba(253,216,53,0.08)',
            border: '1px solid rgba(253,216,53,0.25)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 24,
            textAlign: 'left',
          }}>
            <p style={{ color: 'var(--yellow)', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
              ⚠ Supabase não configurado
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }}>
              Configure <code style={{ color: 'var(--text-secondary)' }}>VITE_SUPABASE_URL</code> e{' '}
              <code style={{ color: 'var(--text-secondary)' }}>VITE_SUPABASE_ANON_KEY</code> nas variáveis de ambiente para habilitar o multiplayer online.
            </p>
          </div>
        )}

        {/* ─── Header ─────────────────────────────────────────────── */}
        {!isInLobby && (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
              🌐 Jogar Online
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 13 }}>
              Jogue com amigos em tempo real
            </p>

            {/* Name input */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                color: 'var(--text-muted)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                display: 'block',
                marginBottom: 8,
                fontWeight: 600,
                textAlign: 'left',
              }}>
                Seu Nome
              </label>
              <input
                value={playerName}
                onChange={e => setPlayerName(e.target.value.slice(0, 20))}
                placeholder="Digite seu nome..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: 15,
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'var(--font)',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-medium)'}
              />
            </div>

            {/* Mode buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => setMode('create')}
                disabled={!configured || !playerName.trim()}
                className={mode === 'create' ? 'btn' : 'btn btn-secondary'}
                style={{
                  padding: '14px 0',
                  fontSize: 15,
                  width: '100%',
                  opacity: (!configured || !playerName.trim()) ? 0.4 : 1,
                  cursor: (!configured || !playerName.trim()) ? 'not-allowed' : 'pointer',
                  ...(mode === 'create' ? {
                    background: 'rgba(30,136,229,0.12)',
                    border: '1.5px solid rgba(30,136,229,0.5)',
                    color: 'var(--blue)',
                  } : {}),
                }}
              >
                🏠 Criar Sala
              </button>

              <button
                onClick={() => setMode('join')}
                disabled={!configured || !playerName.trim()}
                className={mode === 'join' ? 'btn' : 'btn btn-secondary'}
                style={{
                  padding: '14px 0',
                  fontSize: 15,
                  width: '100%',
                  opacity: (!configured || !playerName.trim()) ? 0.4 : 1,
                  cursor: (!configured || !playerName.trim()) ? 'not-allowed' : 'pointer',
                  ...(mode === 'join' ? {
                    background: 'rgba(67,160,71,0.12)',
                    border: '1.5px solid rgba(67,160,71,0.5)',
                    color: 'var(--green)',
                  } : {}),
                }}
              >
                🔑 Entrar com Código
              </button>
            </div>
          </>
        )}

        {/* ─── Create Room Panel ──────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {mode === 'create' && !isInLobby && (
            <motion.div
              key="create"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: 24, overflow: 'hidden' }}
            >
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={status === 'creating' || !playerName.trim()}
                style={{
                  width: '100%',
                  padding: '14px 0',
                  fontSize: 16,
                  fontWeight: 700,
                  opacity: status === 'creating' ? 0.6 : 1,
                }}
              >
                {status === 'creating' ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      style={{ display: 'inline-block' }}
                    >
                      ⏳
                    </motion.span>
                    Criando...
                  </>
                ) : (
                  '🚀 Criar Sala Agora'
                )}
              </button>
            </motion.div>
          )}

          {/* ─── Join Room Panel ───────────────────────────────────── */}
          {mode === 'join' && !isInLobby && (
            <motion.div
              key="join"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: 24, overflow: 'hidden' }}
            >
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="CÓDIGO"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: 24,
                  fontWeight: 700,
                  textAlign: 'center',
                  letterSpacing: 6,
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: 12,
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--green)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-medium)'}
              />
              <button
                disabled={joinCode.length < 6 || status === 'joining' || !playerName.trim()}
                className="btn btn-success"
                onClick={handleJoin}
                style={{
                  width: '100%',
                  padding: '13px 0',
                  fontSize: 15,
                  opacity: (joinCode.length >= 6 && playerName.trim()) ? 1 : 0.4,
                  cursor: (joinCode.length >= 6 && playerName.trim()) ? 'pointer' : 'not-allowed',
                }}
              >
                {status === 'joining' ? 'Entrando...' : 'Entrar na Sala'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Error message ──────────────────────────────────────── */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 16,
              padding: '12px 16px',
              borderRadius: 10,
              backgroundColor: 'rgba(229,57,53,0.1)',
              border: '1px solid rgba(229,57,53,0.3)',
              color: 'var(--red)',
              fontSize: 13,
              textAlign: 'left',
            }}
          >
            ❌ {errorMessage}
          </motion.div>
        )}

        {/* ─── Lobby (waiting room) ────────────────────────────────── */}
        {isInLobby && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
              🎮 Sala de Espera
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 13 }}>
              {isHost ? 'Aguardando jogadores...' : 'Aguardando o host iniciar...'}
            </p>

            {/* Room code display */}
            <div
              onClick={handleCopyCode}
              style={{
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: 8,
                color: 'var(--blue)',
                backgroundColor: 'rgba(30,136,229,0.08)',
                border: '1px solid rgba(30,136,229,0.2)',
                padding: '16px 24px',
                borderRadius: 12,
                marginBottom: 8,
                fontFamily: 'monospace',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {roomCode}
              <motion.span
                key={copied ? 'copied' : 'copy'}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 500,
                  color: copied ? 'var(--green)' : 'var(--text-muted)',
                  letterSpacing: 1,
                  marginTop: 4,
                  fontFamily: 'var(--font)',
                }}
              >
                {copied ? '✓ Copiado!' : 'Clique para copiar'}
              </motion.span>
            </div>

            {/* Share link hint */}
            <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 24 }}>
              Compartilhe o código ou envie o link: <span style={{
                color: 'var(--text-secondary)',
                fontFamily: 'monospace',
                fontSize: 10,
              }}>
                {window.location.origin}/lobby/{roomCode}
              </span>
            </p>

            {/* Player list */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                color: 'var(--text-muted)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                display: 'block',
                marginBottom: 12,
                fontWeight: 600,
                textAlign: 'left',
              }}>
                Jogadores ({players.length}/4)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {players.map((player, idx) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 10,
                      backgroundColor: 'var(--bg-elevated)',
                      border: `1px solid ${player.color ? COLOR_HEX[player.color] + '33' : 'var(--border-subtle)'}`,
                    }}
                  >
                    {/* Color dot */}
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: player.color ? COLOR_HEX[player.color] : '#555',
                      boxShadow: player.color ? `0 0 10px ${COLOR_HEX[player.color]}44` : 'none',
                      flexShrink: 0,
                    }} />

                    {/* Name */}
                    <span style={{
                      flex: 1,
                      fontWeight: 600,
                      fontSize: 14,
                      color: 'var(--text-primary)',
                    }}>
                      {player.name}
                    </span>

                    {/* Color label */}
                    {player.color && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: COLOR_HEX[player.color],
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}>
                        {COLOR_LABELS[player.color]}
                      </span>
                    )}

                    {/* Host badge */}
                    {idx === 0 && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--yellow)',
                        backgroundColor: 'rgba(253,216,53,0.12)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}>
                        Host
                      </span>
                    )}
                  </motion.div>
                ))}

                {/* Empty slots */}
                {Array.from({ length: 4 - players.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: '1px dashed var(--border-subtle)',
                      color: 'var(--text-muted)',
                      fontSize: 13,
                    }}
                  >
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: '2px dashed var(--border-medium)',
                      flexShrink: 0,
                    }} />
                    <span style={{ fontStyle: 'italic' }}>Aguardando jogador...</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-ghost"
                onClick={() => { leaveRoom(); setMode('none') }}
                style={{ flex: 1, padding: '12px 0', fontSize: 14 }}
              >
                Sair
              </button>

              {isHost && (
                <button
                  className="btn btn-primary"
                  onClick={startGame}
                  disabled={!canStart}
                  style={{
                    flex: 2,
                    padding: '12px 0',
                    fontSize: 16,
                    fontWeight: 700,
                    opacity: canStart ? 1 : 0.4,
                    cursor: canStart ? 'pointer' : 'not-allowed',
                  }}
                >
                  {players.length < 2
                    ? 'Aguardando jogadores...'
                    : players.length === 3
                      ? 'Precisa de 2 ou 4 jogadores'
                      : `Iniciar Jogo (${players.length} jogadores) →`
                  }
                </button>
              )}

              {!isHost && (
                <div style={{
                  flex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px 0',
                  borderRadius: 10,
                  backgroundColor: 'rgba(30,136,229,0.08)',
                  border: '1px solid rgba(30,136,229,0.2)',
                  color: 'var(--blue)',
                  fontSize: 13,
                  fontWeight: 600,
                  gap: 8,
                }}>
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  >
                    ●
                  </motion.span>
                  Aguardando o host iniciar...
                </div>
              )}
            </div>

            {/* My color indicator */}
            {myColor && (
              <div style={{
                marginTop: 16,
                padding: '8px 14px',
                borderRadius: 8,
                backgroundColor: `${COLOR_HEX[myColor]}11`,
                border: `1px solid ${COLOR_HEX[myColor]}33`,
                fontSize: 12,
                color: COLOR_HEX[myColor],
                fontWeight: 600,
              }}>
                Você é o jogador {COLOR_LABELS[myColor]}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
