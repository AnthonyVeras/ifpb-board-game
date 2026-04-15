import { create } from 'zustand'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type {
  GameSnapshot,
  MoveOption,
  OnlinePlayerState,
  Player,
  PlayerColor,
  Position,
} from '../types'
import {
  fetchOnlineRoomSnapshot,
  createRoomRecord,
  disconnectOnlinePlayer,
  joinRoomRecord,
  leaveOnlineRoom,
  markPlayerConnected,
  MAX_CHAT_MESSAGES,
  persistOnlineSnapshot,
  resumePausedMatchIfReady,
  startOnlineMatch,
} from '../lib/onlineApi'
import { clearOnlineRoomSession, loadOnlineRoomSession, saveOnlineRoomSession } from '../lib/onlineSession'
import { sanitizePlayerName } from '../lib/playerNames'
import { getPlayerId, getRoomChannel } from '../lib/supabaseClient'
import { useGameStore } from './gameStore'

export interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  playerColor: PlayerColor | null
  text: string
  isSystem: boolean
  timestamp: number
}

export type OnlinePlayer = OnlinePlayerState

export type RoomStatus =
  | 'idle'
  | 'creating'
  | 'joining'
  | 'syncing'
  | 'waiting'
  | 'playing'
  | 'paused'
  | 'finished'
  | 'disconnected'
  | 'error'

export type GameAction =
  | { type: 'select_piece'; pos: Position }
  | { type: 'apply_move'; option: MoveOption }
  | { type: 'undo_last_step' }
  | { type: 'confirm_move' }
  | { type: 'place_returned_circle'; pos: Position }
  | { type: 'swap_pieces'; pos1: Position; pos2: Position; color: PlayerColor }
  | { type: 'mark_ready'; color: PlayerColor }
  | { type: 'select_arranging_piece'; pos: Position; color: PlayerColor }

interface StateChangePayload {
  roomId: string
  roomCode: string
  matchId: string | null
  playerId: string
  actionId: string
  actionSeq: number
}

interface OnlineStore {
  roomId: string | null
  roomCode: string | null
  matchId: string | null
  isHost: boolean
  myPlayerId: string
  myColor: PlayerColor | null
  myName: string
  players: OnlinePlayer[]
  status: RoomStatus
  errorMessage: string | null
  reconnectDeadline: number | null
  matchActionSeq: number
  lastActionId: string | null
  hasRestorableSession: boolean
  chatMessages: ChatMessage[]
  _channel: RealtimeChannel | null

  createRoom: (playerName: string) => Promise<void>
  joinRoom: (code: string, playerName: string) => Promise<void>
  restoreSession: (preferredCode?: string) => Promise<boolean>
  startGame: () => Promise<void>
  sendAction: (action: GameAction) => Promise<void>
  sendChatMessage: (text: string) => Promise<void>
  leaveRoom: () => Promise<void>
  markDisconnected: () => Promise<void>
  syncFromServer: (roomCode?: string) => Promise<void>
  refreshRestorableSession: () => void
  reset: () => void
}

const DEFAULT_STATE: Omit<
  OnlineStore,
  | 'createRoom'
  | 'joinRoom'
  | 'restoreSession'
  | 'startGame'
  | 'sendAction'
  | 'sendChatMessage'
  | 'leaveRoom'
  | 'markDisconnected'
  | 'syncFromServer'
  | 'refreshRestorableSession'
  | 'reset'
> = {
  roomId: null,
  roomCode: null,
  matchId: null,
  isHost: false,
  myPlayerId: '',
  myColor: null,
  myName: '',
  players: [],
  status: 'idle',
  errorMessage: null,
  reconnectDeadline: null,
  matchActionSeq: 0,
  lastActionId: null,
  hasRestorableSession: typeof window !== 'undefined' ? !!loadOnlineRoomSession() : false,
  chatMessages: [],
  _channel: null,
}

function gamePlayersFromOnlinePlayers(players: OnlinePlayer[]): Player[] {
  return [...players]
    .sort((a, b) => a.slotIndex - b.slotIndex)
    .filter(player => player.color !== null)
    .map(player => ({
      color: player.color!,
      name: player.name,
      timerMs: null,
      timeLeft: null,
      isActive: true,
    }))
}

function appendChatMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  return [...messages, message].slice(-MAX_CHAT_MESSAGES)
}

function deriveStatus(
  roomStatus: 'waiting' | 'playing' | 'paused' | 'finished',
  snapshot: GameSnapshot | null,
): RoomStatus {
  if (roomStatus === 'waiting') return 'waiting'
  if (roomStatus === 'paused') return 'paused'
  if (roomStatus === 'finished' && snapshot?.phase !== 'finished') return 'error'
  return roomStatus === 'finished' ? 'finished' : 'playing'
}

function persistSession(
  roomId: string,
  roomCode: string,
  matchId: string | null,
  playerId: string,
  playerName: string,
  status: 'waiting' | 'playing' | 'paused' | 'finished',
) {
  saveOnlineRoomSession({
    roomId,
    roomCode,
    playerId,
    playerName,
    matchId,
    status,
    updatedAt: Date.now(),
  })
}

function updateHasRestorableSession(
  set: (partial: Partial<OnlineStore> | ((state: OnlineStore) => Partial<OnlineStore>)) => void,
) {
  set({ hasRestorableSession: !!loadOnlineRoomSession() })
}

function setGameSnapshot(snapshot: GameSnapshot | null) {
  const gameStore = useGameStore.getState()

  if (snapshot) {
    gameStore.loadSnapshot(snapshot)
  } else {
    gameStore.resetGame()
  }
}

function getSerializedSnapshot(snapshot: GameSnapshot): string {
  return JSON.stringify(snapshot)
}

function getCurrentActionPlayerColor(snapshot: GameSnapshot): PlayerColor | null {
  if (snapshot.phase === 'circle-return') {
    return snapshot.capturedCircleEvent?.piece.color ?? null
  }
  if (snapshot.phase === 'arranging') {
    return snapshot.arrangingCurrentPlayer
  }
  return snapshot.currentTurn
}

function isActionAllowed(action: GameAction, snapshot: GameSnapshot, myColor: PlayerColor | null): boolean {
  if (!myColor) return false

  switch (action.type) {
    case 'mark_ready':
      return snapshot.phase === 'arranging' && action.color === myColor && !snapshot.readyPlayers.includes(myColor)
    case 'select_arranging_piece':
      return snapshot.phase === 'arranging' && action.color === myColor && !snapshot.readyPlayers.includes(myColor)
    case 'place_returned_circle':
      return snapshot.phase === 'circle-return' && snapshot.capturedCircleEvent?.piece.color === myColor
    case 'select_piece':
    case 'apply_move':
    case 'undo_last_step':
    case 'confirm_move':
      return snapshot.phase === 'playing' && snapshot.currentTurn === myColor
    case 'swap_pieces':
      return snapshot.phase === 'arranging' && action.color === myColor && !snapshot.readyPlayers.includes(myColor)
    default:
      return false
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

async function broadcastStateChange(channel: RealtimeChannel | null, payload: StateChangePayload): Promise<void> {
  if (!channel) return

  await channel.send({
    type: 'broadcast',
    event: 'state_changed',
    payload,
  })
}

async function syncSnapshotIntoStore(
  roomCode: string,
  currentPlayerId: string,
  currentPlayerName: string,
  set: (partial: Partial<OnlineStore> | ((state: OnlineStore) => Partial<OnlineStore>)) => void,
  get: () => OnlineStore,
): Promise<boolean> {
  const snapshot = await fetchOnlineRoomSnapshot(roomCode)

  if (!snapshot) {
    set({ status: 'error', errorMessage: 'A sala não foi encontrada ou já foi encerrada.' })
    return false
  }

  const myPlayer = snapshot.players.find(player => player.id === currentPlayerId)
  if (!myPlayer) {
    clearOnlineRoomSession()
    updateHasRestorableSession(set)
    set({
      ...DEFAULT_STATE,
      myPlayerId: currentPlayerId,
      status: 'error',
      errorMessage: 'Você não faz mais parte dessa sala.',
      hasRestorableSession: false,
    })
    setGameSnapshot(null)
    return false
  }

  const nextStatus = deriveStatus(snapshot.status, snapshot.gameSnapshot)

  set({
    roomId: snapshot.roomId,
    roomCode: snapshot.roomCode,
    matchId: snapshot.matchId,
    isHost: snapshot.hostPlayerId === currentPlayerId,
    myPlayerId: currentPlayerId,
    myColor: myPlayer.color,
    myName: currentPlayerName || myPlayer.name,
    players: snapshot.players,
    status: nextStatus,
    errorMessage: null,
    reconnectDeadline: snapshot.reconnectDeadline ? new Date(snapshot.reconnectDeadline).getTime() : null,
    matchActionSeq: snapshot.matchActionSeq,
    lastActionId: snapshot.lastActionId,
  })

  setGameSnapshot(snapshot.gameSnapshot)
  persistSession(snapshot.roomId, snapshot.roomCode, snapshot.matchId, currentPlayerId, currentPlayerName || myPlayer.name, snapshot.status)
  updateHasRestorableSession(set)

  const currentRoom = get().roomCode
  if (!currentRoom || currentRoom !== snapshot.roomCode) {
    set({ roomCode: snapshot.roomCode })
  }

  return true
}

function addSystemMessage(
  set: (partial: Partial<OnlineStore> | ((state: OnlineStore) => Partial<OnlineStore>)) => void,
  text: string,
) {
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    playerId: 'system',
    playerName: 'Sistema',
    playerColor: null,
    text,
    isSystem: true,
    timestamp: Date.now(),
  }

  set(state => ({ chatMessages: appendChatMessage(state.chatMessages, message) }))
}

async function subscribeToRoomChannel(
  roomCode: string,
  playerId: string,
  set: (partial: Partial<OnlineStore> | ((state: OnlineStore) => Partial<OnlineStore>)) => void,
  get: () => OnlineStore,
): Promise<RealtimeChannel> {
  const existingChannel = get()._channel
  if (existingChannel && get().roomCode === roomCode) {
    return existingChannel
  }

  if (existingChannel) {
    await existingChannel.untrack()
    await existingChannel.unsubscribe()
  }

  const channel = getRoomChannel(roomCode)

  channel.on('broadcast', { event: 'state_changed' }, async ({ payload }) => {
    const message = payload as StateChangePayload
    const currentState = get()

    if (message.playerId === currentState.myPlayerId) return
    if (message.actionId === currentState.lastActionId) return
    if (message.actionSeq <= currentState.matchActionSeq) return

    await currentState.syncFromServer(message.roomCode)
  })

  channel.on('broadcast', { event: 'chat_message' }, ({ payload }) => {
    const message = payload as ChatMessage
    set(state => ({ chatMessages: appendChatMessage(state.chatMessages, message) }))
  })

  channel.on('presence', { event: 'join' }, async ({ newPresences }) => {
    const roomId = get().roomId
    if (!roomId) return

    const joinedPlayerIds = (newPresences as Array<{ player_id?: string }>).map(entry => entry.player_id).filter(Boolean) as string[]
    for (const joinedPlayerId of joinedPlayerIds) {
      await markPlayerConnected(roomId, joinedPlayerId)
    }
    await resumePausedMatchIfReady(roomId)
    await get().syncFromServer(roomCode)
  })

  channel.on('presence', { event: 'leave' }, async ({ leftPresences }) => {
    const roomId = get().roomId
    if (!roomId) return

    const leftPlayerIds = (leftPresences as Array<{ player_id?: string }>).map(entry => entry.player_id).filter(Boolean) as string[]
    for (const leftPlayerId of leftPlayerIds) {
      if (leftPlayerId === get().myPlayerId) continue
      await disconnectOnlinePlayer(roomId, leftPlayerId)
    }
    await get().syncFromServer(roomCode)
  })

  await new Promise<void>((resolve, reject) => {
    let settled = false

    channel.subscribe(async status => {
      if (settled) return

      if (status === 'SUBSCRIBED') {
        settled = true
        await channel.track({ player_id: playerId })
        resolve()
        return
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        settled = true
        reject(new Error('Falha ao conectar no canal online da sala.'))
      }
    })
  })

  set({ _channel: channel })
  return channel
}

async function clearChannel(channel: RealtimeChannel | null) {
  if (!channel) return

  await channel.untrack()
  await channel.unsubscribe()
}

export const useOnlineStore = create<OnlineStore>((set, get) => ({
  ...DEFAULT_STATE,

  createRoom: async (playerName: string) => {
    const myPlayerId = getPlayerId()
    const myName = sanitizePlayerName(playerName)

    set({
      status: 'creating',
      myPlayerId,
      myName,
      errorMessage: null,
    })

    try {
      const snapshot = await createRoomRecord(myPlayerId, myName)
      await subscribeToRoomChannel(snapshot.roomCode, myPlayerId, set, get)
      await markPlayerConnected(snapshot.roomId, myPlayerId)
      await syncSnapshotIntoStore(snapshot.roomCode, myPlayerId, myName, set, get)
      addSystemMessage(set, 'Sala criada. Compartilhe o código com os outros jogadores.')
    } catch (error) {
      console.error('Create room error:', error)
      set({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Falha ao criar a sala online.',
      })
    }
  },

  joinRoom: async (code: string, playerName: string) => {
    const myPlayerId = getPlayerId()
    const roomCode = code.toUpperCase()
    const myName = sanitizePlayerName(playerName)

    set({
      status: 'joining',
      roomCode,
      myPlayerId,
      myName,
      errorMessage: null,
    })

    try {
      const snapshot = await joinRoomRecord(roomCode, myPlayerId, myName)
      await subscribeToRoomChannel(snapshot.roomCode, myPlayerId, set, get)
      await markPlayerConnected(snapshot.roomId, myPlayerId)
      await resumePausedMatchIfReady(snapshot.roomId)
      await syncSnapshotIntoStore(snapshot.roomCode, myPlayerId, myName, set, get)
      addSystemMessage(set, 'Você entrou na sala.')
    } catch (error) {
      console.error('Join room error:', error)
      set({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Falha ao entrar na sala.',
      })
    }
  },

  restoreSession: async (preferredCode?: string) => {
    const session = loadOnlineRoomSession()
    if (!session) {
      updateHasRestorableSession(set)
      return false
    }

    const roomCode = preferredCode?.toUpperCase() ?? session.roomCode

    set({
      status: 'syncing',
      myPlayerId: session.playerId,
      myName: session.playerName,
      roomCode,
      errorMessage: null,
    })

    try {
      const snapshot = await joinRoomRecord(roomCode, session.playerId, session.playerName)
      await subscribeToRoomChannel(snapshot.roomCode, session.playerId, set, get)
      await markPlayerConnected(snapshot.roomId, session.playerId)
      await resumePausedMatchIfReady(snapshot.roomId)
      const restored = await syncSnapshotIntoStore(snapshot.roomCode, session.playerId, session.playerName, set, get)
      return restored
    } catch (error) {
      console.error('Restore session error:', error)
      clearOnlineRoomSession()
      updateHasRestorableSession(set)
      set({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Falha ao retomar a sala online.',
      })
      return false
    }
  },

  startGame: async () => {
    const { roomId, isHost, players, myPlayerId, _channel } = get()
    if (!roomId || !isHost || !(players.length === 2 || players.length === 4)) return

    const gamePlayers = gamePlayersFromOnlinePlayers(players)
    if (!(gamePlayers.length === 2 || gamePlayers.length === 4)) return

    const startingColor = gamePlayers[Math.floor(Math.random() * gamePlayers.length)].color
    const gameStore = useGameStore.getState()
    gameStore.initGame(gamePlayers, startingColor)
    const snapshot = gameStore.getSnapshot()

    try {
      const roomSnapshot = await startOnlineMatch(roomId, myPlayerId, snapshot)
      await syncSnapshotIntoStore(roomSnapshot.roomCode, myPlayerId, get().myName, set, get)
      await broadcastStateChange(_channel, {
        roomId,
        roomCode: roomSnapshot.roomCode,
        matchId: roomSnapshot.matchId,
        playerId: myPlayerId,
        actionId: crypto.randomUUID(),
        actionSeq: roomSnapshot.matchActionSeq,
      })
      addSystemMessage(set, 'O jogo começou!')
    } catch (error) {
      console.error('Start game error:', error)
      set({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Falha ao iniciar a partida online.',
      })
    }
  },

  sendAction: async (action: GameAction) => {
    const {
      roomId,
      roomCode,
      matchId,
      matchActionSeq,
      myColor,
      myPlayerId,
      _channel,
      status,
    } = get()

    if (!roomId || !roomCode || !matchId || status !== 'playing') return

    const gameStore = useGameStore.getState()
    const previousSnapshot = gameStore.getSnapshot()
    if (!isActionAllowed(action, previousSnapshot, myColor)) return

    executeAction(action)

    const nextSnapshot = useGameStore.getState().getSnapshot()
    if (getSerializedSnapshot(previousSnapshot) === getSerializedSnapshot(nextSnapshot)) {
      return
    }

    const actionId = crypto.randomUUID()

    try {
      const roomSnapshot = await persistOnlineSnapshot(roomId, matchId, matchActionSeq, actionId, nextSnapshot)
      await syncSnapshotIntoStore(roomSnapshot.roomCode, myPlayerId, get().myName, set, get)
      await broadcastStateChange(_channel, {
        roomId,
        roomCode,
        matchId,
        playerId: myPlayerId,
        actionId,
        actionSeq: roomSnapshot.matchActionSeq,
      })
    } catch (error) {
      console.error('Send action error:', error)
      useGameStore.getState().loadSnapshot(previousSnapshot)
      set({
        errorMessage: error instanceof Error ? error.message : 'Não foi possível sincronizar sua jogada.',
      })
      await get().syncFromServer(roomCode)
    }
  },

  sendChatMessage: async (text: string) => {
    const { _channel, myPlayerId, myName, myColor, status } = get()
    if (!_channel || !text.trim()) return
    if (!['waiting', 'playing', 'paused', 'finished'].includes(status)) return

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      playerId: myPlayerId,
      playerName: myName,
      playerColor: myColor,
      text: text.trim(),
      isSystem: false,
      timestamp: Date.now(),
    }

    set(state => ({ chatMessages: appendChatMessage(state.chatMessages, message) }))

    await _channel.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: message,
    })
  },

  leaveRoom: async () => {
    const { roomId, roomCode, matchId, myPlayerId, _channel, matchActionSeq } = get()

    try {
      if (roomId) {
        await leaveOnlineRoom(roomId, myPlayerId)
        await broadcastStateChange(_channel, {
          roomId,
          roomCode: roomCode ?? '',
          matchId,
          playerId: myPlayerId,
          actionId: crypto.randomUUID(),
          actionSeq: matchActionSeq,
        })
      }
    } catch (error) {
      console.error('Leave room error:', error)
    } finally {
      await clearChannel(_channel)
      clearOnlineRoomSession()
      useGameStore.getState().resetGame()
      set({
        ...DEFAULT_STATE,
        myPlayerId: '',
        hasRestorableSession: false,
      })
    }
  },

  markDisconnected: async () => {
    const { roomId, roomCode, myPlayerId, _channel, status } = get()
    if (!roomId || !roomCode || !['waiting', 'playing', 'paused'].includes(status)) return

    try {
      await disconnectOnlinePlayer(roomId, myPlayerId)
      await broadcastStateChange(_channel, {
        roomId,
        roomCode,
        matchId: get().matchId,
        playerId: myPlayerId,
        actionId: crypto.randomUUID(),
        actionSeq: get().matchActionSeq,
      })
      set({ status: 'disconnected' })
    } catch (error) {
      console.error('Disconnect error:', error)
    }
  },

  syncFromServer: async (roomCode?: string) => {
    const targetCode = roomCode?.toUpperCase() ?? get().roomCode ?? loadOnlineRoomSession()?.roomCode
    const currentPlayerId = get().myPlayerId || loadOnlineRoomSession()?.playerId || getPlayerId()
    const currentPlayerName = get().myName || loadOnlineRoomSession()?.playerName || ''

    if (!targetCode) {
      return
    }

    set({ status: 'syncing', errorMessage: null })

    try {
      const synced = await syncSnapshotIntoStore(targetCode, currentPlayerId, currentPlayerName, set, get)
      if (!synced) return

      const gameSnapshot = useGameStore.getState().getSnapshot()
      const actorColor = getCurrentActionPlayerColor(gameSnapshot)
      const status = get().status

      if (status === 'paused' && actorColor === get().myColor) {
        addSystemMessage(set, 'A partida foi pausada enquanto um jogador reconecta.')
      }
    } catch (error) {
      console.error('Sync room error:', error)
      set({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Falha ao sincronizar a sala online.',
      })
    }
  },

  refreshRestorableSession: () => {
    updateHasRestorableSession(set)
  },

  reset: () => {
    clearOnlineRoomSession()
    useGameStore.getState().resetGame()
    void clearChannel(get()._channel)
    set({
      ...DEFAULT_STATE,
      hasRestorableSession: false,
    })
  },
}))
