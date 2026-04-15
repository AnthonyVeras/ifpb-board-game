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
  capturedCircleEvent: { piece: Piece; capturedBy: PlayerColor } | null
  lastMove: { from: Position; path: Position[]; color: PlayerColor } | null
}

export interface MoveOption {
  to: Position
  isJump: boolean
  jumpedOver?: Position[]  // cells between from and to
}
