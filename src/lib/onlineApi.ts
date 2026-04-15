import type { PostgrestError } from '@supabase/supabase-js'
import type {
  GameSnapshot,
  OnlinePlayerState,
  OnlineRoomLifecycleStatus,
  OnlineRoomSnapshot,
  PlayerColor,
} from '../types'
import { normalizePlayerName, sanitizePlayerName, validatePlayerName } from './playerNames'
import { generateRoomCode, getSupabase } from './supabaseClient'

interface RoomRow {
  id: string
  room_code: string
  host_player_id: string
  status: OnlineRoomLifecycleStatus
  match_id: string | null
  reconnect_deadline: string | null
}

interface RoomPlayerRow {
  room_id: string
  player_id: string
  name: string
  normalized_name: string
  slot_index: number
  color: string | null
  is_connected: boolean
  is_ready: boolean
  left_at: string | null
}

interface MatchRow {
  id: string
  room_id: string
  status: OnlineRoomLifecycleStatus
  reconnect_deadline: string | null
  winner: string | null
  current_turn: string | null
  action_seq: number
}

interface MatchStateRow {
  match_id: string
  room_id: string
  snapshot: GameSnapshot | null
  action_seq: number
  last_action_id: string | null
}

export const ONLINE_COLOR_ORDER: PlayerColor[] = ['red', 'blue', 'yellow', 'green']
export const MAX_ONLINE_PLAYERS = 4
export const ONLINE_RECONNECT_WINDOW_MS = 3 * 60 * 1000
export const MAX_CHAT_MESSAGES = 100

function nowIso(): string {
  return new Date().toISOString()
}

function toReconnectDeadline(): string {
  return new Date(Date.now() + ONLINE_RECONNECT_WINDOW_MS).toISOString()
}

function isUniqueViolation(error: PostgrestError | null): boolean {
  return error?.code === '23505'
}

function coerceRoomStatus(value: string | null | undefined): OnlineRoomLifecycleStatus {
  if (value === 'playing' || value === 'paused' || value === 'finished') {
    return value
  }
  return 'waiting'
}

function coerceColor(value: string | null): PlayerColor | null {
  if (value === 'red' || value === 'blue' || value === 'yellow' || value === 'green') {
    return value
  }
  return null
}

async function fetchRoomRowByCode(roomCode: string): Promise<RoomRow | null> {
  const { data, error } = await getSupabase()
    .from('rooms')
    .select('id, room_code, host_player_id, status, match_id, reconnect_deadline')
    .eq('room_code', roomCode)
    .maybeSingle()

  if (error) {
    throw new Error('Não foi possível localizar a sala agora.')
  }

  return data as RoomRow | null
}

async function fetchRoomRowById(roomId: string): Promise<RoomRow | null> {
  const { data, error } = await getSupabase()
    .from('rooms')
    .select('id, room_code, host_player_id, status, match_id, reconnect_deadline')
    .eq('id', roomId)
    .maybeSingle()

  if (error) {
    throw new Error('Não foi possível carregar a sala agora.')
  }

  return data as RoomRow | null
}

async function fetchRoomPlayers(roomId: string): Promise<RoomPlayerRow[]> {
  const { data, error } = await getSupabase()
    .from('room_players')
    .select('room_id, player_id, name, normalized_name, slot_index, color, is_connected, is_ready, left_at')
    .eq('room_id', roomId)
    .is('left_at', null)
    .order('slot_index', { ascending: true })

  if (error) {
    throw new Error('Não foi possível carregar os jogadores da sala.')
  }

  return (data ?? []) as RoomPlayerRow[]
}

async function fetchMatchRow(roomId: string, matchId: string | null): Promise<MatchRow | null> {
  const query = getSupabase()
    .from('matches')
    .select('id, room_id, status, reconnect_deadline, winner, current_turn, action_seq')

  const { data, error } = matchId
    ? await query.eq('id', matchId).maybeSingle()
    : await query.eq('room_id', roomId).maybeSingle()

  if (error) {
    throw new Error('Não foi possível carregar a partida.')
  }

  return data as MatchRow | null
}

async function fetchMatchState(matchId: string): Promise<MatchStateRow | null> {
  const { data, error } = await getSupabase()
    .from('match_state')
    .select('match_id, room_id, snapshot, action_seq, last_action_id')
    .eq('match_id', matchId)
    .maybeSingle()

  if (error) {
    throw new Error('Não foi possível carregar o estado da partida.')
  }

  return data as MatchStateRow | null
}

function mapPlayers(room: RoomRow, players: RoomPlayerRow[]): OnlinePlayerState[] {
  return players.map(player => ({
    id: player.player_id,
    name: player.name,
    normalizedName: player.normalized_name,
    slotIndex: player.slot_index,
    color: coerceColor(player.color) ?? ONLINE_COLOR_ORDER[player.slot_index] ?? null,
    isHost: room.host_player_id === player.player_id,
    isConnected: player.is_connected,
    isReady: player.is_ready,
  }))
}

function buildSnapshot(
  room: RoomRow,
  players: RoomPlayerRow[],
  match: MatchRow | null,
  matchState: MatchStateRow | null,
): OnlineRoomSnapshot {
  return {
    roomId: room.id,
    roomCode: room.room_code,
    hostPlayerId: room.host_player_id,
    status: coerceRoomStatus(room.status),
    reconnectDeadline: room.reconnect_deadline ?? match?.reconnect_deadline ?? null,
    players: mapPlayers(room, players),
    matchId: match?.id ?? room.match_id ?? null,
    matchActionSeq: matchState?.action_seq ?? match?.action_seq ?? 0,
    lastActionId: matchState?.last_action_id ?? null,
    gameSnapshot: matchState?.snapshot ?? null,
  }
}

async function maybeExpirePausedRoom(room: RoomRow, match: MatchRow | null): Promise<RoomRow> {
  if (room.status !== 'paused' || !room.reconnect_deadline) {
    return room
  }

  if (new Date(room.reconnect_deadline).getTime() > Date.now()) {
    return room
  }

  await getSupabase()
    .from('rooms')
    .update({
      status: 'finished',
      reconnect_deadline: null,
      updated_at: nowIso(),
    })
    .eq('id', room.id)

  if (match) {
    await getSupabase()
      .from('matches')
      .update({
        status: 'finished',
        reconnect_deadline: null,
        finished_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq('id', match.id)
  }

  return { ...room, status: 'finished', reconnect_deadline: null }
}

async function electNextHostIfNeeded(roomId: string): Promise<void> {
  const room = await fetchRoomRowById(roomId)
  if (!room) return

  const players = await fetchRoomPlayers(roomId)
  if (players.length === 0) return

  const hostStillAvailable = players.some(player => player.player_id === room.host_player_id && player.is_connected)
  if (hostStillAvailable) return

  const nextHost = players.find(player => player.is_connected) ?? players[0]
  if (!nextHost || nextHost.player_id === room.host_player_id) return

  await getSupabase()
    .from('rooms')
    .update({ host_player_id: nextHost.player_id, updated_at: nowIso() })
    .eq('id', roomId)
}

async function setPlayerConnection(roomId: string, playerId: string, isConnected: boolean): Promise<void> {
  await getSupabase()
    .from('room_players')
    .update({
      is_connected: isConnected,
      disconnected_at: isConnected ? null : nowIso(),
      last_seen_at: nowIso(),
    })
    .eq('room_id', roomId)
    .eq('player_id', playerId)
}

export async function fetchOnlineRoomSnapshot(roomCode: string): Promise<OnlineRoomSnapshot | null> {
  const room = await fetchRoomRowByCode(roomCode.toUpperCase())
  if (!room) return null

  const match = await fetchMatchRow(room.id, room.match_id)
  const effectiveRoom = await maybeExpirePausedRoom(room, match)
  const players = await fetchRoomPlayers(room.id)
  const effectiveMatch = await fetchMatchRow(room.id, effectiveRoom.match_id)
  const matchState = effectiveMatch ? await fetchMatchState(effectiveMatch.id) : null

  return buildSnapshot(effectiveRoom, players, effectiveMatch, matchState)
}

export async function createRoomRecord(playerId: string, playerName: string): Promise<OnlineRoomSnapshot> {
  const name = sanitizePlayerName(playerName)
  const normalizedName = normalizePlayerName(name)
  const validationError = validatePlayerName(name)

  if (validationError) {
    throw new Error(validationError)
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const roomCode = generateRoomCode()
    const { data: room, error: roomError } = await getSupabase()
      .from('rooms')
      .insert({
        room_code: roomCode,
        host_player_id: playerId,
        status: 'waiting',
      })
      .select('id, room_code, host_player_id, status, match_id, reconnect_deadline')
      .single()

    if (isUniqueViolation(roomError)) {
      continue
    }

    if (roomError || !room) {
      throw new Error('Falha ao criar a sala online.')
    }

    const { error: playerError } = await getSupabase()
      .from('room_players')
      .insert({
        room_id: room.id,
        player_id: playerId,
        name,
        normalized_name: normalizedName,
        slot_index: 0,
        color: ONLINE_COLOR_ORDER[0],
        is_connected: true,
        is_ready: false,
      })

    if (playerError) {
      await getSupabase().from('rooms').delete().eq('id', room.id)
      throw new Error('Falha ao registrar o host da sala.')
    }

    const snapshot = await fetchOnlineRoomSnapshot(room.room_code)
    if (!snapshot) {
      throw new Error('Sala criada, mas o estado não pôde ser carregado.')
    }
    return snapshot
  }

  throw new Error('Não foi possível gerar um código de sala único.')
}

export async function joinRoomRecord(
  roomCode: string,
  playerId: string,
  playerName: string,
): Promise<OnlineRoomSnapshot> {
  const room = await fetchRoomRowByCode(roomCode.toUpperCase())
  if (!room) {
    throw new Error('Sala não encontrada.')
  }

  const match = await fetchMatchRow(room.id, room.match_id)
  const effectiveRoom = await maybeExpirePausedRoom(room, match)
  const players = await fetchRoomPlayers(room.id)
  const name = sanitizePlayerName(playerName)
  const normalizedName = normalizePlayerName(name)
  const existingPlayer = players.find(player => player.player_id === playerId)
  const validationError = validatePlayerName(name, players.map(player => player.name), existingPlayer?.normalized_name)

  if (validationError) {
    throw new Error(validationError)
  }

  if (effectiveRoom.status === 'finished') {
    throw new Error('Essa sala já foi encerrada.')
  }

  if (existingPlayer) {
    const duplicateByName = players.some(player =>
      player.player_id !== playerId && player.normalized_name === normalizedName,
    )

    if (duplicateByName) {
      throw new Error('Já existe outro jogador com esse nome.')
    }

    await getSupabase()
      .from('room_players')
      .update({
        name,
        normalized_name: normalizedName,
        is_connected: true,
        disconnected_at: null,
        last_seen_at: nowIso(),
      })
      .eq('room_id', room.id)
      .eq('player_id', playerId)
  } else {
    if (effectiveRoom.status !== 'waiting') {
      throw new Error('A partida já começou e não aceita novos jogadores.')
    }

    if (players.length >= MAX_ONLINE_PLAYERS) {
      throw new Error('A sala já está cheia.')
    }

    const duplicateByName = players.some(player => player.normalized_name === normalizedName)
    if (duplicateByName) {
      throw new Error('Já existe um jogador com esse nome.')
    }

    const usedSlots = new Set(players.map(player => player.slot_index))
    const slotIndex = Array.from({ length: MAX_ONLINE_PLAYERS }, (_, index) => index)
      .find(index => !usedSlots.has(index))

    if (slotIndex === undefined) {
      throw new Error('Não há vagas disponíveis nessa sala.')
    }

    const { error } = await getSupabase()
      .from('room_players')
      .insert({
        room_id: room.id,
        player_id: playerId,
        name,
        normalized_name: normalizedName,
        slot_index: slotIndex,
        color: ONLINE_COLOR_ORDER[slotIndex],
        is_connected: true,
        is_ready: false,
      })

    if (isUniqueViolation(error)) {
      throw new Error('Outro jogador entrou ao mesmo tempo. Tente novamente.')
    }

    if (error) {
      throw new Error('Falha ao entrar na sala.')
    }
  }

  await electNextHostIfNeeded(room.id)
  await resumePausedMatchIfReady(room.id)

  const snapshot = await fetchOnlineRoomSnapshot(room.room_code)
  if (!snapshot) {
    throw new Error('A sala foi encontrada, mas não pôde ser sincronizada.')
  }

  return snapshot
}

export async function startOnlineMatch(
  roomId: string,
  hostPlayerId: string,
  snapshot: GameSnapshot,
): Promise<OnlineRoomSnapshot> {
  const room = await fetchRoomRowById(roomId)
  if (!room) {
    throw new Error('Sala não encontrada.')
  }

  if (room.host_player_id !== hostPlayerId) {
    throw new Error('Só o host pode iniciar a partida.')
  }

  const players = await fetchRoomPlayers(roomId)
  if (!(players.length === 2 || players.length === 4)) {
    throw new Error('A sala precisa ter 2 ou 4 jogadores para iniciar.')
  }
  if (!players.every(player => player.is_connected)) {
    throw new Error('Todos os jogadores precisam estar conectados para iniciar.')
  }

  const activePlayers = [...players].sort((a, b) => a.slot_index - b.slot_index)

  for (const player of activePlayers) {
    const color = ONLINE_COLOR_ORDER[player.slot_index] ?? null
    await getSupabase()
      .from('room_players')
      .update({
        color,
        is_ready: false,
        last_seen_at: nowIso(),
      })
      .eq('room_id', roomId)
      .eq('player_id', player.player_id)
  }

  const { data: match, error: matchError } = await getSupabase()
    .from('matches')
    .insert({
      room_id: roomId,
      status: 'playing',
      current_turn: snapshot.currentTurn,
      winner: snapshot.winner,
      reconnect_deadline: null,
      action_seq: 0,
      started_at: nowIso(),
    })
    .select('id, room_id, status, reconnect_deadline, winner, current_turn, action_seq')
    .single()

  if (matchError || !match) {
    throw new Error('Não foi possível iniciar a partida online.')
  }

  const { error: matchStateError } = await getSupabase()
    .from('match_state')
    .insert({
      match_id: match.id,
      room_id: roomId,
      snapshot,
      action_seq: 0,
      last_action_id: null,
    })

  if (matchStateError) {
    throw new Error('A partida foi criada, mas o estado inicial falhou.')
  }

  await getSupabase()
    .from('rooms')
    .update({
      status: 'playing',
      match_id: match.id,
      reconnect_deadline: null,
      updated_at: nowIso(),
    })
    .eq('id', roomId)

  const roomSnapshot = await fetchOnlineRoomSnapshot(room.room_code)
  if (!roomSnapshot) {
    throw new Error('A partida iniciou, mas o estado não pôde ser carregado.')
  }

  return roomSnapshot
}

export async function persistOnlineSnapshot(
  roomId: string,
  matchId: string,
  expectedActionSeq: number,
  actionId: string,
  snapshot: GameSnapshot,
): Promise<OnlineRoomSnapshot> {
  const nextActionSeq = expectedActionSeq + 1
  const nextStatus: OnlineRoomLifecycleStatus = snapshot.phase === 'finished' ? 'finished' : 'playing'

  const { data: updatedState, error } = await getSupabase()
    .from('match_state')
    .update({
      snapshot,
      action_seq: nextActionSeq,
      last_action_id: actionId,
      updated_at: nowIso(),
    })
    .eq('match_id', matchId)
    .eq('action_seq', expectedActionSeq)
    .select('match_id, room_id, snapshot, action_seq, last_action_id')
    .maybeSingle()

  if (error) {
    throw new Error('Falha ao sincronizar a jogada com o servidor.')
  }

  if (!updatedState) {
    throw new Error('O estado da partida mudou antes da sua ação ser confirmada.')
  }

  await getSupabase()
    .from('matches')
    .update({
      status: nextStatus,
      current_turn: snapshot.currentTurn,
      winner: snapshot.winner,
      reconnect_deadline: null,
      action_seq: nextActionSeq,
      finished_at: snapshot.phase === 'finished' ? nowIso() : null,
      updated_at: nowIso(),
    })
    .eq('id', matchId)

  await getSupabase()
    .from('rooms')
    .update({
      status: nextStatus,
      reconnect_deadline: null,
      updated_at: nowIso(),
    })
    .eq('id', roomId)

  await syncReadyPlayers(roomId, snapshot)

  const room = await fetchRoomRowById(roomId)
  if (!room) {
    throw new Error('A sala não está mais disponível.')
  }

  const players = await fetchRoomPlayers(roomId)
  const match = await fetchMatchRow(roomId, matchId)

  return buildSnapshot(room, players, match, updatedState as MatchStateRow)
}

export async function syncReadyPlayers(roomId: string, snapshot: GameSnapshot): Promise<void> {
  const players = await fetchRoomPlayers(roomId)

  for (const player of players) {
    const playerColor = coerceColor(player.color)
    await getSupabase()
      .from('room_players')
      .update({
        is_ready: playerColor ? snapshot.readyPlayers.includes(playerColor) : false,
        last_seen_at: nowIso(),
      })
      .eq('room_id', roomId)
      .eq('player_id', player.player_id)
  }
}

export async function leaveOnlineRoom(roomId: string, playerId: string): Promise<void> {
  const room = await fetchRoomRowById(roomId)
  if (!room) return

  await getSupabase()
    .from('room_players')
    .update({
      left_at: nowIso(),
      is_connected: false,
      disconnected_at: nowIso(),
      last_seen_at: nowIso(),
    })
    .eq('room_id', roomId)
    .eq('player_id', playerId)

  const remainingPlayers = await fetchRoomPlayers(roomId)

  if (remainingPlayers.length === 0) {
    await getSupabase().from('rooms').delete().eq('id', roomId)
    return
  }

  if (room.status === 'waiting') {
    await electNextHostIfNeeded(roomId)
    return
  }

  await getSupabase()
    .from('rooms')
    .update({
      status: 'finished',
      reconnect_deadline: null,
      updated_at: nowIso(),
    })
    .eq('id', roomId)

  await getSupabase()
    .from('matches')
    .update({
      status: 'finished',
      reconnect_deadline: null,
      finished_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq('room_id', roomId)
}

export async function disconnectOnlinePlayer(roomId: string, playerId: string): Promise<void> {
  const room = await fetchRoomRowById(roomId)
  if (!room) return

  await setPlayerConnection(roomId, playerId, false)

  if (room.status === 'waiting') {
    await electNextHostIfNeeded(roomId)
    return
  }

  if (room.status !== 'playing') {
    return
  }

  const reconnectDeadline = toReconnectDeadline()

  await getSupabase()
    .from('rooms')
    .update({
      status: 'paused',
      reconnect_deadline: reconnectDeadline,
      updated_at: nowIso(),
    })
    .eq('id', roomId)

  await getSupabase()
    .from('matches')
    .update({
      status: 'paused',
      reconnect_deadline: reconnectDeadline,
      updated_at: nowIso(),
    })
    .eq('room_id', roomId)
}

export async function markPlayerConnected(roomId: string, playerId: string): Promise<void> {
  await setPlayerConnection(roomId, playerId, true)
}

export async function resumePausedMatchIfReady(roomId: string): Promise<void> {
  const room = await fetchRoomRowById(roomId)
  if (!room) return

  if (room.status === 'waiting') {
    await electNextHostIfNeeded(roomId)
    return
  }

  if (room.status !== 'paused') {
    return
  }

  if (room.reconnect_deadline && new Date(room.reconnect_deadline).getTime() <= Date.now()) {
    await maybeExpirePausedRoom(room, await fetchMatchRow(roomId, room.match_id))
    return
  }

  const players = await fetchRoomPlayers(roomId)
  if (!players.length || !players.every(player => player.is_connected)) {
    return
  }

  await getSupabase()
    .from('rooms')
    .update({
      status: 'playing',
      reconnect_deadline: null,
      updated_at: nowIso(),
    })
    .eq('id', roomId)

  await getSupabase()
    .from('matches')
    .update({
      status: 'playing',
      reconnect_deadline: null,
      updated_at: nowIso(),
    })
    .eq('room_id', roomId)
}
