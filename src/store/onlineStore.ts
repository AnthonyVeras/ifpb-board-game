import { create } from 'zustand'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { PlayerColor, Position, MoveOption } from '../types'
import { getRoomChannel, generateRoomCode, getPlayerId } from '../lib/supabaseClient'
import { useGameStore } from './gameStore'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OnlinePlayer {
  id: string
  name: string
  color: PlayerColor | null
}

export type RoomStatus =
  | 'idle'
  | 'creating'
  | 'joining'
  | 'waiting'    // in lobby, waiting for players / host to start
  | 'playing'
  | 'disconnected'
  | 'error'

// Actions that get broadcast between players
export type GameAction =
  | { type: 'select_piece'; pos: Position }
  | { type: 'apply_move'; option: MoveOption }
  | { type: 'undo_last_step' }
  | { type: 'confirm_move' }
  | { type: 'place_returned_circle'; pos: Position }
  | { type: 'swap_pieces'; pos1: Position; pos2: Position; color: PlayerColor }
  | { type: 'mark_ready'; color: PlayerColor }
  | { type: 'select_arranging_piece'; pos: Position; color: PlayerColor }

interface OnlineStore {
  // Session state
  roomCode: string | null
  isHost: boolean
  myPlayerId: string
  myColor: PlayerColor | null
  myName: string
  players: OnlinePlayer[]
  status: RoomStatus
  errorMessage: string | null

  // Internal
  _channel: RealtimeChannel | null

  // Actions
  createRoom: (playerName: string) => Promise<void>
  joinRoom: (code: string, playerName: string) => Promise<void>
  startGame: () => void
  sendAction: (action: GameAction) => void
  leaveRoom: () => void
  reset: () => void
}

const COLOR_ORDER: PlayerColor[] = ['red', 'blue', 'yellow', 'green']

const DEFAULT_STATE = {
  roomCode: null,
  isHost: false,
  myPlayerId: '',
  myColor: null,
  myName: '',
  players: [] as OnlinePlayer[],
  status: 'idle' as RoomStatus,
  errorMessage: null as string | null,
  _channel: null as RealtimeChannel | null,
}

export const useOnlineStore = create<OnlineStore>((set, get) => ({
  ...DEFAULT_STATE,

  createRoom: async (playerName: string) => {
    const myId = getPlayerId()
    const code = generateRoomCode()

    set({ status: 'creating', myPlayerId: myId, myName: playerName, roomCode: code, isHost: true, errorMessage: null })

    try {
      const channel = getRoomChannel(code)
      setupChannelListeners(channel, set, get)

      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: myId,
            name: playerName,
            is_host: true,
          })
          set({
            _channel: channel,
            status: 'waiting',
            myColor: COLOR_ORDER[0],
            players: [{ id: myId, name: playerName, color: COLOR_ORDER[0] }],
          })
        }
      })
    } catch (err) {
      set({ status: 'error', errorMessage: 'Falha ao criar sala. Verifique suas credenciais Supabase.' })
      console.error('Create room error:', err)
    }
  },

  joinRoom: async (code: string, playerName: string) => {
    const myId = getPlayerId()

    set({ status: 'joining', myPlayerId: myId, myName: playerName, roomCode: code.toUpperCase(), isHost: false, errorMessage: null })

    try {
      const channel = getRoomChannel(code.toUpperCase())
      setupChannelListeners(channel, set, get)

      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: myId,
            name: playerName,
            is_host: false,
          })
          set({
            _channel: channel,
            status: 'waiting',
          })
        }
      })
    } catch (err) {
      set({ status: 'error', errorMessage: 'Falha ao entrar na sala. Verifique o código.' })
      console.error('Join room error:', err)
    }
  },

  startGame: () => {
    const { _channel, players, isHost } = get()
    if (!_channel || !isHost) return
    if (players.length < 2) return

    // Assign colors in order and broadcast game start
    const assignedPlayers = players.map((p, i) => ({
      ...p,
      color: COLOR_ORDER[i] as PlayerColor,
    }))

    _channel.send({
      type: 'broadcast',
      event: 'game_start',
      payload: { players: assignedPlayers },
    })

    // Also start locally
    startGameLocally(assignedPlayers, set, get)
  },

  sendAction: (action: GameAction) => {
    const { _channel, status } = get()
    if (!_channel || status !== 'playing') return

    // Execute locally first
    executeAction(action)

    // Broadcast to others
    _channel.send({
      type: 'broadcast',
      event: 'game_action',
      payload: action,
    })
  },

  leaveRoom: () => {
    const { _channel } = get()
    if (_channel) {
      _channel.untrack()
      _channel.unsubscribe()
    }
    set({ ...DEFAULT_STATE })
  },

  reset: () => {
    const { _channel } = get()
    if (_channel) {
      _channel.untrack()
      _channel.unsubscribe()
    }
    set({ ...DEFAULT_STATE })
  },
}))

// ─── Channel event listeners ────────────────────────────────────────────────

function setupChannelListeners(
  channel: RealtimeChannel,
  set: (partial: Partial<OnlineStore>) => void,
  get: () => OnlineStore,
) {
  // Presence sync — update player list
  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    const currentPlayers: OnlinePlayer[] = []

    for (const key of Object.keys(state)) {
      const entries = state[key] as unknown as Array<{ id: string; name: string; is_host: boolean }>
      for (const entry of entries) {
        const existingIdx = currentPlayers.findIndex(p => p.id === entry.id)
        if (existingIdx === -1) {
          const colorIdx = currentPlayers.length
          currentPlayers.push({
            id: entry.id,
            name: entry.name,
            color: colorIdx < COLOR_ORDER.length ? COLOR_ORDER[colorIdx] : null,
          })
        }
      }
    }

    const myId = get().myPlayerId
    const myPlayer = currentPlayers.find(p => p.id === myId)

    set({
      players: currentPlayers,
      myColor: myPlayer?.color ?? null,
    })
  })

  // Presence leave — player disconnected
  channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
    const { status } = get()
    if (status === 'playing') {
      const leftIds = (leftPresences as unknown as Array<{ id: string }>).map(p => p.id)
      console.warn('Players disconnected:', leftIds)
      // Don't fully stop — just update list, game can continue or show warning
    }
  })

  // Game start event
  channel.on('broadcast', { event: 'game_start' }, ({ payload }) => {
    const { players: assignedPlayers } = payload as { players: OnlinePlayer[] }
    startGameLocally(assignedPlayers, set, get)
  })

  // Game action event — apply remote player's action
  channel.on('broadcast', { event: 'game_action' }, ({ payload }) => {
    const action = payload as GameAction
    executeAction(action)
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startGameLocally(
  assignedPlayers: OnlinePlayer[],
  set: (partial: Partial<OnlineStore>) => void,
  get: () => OnlineStore,
) {
  const myId = get().myPlayerId
  const myPlayer = assignedPlayers.find(p => p.id === myId)

  set({
    players: assignedPlayers,
    myColor: myPlayer?.color ?? null,
    status: 'playing',
  })

  // Initialize the game store (enters 'arranging' phase locally)
  const gameStore = useGameStore.getState()
  const gamePlayers = assignedPlayers
    .filter(p => p.color !== null)
    .map(p => ({
      color: p.color!,
      name: p.name,
      timerMs: null,
      timeLeft: null,
      isActive: true,
    }))

  gameStore.initGame(gamePlayers)

  // Skip arranging phase for online games — go straight to playing
  for (const p of gamePlayers) {
    useGameStore.getState().markReady(p.color)
  }
}

function executeAction(action: GameAction) {
  const store = useGameStore.getState()

  switch (action.type) {
    case 'select_piece':
      store.selectPiece(action.pos)
      break
    case 'apply_move':
      store.applyMoveOption(action.option)
      break
    case 'undo_last_step':
      store.undoLastStep()
      break
    case 'confirm_move':
      store.confirmMove()
      break
    case 'place_returned_circle':
      store.placeReturnedCircle(action.pos)
      break
    case 'swap_pieces':
      store.swapPieces(action.pos1, action.pos2, action.color)
      break
    case 'mark_ready':
      store.markReady(action.color)
      break
    case 'select_arranging_piece':
      store.selectArrangingPiece(action.pos, action.color)
      break
  }
}
