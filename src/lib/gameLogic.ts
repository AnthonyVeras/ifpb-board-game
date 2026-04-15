import type {
  Cell, Piece, Position, PlayerColor, PieceType, MoveOption, Player
} from '../types'
import {
  getDirections, inBounds, posEq, step, getCellsBetween,
  isPalindromePattern, getCellType, getTargetBase, getHomeBaseCells, canLandOn
} from './boardUtils'

// ─── Board initialization ─────────────────────────────────────────────────────

const PIECE_ORDER: PieceType[] = [
  'triangle', 'diamond', 'square', 'circle',
  'circle', 'square', 'diamond', 'triangle'
]

export function initBoard(activePlayers: PlayerColor[]): Cell[][] {
  // Build empty 10x10 board
  const board: Cell[][] = Array.from({ length: 10 }, (_, row) =>
    Array.from({ length: 10 }, (_, col) => ({
      row, col,
      type: getCellType(row, col),
      piece: null,
    }))
  )

  let pieceCounter = 0

  const makePiece = (type: PieceType, color: PlayerColor, position: Position): Piece => ({
    id: `${color}-${type}-${pieceCounter++}`,
    type,
    color,
    position,
  })

  // Place pieces for each active player
  for (const color of activePlayers) {
    switch (color) {
      case 'red':
        PIECE_ORDER.forEach((type, i) => {
          const pos = { row: 0, col: i + 1 }
          board[0][i + 1].piece = makePiece(type, color, pos)
        })
        break
      case 'blue':
        PIECE_ORDER.forEach((type, i) => {
          const pos = { row: 9, col: i + 1 }
          board[9][i + 1].piece = makePiece(type, color, pos)
        })
        break
      case 'yellow':
        PIECE_ORDER.forEach((type, i) => {
          const pos = { row: i + 1, col: 0 }
          board[i + 1][0].piece = makePiece(type, color, pos)
        })
        break
      case 'green':
        PIECE_ORDER.forEach((type, i) => {
          const pos = { row: i + 1, col: 9 }
          board[i + 1][9].piece = makePiece(type, color, pos)
        })
        break
    }
  }

  return board
}

// ─── Move calculation ─────────────────────────────────────────────────────────

export function hasPieceAt(board: Cell[][], pos: Position): boolean {
  if (!inBounds(pos)) return false
  return board[pos.row][pos.col].piece !== null
}

export function isEmpty(board: Cell[][], pos: Position): boolean {
  if (!inBounds(pos)) return false
  return board[pos.row][pos.col].piece === null
}

export function getPiece(board: Cell[][], pos: Position): Piece | null {
  if (!inBounds(pos)) return null
  return board[pos.row][pos.col].piece
}

// Get all 1-step normal moves for a piece
export function getNormalMoves(piece: Piece, board: Cell[][]): MoveOption[] {
  const dirs = getDirections(piece.type, piece.color)
  const moves: MoveOption[] = []

  for (const dir of dirs) {
    const to = step(piece.position, dir)
    if (inBounds(to) && isEmpty(board, to) && canLandOn(to.row, to.col, piece.color)) {
      moves.push({ to, isJump: false })
    }
  }

  return moves
}

function isCorner(pos: Position): boolean {
  return (pos.row === 0 || pos.row === 9) && (pos.col === 0 || pos.col === 9)
}

// Get all jump landings from a position in a given direction
// Uses palindrome rule: cells between must form odd-length palindrome
export function getJumpLandingsInDir(
  from: Position,
  dir: { dr: number; dc: number },
  board: Cell[][],
  visited: Position[],
  pieceColor: PlayerColor
): MoveOption[] {
  const result: MoveOption[] = []

  for (let dist = 2; dist <= 16; dist++) {
    const to = step(from, dir, dist)
    if (!inBounds(to)) break
    if (isCorner(to)) continue

    const between = getCellsBetween(from, to, dir)

    // Must be odd length
    if (between.length % 2 === 0) continue

    // Must form a palindrome (X/O pattern)
    if (!isPalindromePattern(between, pos => hasPieceAt(board, pos))) continue

    // Must actually jump over at least one piece
    if (!between.some(pos => hasPieceAt(board, pos))) continue

    // Landing must be empty
    if (!isEmpty(board, to)) continue

    // Cannot land on lateral base (only own or opposite base allowed)
    if (!canLandOn(to.row, to.col, pieceColor)) continue

    // Don't revisit cells already in the current path
    if (visited.some(v => posEq(v, to))) continue

    result.push({ to, isJump: true, jumpedOver: between })
  }

  return result
}

// Get all jump landings from a position (all allowed directions for piece type+color)
export function getAllJumps(
  piece: Piece,
  board: Cell[][],
  visited: Position[]
): MoveOption[] {
  const dirs = getDirections(piece.type, piece.color)
  const jumps: MoveOption[] = []

  for (const dir of dirs) {
    jumps.push(...getJumpLandingsInDir(piece.position, dir, board, visited, piece.color))
  }

  return jumps
}

// Get ALL valid moves (normal + jumps) from current position
export function getAllMoves(piece: Piece, board: Cell[][]): MoveOption[] {
  const normal = getNormalMoves(piece, board)
  const jumps = getAllJumps(piece, board, [piece.position])
  return [...normal, ...jumps]
}

// Get jumps available from a position mid-chain (piece already jumped here)
export function getContinuationJumps(
  piece: Piece,
  board: Cell[][],
  visitedInPath: Position[]
): MoveOption[] {
  // Create a temporary piece at current position
  const tempPiece: Piece = { ...piece, position: visitedInPath[visitedInPath.length - 1] }
  return getAllJumps(tempPiece, board, visitedInPath)
}

// ─── Move application ─────────────────────────────────────────────────────────

export interface MoveResult {
  newBoard: Cell[][]
  capturedCircles: { piece: Piece; capturedBy: PlayerColor }[]
}

// Apply a complete move path to the board
// path[0] = starting position, path[1..] = each step/jump destination
export function applyMove(
  board: Cell[][],
  path: Position[],
  movingColor: PlayerColor,
  jumpedOverSets: Position[][]  // parallel array to path jumps
): MoveResult {
  // Deep clone the board
  const newBoard: Cell[][] = board.map(row => row.map(cell => ({ ...cell, piece: cell.piece ? { ...cell.piece } : null })))

  const capturedCircles: { piece: Piece; capturedBy: PlayerColor }[] = []

  const from = path[0]
  const to = path[path.length - 1]

  // Get the moving piece
  const movingPiece = newBoard[from.row][from.col].piece!
  const updatedPiece: Piece = { ...movingPiece, position: to }

  // Collect all enemy circles in jumped-over cells
  for (const jumpedCells of jumpedOverSets) {
    for (const pos of jumpedCells) {
      const cell = newBoard[pos.row][pos.col]
      if (cell.piece && cell.piece.type === 'circle' && cell.piece.color !== movingColor) {
        capturedCircles.push({ piece: { ...cell.piece }, capturedBy: movingColor })
        // Remove from board (will be placed back by player choice)
        newBoard[pos.row][pos.col] = { ...cell, piece: null }
      }
    }
  }

  // Move the piece
  newBoard[from.row][from.col] = { ...newBoard[from.row][from.col], piece: null }
  newBoard[to.row][to.col] = { ...newBoard[to.row][to.col], piece: updatedPiece }

  return { newBoard, capturedCircles }
}

// Place a circle back on its home base
export function placeCircleAtBase(
  board: Cell[][],
  piece: Piece,
  targetPos: Position
): Cell[][] {
  const newBoard = board.map(row => row.map(cell => ({ ...cell, piece: cell.piece ? { ...cell.piece } : null })))
  const updatedPiece: Piece = { ...piece, position: targetPos }
  newBoard[targetPos.row][targetPos.col] = { ...newBoard[targetPos.row][targetPos.col], piece: updatedPiece }
  return newBoard
}

// ─── Win condition ─────────────────────────────────────────────────────────────

export function checkWin(board: Cell[][], color: PlayerColor): boolean {
  const { type: targetType } = getTargetBase(color)

  // Find all pieces of this color
  for (let r = 0; r <= 9; r++) {
    for (let c = 0; c <= 9; c++) {
      const piece = board[r][c].piece
      if (piece && piece.color === color) {
        // If this piece is NOT on the target base → not won yet
        const cellType = getCellType(r, c)
        if (cellType !== targetType) return false
      }
    }
  }

  return true
}

// ─── Turn management ──────────────────────────────────────────────────────────

// Clockwise order on the board: top(red) → right(green) → bottom(blue) → left(yellow)
const CLOCKWISE_ORDER: PlayerColor[] = ['red', 'green', 'blue', 'yellow']

export function getNextTurn(players: Player[], currentColor: PlayerColor): PlayerColor {
  const activeColors = players.map(p => p.color)
  const cwIdx = CLOCKWISE_ORDER.indexOf(currentColor)
  for (let i = 1; i <= 4; i++) {
    const next = CLOCKWISE_ORDER[(cwIdx + i) % 4]
    if (activeColors.includes(next)) return next
  }
  return currentColor // fallback
}

// ─── Available home base slots (for circle return) ────────────────────────────

export function getEmptyHomeBaseSlots(board: Cell[][], color: PlayerColor): Position[] {
  return getHomeBaseCells(color).filter(pos => isEmpty(board, pos))
}
