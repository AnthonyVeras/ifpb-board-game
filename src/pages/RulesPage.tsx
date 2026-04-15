import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { PieceType, PlayerColor } from '../types'
import { PieceComponent } from '../components/Pieces/PieceComponent'

type Tab = 'pieces' | 'jumps' | 'strategy'

const PIECE_INFO: {
  type: PieceType
  color: PlayerColor
  name: string
  desc: string
  dirs: string
  icon: string
}[] = [
  {
    type: 'circle', color: 'red', name: 'Círculo', icon: '⚪',
    desc: 'A única peça que se move para todos os 8 ângulos. Se capturada, volta à base.',
    dirs: '↑ ↓ ← → ↖ ↗ ↙ ↘',
  },
  {
    type: 'square', color: 'blue', name: 'Quadrado', icon: '⬜',
    desc: 'Move apenas para as 4 direções ortogonais (sem diagonal).',
    dirs: '↑ ↓ ← →',
  },
  {
    type: 'triangle', color: 'red', name: 'Triângulo', icon: '🔺',
    desc: 'Move para trás em linha reta e avança nas 2 diagonais dianteiras.',
    dirs: '↑ ↙ ↘ (relativo à base)',
  },
  {
    type: 'diamond', color: 'yellow', name: 'Losango', icon: '🔷',
    desc: 'Move apenas nas 4 diagonais. Não vai em linha reta.',
    dirs: '↖ ↗ ↙ ↘',
  },
]

const JUMP_EXAMPLES = [
  { label: 'O X O', can: true,  desc: '1 peça no meio, distância simétrica 1-1' },
  { label: 'O X X O', can: false, desc: 'Comprimento par (2 células no meio)' },
  { label: 'O X X O X X O', can: true, desc: 'Palíndromo ímpar (5 células: XXOXX)' },
  { label: 'O X X O O X X O', can: false, desc: 'Comprimento par (6 células)' },
  { label: 'O X X O X O', can: false, desc: 'XXOX (4 células, par)' },
]

export function RulesPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('pieces')

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'pieces', label: 'Peças', icon: '♟' },
    { key: 'jumps', label: 'Saltos', icon: '⚡' },
    { key: 'strategy', label: 'Estratégia', icon: '🧠' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      padding: '32px 24px',
      maxWidth: 800,
      margin: '0 auto',
    }}>
      <button
        className="btn btn-ghost"
        onClick={() => navigate('/')}
        style={{ marginBottom: 24, padding: '8px 14px', fontSize: 13 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Voltar
      </button>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: 32, margin: '0 0 8px', fontWeight: 800, letterSpacing: -0.5 }}>
          Regras do Jogo
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 15 }}>
          Leve <strong style={{ color: 'var(--text-primary)' }}>todas as suas peças</strong> para a base do adversário oposto.
        </p>
      </motion.div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 28,
        backgroundColor: 'var(--bg-card)',
        borderRadius: 10,
        padding: 4,
        border: '1px solid var(--border-subtle)',
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: tab === t.key ? 'var(--red)' : 'transparent',
              color: tab === t.key ? 'white' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: tab === t.key ? 700 : 500,
              transition: 'all 0.2s',
              fontFamily: 'var(--font)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'pieces' && (
          <motion.div key="pieces" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PIECE_INFO.map(p => (
                <div key={p.type} className="card" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  padding: '18px 22px',
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ flexShrink: 0 }}>
                    <PieceComponent piece={{ id: p.type, type: p.type, color: p.color, position: { row: 0, col: 0 } }} size={56} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>{p.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '0 0 8px', fontSize: 13, lineHeight: 1.5 }}>{p.desc}</p>
                    <div style={{
                      display: 'inline-flex',
                      padding: '4px 10px',
                      borderRadius: 6,
                      backgroundColor: 'rgba(100,181,246,0.1)',
                      border: '1px solid rgba(100,181,246,0.2)',
                    }}>
                      <code style={{ color: '#64B5F6', fontSize: 15, letterSpacing: 3, fontWeight: 500 }}>{p.dirs}</code>
                    </div>
                  </div>
                </div>
              ))}

              <div className="card" style={{
                backgroundColor: 'rgba(67,160,71,0.06)',
                borderColor: 'rgba(67,160,71,0.2)',
                padding: '16px 20px',
              }}>
                <h4 style={{ color: '#81C784', margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>⚠ Regra especial do Círculo</h4>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                  Se um círculo inimigo estiver no caminho de um salto, ele <strong style={{ color: 'var(--text-primary)' }}>retorna à base do dono</strong>,
                  e o dono escolhe em qual casa ele reaparece. O seu próprio círculo <em>não</em> retorna.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'jumps' && (
          <motion.div key="jumps" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="card" style={{ marginBottom: 16, padding: '18px 22px' }}>
              <h3 style={{ color: '#64B5F6', margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>Regra do Salto Simétrico</h3>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 13, lineHeight: 1.7 }}>
                Uma peça pode saltar quando as células <strong style={{ color: 'var(--text-primary)' }}>entre</strong> ela e o destino formam uma
                sequência de <strong style={{ color: 'var(--text-primary)' }}>comprimento ímpar</strong> que seja um <strong style={{ color: 'var(--text-primary)' }}>palíndromo</strong> (X = peça, O = vazio).
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {JUMP_EXAMPLES.map((ex, i) => (
                <div key={i} className="card" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  borderColor: ex.can ? 'rgba(67,160,71,0.25)' : 'rgba(229,57,53,0.2)',
                }}>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: 16,
                    letterSpacing: 3,
                    color: ex.can ? '#81C784' : '#EF9A9A',
                    minWidth: 180,
                    fontWeight: 700,
                  }}>
                    {ex.label}
                  </div>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: ex.can ? 'rgba(67,160,71,0.15)' : 'rgba(229,57,53,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    flexShrink: 0,
                  }}>
                    {ex.can ? '✓' : '✗'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.4 }}>
                    {ex.desc}
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{
              marginTop: 16,
              backgroundColor: 'rgba(30,136,229,0.06)',
              borderColor: 'rgba(30,136,229,0.2)',
              padding: '16px 20px',
            }}>
              <h4 style={{ color: '#90CAF9', margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>💡 Cadeia de Saltos</h4>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 13, lineHeight: 1.7 }}>
                Após cada salto, continue saltando na mesma jogada. Clique nos pontos pulsantes para encadear,
                depois <strong style={{ color: 'var(--text-primary)' }}>Enter</strong> ou "Confirmar" para finalizar.
                Use <strong style={{ color: 'var(--text-primary)' }}>Backspace</strong> para desfazer o último passo.
              </p>
            </div>
          </motion.div>
        )}

        {tab === 'strategy' && (
          <motion.div key="strategy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { emoji: '🔵', title: 'Use o Círculo como corredor', text: 'O Círculo é a peça mais versátil. Use-o para abrir caminhos e criar condições de salto.' },
                { emoji: '💎', title: 'Losangos cruzam diagonais', text: 'Em cadeia de saltos diagonais, o Losango pode cruzar o tabuleiro inteiro em uma jogada.' },
                { emoji: '🔶', title: 'Triângulo avança pelas diagonais', text: 'O Triângulo avança em diagonais e recua em linha reta. Use-o para criar formações complexas.' },
                { emoji: '⬛', title: 'Crie "pontes" de salto', text: 'Posicione peças em intervalos simétricos para criar corredores de salto que atravessem o tabuleiro.' },
                { emoji: '🎯', title: 'Todas as 8 peças', text: 'Precisa levar TODAS as 8 peças para o lado oposto. Foque na estratégia coletiva.' },
                { emoji: '⚡', title: 'Capture círculos', text: 'Forçar o círculo inimigo a voltar para a base pode destruir a formação do adversário.' },
              ].map((tip, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card"
                  style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 18px' }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{tip.emoji}</span>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>{tip.title}</h4>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 13, lineHeight: 1.6 }}>{tip.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
