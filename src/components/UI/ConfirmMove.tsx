import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { useOnlineStore } from '../../store/onlineStore'

export function ConfirmMove() {
  const { currentPath, phase, confirmMove, undoLastStep } = useGameStore()
  const onlineStatus = useOnlineStore(s => s.status)
  const sendAction = useOnlineStore(s => s.sendAction)

  const isOnline = onlineStatus === 'playing'
  const isVisible = phase === 'playing' && currentPath.length >= 2

  const handleConfirm = () => {
    if (isOnline) {
      sendAction({ type: 'confirm_move' })
    } else {
      confirmMove()
    }
  }

  const handleUndo = () => {
    if (isOnline) {
      sendAction({ type: 'undo_last_step' })
    } else {
      undoLastStep()
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 16,
            justifyContent: 'center',
          }}
        >
          <button
            className="btn btn-ghost"
            onClick={handleUndo}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Desfazer
            <kbd style={{
              fontSize: 10,
              padding: '2px 5px',
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#888',
              marginLeft: 4,
            }}>⌫</kbd>
          </button>

          <button
            className="btn btn-success"
            onClick={handleConfirm}
            style={{
              padding: '10px 28px',
              fontSize: 14,
              gap: 6,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Confirmar Jogada
            <kbd style={{
              fontSize: 10,
              padding: '2px 5px',
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.7)',
              marginLeft: 4,
            }}>↵</kbd>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
