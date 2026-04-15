import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnlineStore } from '../../store/onlineStore'
import type { ChatMessage } from '../../store/onlineStore'

const COLOR_HEX: Record<string, string> = {
  red: '#E53935',
  blue: '#1E88E5',
  yellow: '#FDD835',
  green: '#43A047',
}

export function ChatPanel() {
  const { chatMessages, sendChatMessage, status } = useOnlineStore()
  const [text, setText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages.length])

  const handleSend = () => {
    if (!text.trim()) return
    sendChatMessage(text)
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEnabled = status === 'waiting' || status === 'playing'

  return (
    <div className="chat-panel card" style={{
      display: 'flex',
      flexDirection: 'column',
      padding: 0,
      overflow: 'hidden',
      maxHeight: 360,
      minHeight: 200,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 14 }}>💬</span>
        <h4 style={{
          margin: 0,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          fontWeight: 600,
          color: 'var(--text-muted)',
        }}>
          Chat
        </h4>
        <span style={{
          marginLeft: 'auto',
          fontSize: 10,
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-elevated)',
          padding: '2px 8px',
          borderRadius: 10,
        }}>
          {chatMessages.filter(m => !m.isSystem).length}
        </span>
      </div>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="chat-messages"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {chatMessages.length === 0 && (
          <div style={{
            color: 'var(--text-muted)',
            fontSize: 12,
            textAlign: 'center',
            padding: '24px 0',
            fontStyle: 'italic',
          }}>
            Nenhuma mensagem ainda...
          </div>
        )}

        <AnimatePresence initial={false}>
          {chatMessages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '8px 10px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        gap: 8,
        flexShrink: 0,
      }}>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value.slice(0, 200))}
          onKeyDown={handleKeyDown}
          disabled={!isEnabled}
          placeholder={isEnabled ? 'Digite uma mensagem...' : 'Chat indisponível'}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--border-medium)',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontSize: 13,
            outline: 'none',
            fontFamily: 'var(--font)',
            transition: 'border-color 0.2s',
            opacity: isEnabled ? 1 : 0.5,
          }}
          onFocus={e => e.target.style.borderColor = 'var(--blue)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-medium)'}
        />
        <button
          onClick={handleSend}
          disabled={!isEnabled || !text.trim()}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: text.trim() ? 'var(--blue)' : 'var(--bg-elevated)',
            color: text.trim() ? 'white' : 'var(--text-muted)',
            cursor: text.trim() && isEnabled ? 'pointer' : 'default',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font)',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          ↵
        </button>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--text-muted)',
          padding: '4px 0',
          fontStyle: 'italic',
        }}
      >
        {message.text}
      </motion.div>
    )
  }

  const nameColor = message.playerColor ? COLOR_HEX[message.playerColor] : 'var(--text-secondary)'

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        padding: '4px 8px',
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.02)',
        fontSize: 13,
        lineHeight: 1.4,
        wordBreak: 'break-word',
      }}
    >
      <span style={{
        fontWeight: 700,
        color: nameColor,
        fontSize: 12,
        marginRight: 6,
      }}>
        {message.playerName}:
      </span>
      <span style={{ color: 'var(--text-secondary)' }}>
        {message.text}
      </span>
    </motion.div>
  )
}
