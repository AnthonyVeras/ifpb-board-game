import type { Position, PlayerColor, PieceType, CellType } from '../types'

// All 8 directions as [dRow, dCol]
export const DIR = {
  UP:         { dr: -1, dc:  0 },
  DOWN:       { dr:  1, dc:  0 },
  LEFT:       { dr:  0, dc: -1 },
  RIGHT:      { dr:  0, dc:  1 },
  UP_LEFT:    { dr: -1, dc: -1 },
  UP_RIGHT:   { dr: -1, dc:  1 },
  DOWN_LEFT:  { dr:  1, dc: -1 },
  DOWN_RIGHT: { dr:  1, dc:  1 },
}

type Direction = { dr: number; dc: number }

// Movement directions per piece type and player color
export function getDirections(type: PieceType, color: PlayerColor): Direction[] {
  switch (type) {
    case 'circle':
      return Object.values(DIR)

    case 'square':
      return [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT]

    case 'diamond':
      return [DIR.UP_LEFT, DIR.UP_RIGHT, DIR.DOWN_LEFT, DIR.DOWN_RIGHT]

    case 'triangle':
      // Moves backward (toward own base) in straight line + two FORWARD diagonals
      switch (color) {
        case 'red':    // starts row 0, forward = DOWN → backward = UP, forward diags = DOWN_LEFT, DOWN_RIGHT
          return [DIR.UP, DIR.DOWN_LEFT, DIR.DOWN_RIGHT]
        case 'blue':   // starts row 9, forward = UP → backward = DOWN, forward diags = UP_LEFT, UP_RIGHT
          return [DIR.DOWN, DIR.UP_LEFT, DIR.UP_RIGHT]
        case 'yellow': // starts col 0, forward = RIGHT → backward = LEFT, forward diags = UP_RIGHT, DOWN_RIGHT
          return [DIR.LEFT, DIR.UP_RIGHT, DIR.DOWN_RIGHT]
        case 'green':  // starts col 9, forward = LEFT → backward = RIGHT, forward diags = UP_LEFT, DOWN_LEFT
          return [DIR.RIGHT, DIR.UP_LEFT, DIR.DOWN_LEFT]
      }
  }
}

export function inBounds(pos: Position): boolean {
  return pos.row >= 0 && pos.row <= 9 && pos.col >= 0 && pos.col <= 9
}

export function posEq(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col
}

export function step(pos: Position, dir: Direction, n = 1): Position {
  return { row: pos.row + dir.dr * n, col: pos.col + dir.dc * n }
}

// Get all cells strictly BETWEEN from and to along a direction
// Returns cells at from+dir, from+2*dir, ... up to (but not including) to
export function getCellsBetween(from: Position, to: Position, dir: Direction): Position[] {
  const cells: Position[] = []
  let cur = step(from, dir)
  while (!posEq(cur, to)) {
    cells.push(cur)
    cur = step(cur, dir)
  }
  return cells
}

// Check if a sequence of positions forms an odd-length palindrome
// where X = has piece, O = empty
// Requires board to check each cell
export function isPalindromePattern(
  cells: Position[],
  hasPiece: (pos: Position) => boolean
): boolean {
  if (cells.length % 2 === 0) return false
  const pattern = cells.map(c => hasPiece(c) ? 'X' : 'O')
  const reversed = [...pattern].reverse()
  return pattern.every((v, i) => v === reversed[i])
}

export function getCellType(row: number, col: number): CellType {
  if ((row === 0 || row === 9) && (col === 0 || col === 9)) return 'corner'
  if (row === 0) return 'base-red'
  if (row === 9) return 'base-blue'
  if (col === 0) return 'base-yellow'
  if (col === 9) return 'base-green'
  return 'playable'
}

// Which base row/col does a color need to reach (opponent's base)
export function getTargetBase(color: PlayerColor): { type: CellType } {
  switch (color) {
    case 'red':    return { type: 'base-blue' }
    case 'blue':   return { type: 'base-red' }
    case 'yellow': return { type: 'base-green' }
    case 'green':  return { type: 'base-yellow' }
  }
}

// Home base cells for a given color (where they start / circles return to)
export function getHomeBaseCells(color: PlayerColor): Position[] {
  const cells: Position[] = []
  switch (color) {
    case 'red':
      for (let c = 1; c <= 8; c++) cells.push({ row: 0, col: c })
      break
    case 'blue':
      for (let c = 1; c <= 8; c++) cells.push({ row: 9, col: c })
      break
    case 'yellow':
      for (let r = 1; r <= 8; r++) cells.push({ row: r, col: 0 })
      break
    case 'green':
      for (let r = 1; r <= 8; r++) cells.push({ row: r, col: 9 })
      break
  }
  return cells
}

// Returns the opposite player color (Red↔Blue, Yellow↔Green)
export function getOppositeColor(color: PlayerColor): PlayerColor {
  switch (color) {
    case 'red': return 'blue'
    case 'blue': return 'red'
    case 'yellow': return 'green'
    case 'green': return 'yellow'
  }
}

// Check if a piece of the given color can LAND on a specific cell.
// Pieces can stop on: playable cells, own base, opposite's base.
// Pieces CANNOT stop on: corners, lateral player bases.
// (Pieces CAN pass through lateral bases during jumps — only landing is restricted.)
export function canLandOn(row: number, col: number, pieceColor: PlayerColor): boolean {
  const cellType = getCellType(row, col)
  if (cellType === 'corner') return false
  if (cellType === 'playable') return true
  // Base cell — extract base owner color
  const baseColor = cellType.replace('base-', '') as PlayerColor
  if (baseColor === pieceColor) return true
  if (baseColor === getOppositeColor(pieceColor)) return true
  return false // lateral base — cannot land here
}
