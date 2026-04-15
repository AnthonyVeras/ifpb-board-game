export type PlayerColor = 'red' | 'blue' | 'yellow' | 'green'
export type PieceType = 'circle' | 'square' | 'triangle' | 'diamond'
export type GamePhase = 'setup' | 'arranging' | 'playing' | 'circle-return' | 'finished'
export type CellType = 'playable' | 'base-red' | 'base-blue' | 'base-yellow' | 'base-green' | 'corner'

export interface Position {
  row: number
  col: number
}

export interface Piece {
  id: string
  type: PieceType
  color: PlayerColor
  position: Position
}

export interface Cell {
  row: number
  col: number
  type: CellType
  piece: Piece | null
}

export interface Player {
  color: PlayerColor
  name: string
  timerMs: number | null  // null = unlimited
  timeLeft: number | null
  isActive: boolean
}

export interface GameState {
  board: Cell[][]
  players: Player[]
  currentTurn: PlayerColor
  selectedPiece: Position | null
  validMoves: Position[]
  validJumps: Position[]
  currentPath: Position[]
  pathJumpedOver: Position[][]  // for each jump in path, which cells were between
  phase: GamePhase
  winner: PlayerColor | null
  capturedCircleEvent: CapturedCircleEvent | null
  lastMove: MoveRecord | null
}

export interface MoveOption {
  to: Position
  isJump: boolean
  jumpedOver?: Position[]  // cells between from and to
}

export interface CapturedCircleEvent {
  piece: Piece
  capturedBy: PlayerColor
}

export interface MoveRecord {
  from: Position
  path: Position[]
  color: PlayerColor
}

export interface GameSnapshot extends GameState {
  arrangingSelectedPiece: Position | null
  readyPlayers: PlayerColor[]
  arrangingCurrentPlayer: PlayerColor | null
  currentMoveOptions: MoveOption[]
  pendingCapturedCircles: CapturedCircleEvent[]
  pathJumpedOverSets: Position[][]
}

export type OnlineRoomLifecycleStatus = 'waiting' | 'playing' | 'paused' | 'finished'

export interface OnlinePlayerState {
  id: string
  name: string
  normalizedName: string
  slotIndex: number
  color: PlayerColor | null
  isHost: boolean
  isConnected: boolean
  isReady: boolean
}

export interface OnlineRoomSnapshot {
  roomId: string
  roomCode: string
  hostPlayerId: string
  status: OnlineRoomLifecycleStatus
  reconnectDeadline: string | null
  players: OnlinePlayerState[]
  matchId: string | null
  matchActionSeq: number
  lastActionId: string | null
  gameSnapshot: GameSnapshot | null
}

export interface OnlineRoomSession {
  roomId: string
  roomCode: string
  playerId: string
  playerName: string
  matchId: string | null
  status: OnlineRoomLifecycleStatus
  updatedAt: number
}
