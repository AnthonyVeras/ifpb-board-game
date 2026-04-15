import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOnlineStore } from '../store/onlineStore'

const PLAYER_COLORS = ['#E53935', '#1E88E5', '#FDD835', '#43A047']

export function HomePage() {
  const navigate = useNavigate()
  const hasRestorableSession = useOnlineStore(s => s.hasRestorableSession)
  const refreshRestorableSession = useOnlineStore(s => s.refreshRestorableSession)

  useEffect(() => {
    refreshRestorableSession()

    const handleFocus = () => refreshRestorableSession()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refreshRestorableSession])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background gradient orbs */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(229,57,53,0.08), transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30,136,229,0.08), transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      {/* Hero section */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        style={{ textAlign: 'center', marginBottom: 56, position: 'relative', zIndex: 1 }}
      >
        {/* Animated pieces */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
          {PLAYER_COLORS.map((c, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -10, 0] }}
              transition={{
                repeat: Infinity,
                duration: 2,
                delay: i * 0.25,
                ease: 'easeInOut',
              }}
              style={{
                width: 16,
                height: 16,
                borderRadius: i % 2 === 0 ? '50%' : 3,
                backgroundColor: c,
                boxShadow: `0 0 12px ${c}66`,
                transform: i === 1 || i === 3 ? 'rotate(45deg)' : undefined,
              }}
            />
          ))}
        </div>

        <h1 style={{
          fontSize: 56,
          margin: 0,
          fontWeight: 900,
          letterSpacing: -2,
          lineHeight: 1,
        }}>
          <span style={{ color: 'var(--text-primary)' }}>IFPB</span>
          <span style={{
            background: 'linear-gradient(135deg, var(--red), #ff6b6b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}> Board</span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{
            color: 'var(--text-muted)',
            fontSize: 16,
            marginTop: 12,
            fontWeight: 500,
          }}
        >
          Jogo de Tabuleiro Estratégico
        </motion.p>
      </motion.div>

      {/* Menu buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 420,
          padding: '0 24px',
        }}
      >
        <button
          className="btn btn-primary"
          onClick={() => navigate('/setup')}
          style={{ width: '100%', padding: '18px 32px', fontSize: 17, fontWeight: 700 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4.5L20 10M20 10L14.5 15.5M20 10H4" />
          </svg>
          Jogar Local
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => navigate('/lobby')}
          style={{ width: '100%', padding: '18px 32px', fontSize: 16 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          Jogar Online
        </button>

        {hasRestorableSession && (
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/game')}
            style={{
              width: '100%',
              padding: '18px 32px',
              fontSize: 16,
              background: 'rgba(67,160,71,0.08)',
              borderColor: 'rgba(67,160,71,0.28)',
              color: 'var(--green)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Retomar Partida Online
          </button>
        )}

        <button
          className="btn btn-secondary"
          onClick={() => navigate('/rules')}
          style={{ width: '100%', padding: '18px 32px', fontSize: 16 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          Regras
        </button>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{
          position: 'absolute',
          bottom: 24,
          color: 'var(--text-muted)',
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: 0.5,
        }}
      >
        Projeto de Extensão • IFPB
      </motion.p>
    </div>
  )
}
