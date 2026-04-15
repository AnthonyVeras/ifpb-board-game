import { beforeEach, describe, expect, it } from 'vitest'
import type { GameSnapshot, Player } from '../types'
import { useGameStore } from './gameStore'

const players: Player[] = [
  { color: 'red', name: 'Jogador 1', timerMs: null, timeLeft: null, isActive: true },
  { color: 'blue', name: 'Jogador 2', timerMs: null, timeLeft: null, isActive: true },
]

function cloneSnapshot(snapshot: GameSnapshot): GameSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as GameSnapshot
}

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame()
  })

  it('exports and restores a serialized snapshot', () => {
    const store = useGameStore.getState()
    store.initGame(players, 'red')
    store.markReady('red')

    const snapshot = cloneSnapshot(useGameStore.getState().getSnapshot())

    useGameStore.getState().resetGame()
    useGameStore.getState().loadSnapshot(snapshot)

    expect(useGameStore.getState().getSnapshot()).toEqual(snapshot)
  })

  it('advances the turn from the moving player after circle return', () => {
    const store = useGameStore.getState()
    store.initGame(players, 'red')

    const snapshot = cloneSnapshot(useGameStore.getState().getSnapshot())
    snapshot.phase = 'circle-return'
    snapshot.currentTurn = 'blue'
    snapshot.lastMove = {
      from: { row: 4, col: 4 },
      path: [{ row: 4, col: 4 }, { row: 5, col: 4 }],
      color: 'red',
    }
    snapshot.capturedCircleEvent = {
      piece: {
        id: 'blue-circle-return',
        type: 'circle',
        color: 'blue',
        position: { row: 4, col: 4 },
      },
      capturedBy: 'red',
    }
    snapshot.pendingCapturedCircles = []
    snapshot.board[9][1].piece = null

    useGameStore.getState().loadSnapshot(snapshot)
    useGameStore.getState().placeReturnedCircle({ row: 9, col: 1 })

    expect(useGameStore.getState().currentTurn).toBe('blue')
    expect(useGameStore.getState().phase).toBe('playing')
    expect(useGameStore.getState().board[9][1].piece?.color).toBe('blue')
  })
})
