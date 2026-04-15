import { create } from 'zustand'
import type {
  CapturedCircleEvent,
  GameSnapshot,
  GameState,
  MoveOption,
  Player,
  PlayerColor,
  Position,
} from '../types'
import {
  initBoard, getAllMoves, getContinuationJumps,
  applyMove, placeCircleAtBase, checkWin, getNextTurn,
  getPiece, getEmptyHomeBaseSlots
} from '../lib/gameLogic'
import { posEq, getHomeBaseCells } from '../lib/boardUtils'

interface GameStore extends GameState {
  // Setup
  initGame: (players: Player[], startingColor?: PlayerColor) => void
  resetGame: () => void
  getSnapshot: () => GameSnapshot
  loadSnapshot: (snapshot: GameSnapshot) => void

  // Arranging phase (pre-game piece redistribution)
  arrangingSelectedPiece: Position | null
  readyPlayers: PlayerColor[]
  arrangingCurrentPlayer: PlayerColor | null  // whose turn to arrange (local mode)
  selectArrangingPiece: (pos: Position, color: PlayerColor) => void
  swapPieces: (pos1: Position, pos2: Position, color: PlayerColor) => void
  markReady: (color: PlayerColor) => void

  // Gameplay
  selectPiece: (pos: Position) => void
  applyMoveOption: (option: MoveOption) => void  // used for both moves and jump-chain steps
  undoLastStep: () => void
  confirmMove: () => void
  placeReturnedCircle: (pos: Position) => void

  // Internal
  _currentMoveOptions: MoveOption[]
  _pendingCapturedCircles: CapturedCircleEvent[]
  _pathJumpedOverSets: Position[][]
}

const DEFAULT_STATE: Omit<GameStore,
  'initGame' | 'resetGame' | 'getSnapshot' | 'loadSnapshot' | 'selectPiece' | 'applyMoveOption' |
  'undoLastStep' | 'confirmMove' | 'placeReturnedCircle' |
  'selectArrangingPiece' | 'swapPieces' | 'markReady' |
  '_currentMoveOptions' | '_pendingCapturedCircles' | '_pathJumpedOverSets'
> = {
  board: [],
  players: [],
  currentTurn: 'red',
  selectedPiece: null,
  validMoves: [],
  validJumps: [],
  currentPath: [],
  pathJumpedOver: [],
  phase: 'setup',
  winner: null,
  capturedCircleEvent: null,
  lastMove: null,
  arrangingSelectedPiece: null,
  readyPlayers: [],
  arrangingCurrentPlayer: null,
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...DEFAULT_STATE,
  _currentMoveOptions: [],
  _pendingCapturedCircles: [],
  _pathJumpedOverSets: [],

  initGame: (players: Player[], startingColor?: PlayerColor) => {
    const activePlayers = players.map(p => p.color)
    const board = initBoard(activePlayers)
    const firstTurn = startingColor ?? activePlayers[Math.floor(Math.random() * activePlayers.length)]
    set({
      board,
      players,
      currentTurn: firstTurn,
      selectedPiece: null,
      validMoves: [],
      validJumps: [],
      currentPath: [],
      pathJumpedOver: [],
      phase: 'arranging',
      winner: null,
      capturedCircleEvent: null,
      lastMove: null,
      _currentMoveOptions: [],
      _pendingCapturedCircles: [],
      _pathJumpedOverSets: [],
      arrangingSelectedPiece: null,
      readyPlayers: [],
      arrangingCurrentPlayer: activePlayers[0],
    })
  },

  resetGame: () => set({ ...DEFAULT_STATE, _currentMoveOptions: [], _pendingCapturedCircles: [], _pathJumpedOverSets: [] }),

  getSnapshot: () => {
    const state = get()

    return {
      board: state.board,
      players: state.players,
      currentTurn: state.currentTurn,
      selectedPiece: state.selectedPiece,
      validMoves: state.validMoves,
      validJumps: state.validJumps,
      currentPath: state.currentPath,
      pathJumpedOver: state.pathJumpedOver,
      phase: state.phase,
      winner: state.winner,
      capturedCircleEvent: state.capturedCircleEvent,
      lastMove: state.lastMove,
      arrangingSelectedPiece: state.arrangingSelectedPiece,
      readyPlayers: state.readyPlayers,
      arrangingCurrentPlayer: state.arrangingCurrentPlayer,
      currentMoveOptions: state._currentMoveOptions,
      pendingCapturedCircles: state._pendingCapturedCircles,
      pathJumpedOverSets: state._pathJumpedOverSets,
    }
  },

  loadSnapshot: (snapshot: GameSnapshot) => {
    set({
      board: snapshot.board,
      players: snapshot.players,
      currentTurn: snapshot.currentTurn,
      selectedPiece: snapshot.selectedPiece,
      validMoves: snapshot.validMoves,
      validJumps: snapshot.validJumps,
      currentPath: snapshot.currentPath,
      pathJumpedOver: snapshot.pathJumpedOver,
      phase: snapshot.phase,
      winner: snapshot.winner,
      capturedCircleEvent: snapshot.capturedCircleEvent,
      lastMove: snapshot.lastMove,
      arrangingSelectedPiece: snapshot.arrangingSelectedPiece,
      readyPlayers: snapshot.readyPlayers,
      arrangingCurrentPlayer: snapshot.arrangingCurrentPlayer,
      _currentMoveOptions: snapshot.currentMoveOptions,
      _pendingCapturedCircles: snapshot.pendingCapturedCircles,
      _pathJumpedOverSets: snapshot.pathJumpedOverSets,
    })
  },

  // ─── Arranging phase actions ─────────────────────────────────────────────────

  selectArrangingPiece: (pos: Position, color: PlayerColor) => {
    const { board, phase, arrangingSelectedPiece, readyPlayers } = get()
    if (phase !== 'arranging') return
    if (readyPlayers.includes(color)) return // already ready

    const cell = board[pos.row]?.[pos.col]
    if (!cell) return

    // If we already have a selection, try to swap
    if (arrangingSelectedPiece) {
      const selectedCell = board[arrangingSelectedPiece.row]?.[arrangingSelectedPiece.col]
      if (selectedCell?.piece?.color === color) {
        // Check if the target is also in the same player's base
        const baseCells = getHomeBaseCells(color)
        const targetInBase = baseCells.some(b => posEq(b, pos))

        if (targetInBase) {
          // Swap the pieces (or move to empty slot)
          get().swapPieces(arrangingSelectedPiece, pos, color)
          return
        }
      }
      // Deselect if clicking outside base
      set({ arrangingSelectedPiece: null })
      return
    }

    // Select a piece in the player's base
    if (cell.piece && cell.piece.color === color) {
      const baseCells = getHomeBaseCells(color)
      const isInBase = baseCells.some(b => posEq(b, pos))
      if (isInBase) {
        set({ arrangingSelectedPiece: pos })
      }
    }
  },

  swapPieces: (pos1: Position, pos2: Position, color: PlayerColor) => {
    const { board, phase } = get()
    if (phase !== 'arranging') return

    // Verify both positions are in the player's base
    const baseCells = getHomeBaseCells(color)
    if (!baseCells.some(b => posEq(b, pos1)) || !baseCells.some(b => posEq(b, pos2))) return

    // Deep clone board
    const newBoard = board.map(row => row.map(cell => ({ ...cell, piece: cell.piece ? { ...cell.piece } : null })))

    const piece1 = newBoard[pos1.row][pos1.col].piece
    const piece2 = newBoard[pos2.row][pos2.col].piece

    // At least one must be a piece of the correct color
    if (!piece1 || piece1.color !== color) return
    // piece2 can be null (moving to empty slot) or same color
    if (piece2 && piece2.color !== color) return

    // Swap
    if (piece1) {
      newBoard[pos1.row][pos1.col].piece = piece2 ? { ...piece2, position: pos1 } : null
    }
    newBoard[pos2.row][pos2.col].piece = { ...piece1, position: pos2 }
    if (piece2) {
      newBoard[pos1.row][pos1.col].piece = { ...piece2, position: pos1 }
    } else {
      newBoard[pos1.row][pos1.col].piece = null
    }

    set({ board: newBoard, arrangingSelectedPiece: null })
  },

  markReady: (color: PlayerColor) => {
    const { readyPlayers, players } = get()
    if (readyPlayers.includes(color)) return

    const newReady = [...readyPlayers, color]
    const activePlayers = players.map(p => p.color)

    // Check if all players are ready
    const allReady = activePlayers.every(c => newReady.includes(c))

    if (allReady) {
      set({
        readyPlayers: newReady,
        phase: 'playing',
        arrangingSelectedPiece: null,
        arrangingCurrentPlayer: null,
      })
    } else {
      // Move to next player who isn't ready (local mode)
      const nextArranging = activePlayers.find(c => !newReady.includes(c)) ?? null
      set({
        readyPlayers: newReady,
        arrangingSelectedPiece: null,
        arrangingCurrentPlayer: nextArranging,
      })
    }
  },

  // ─── Gameplay actions ────────────────────────────────────────────────────────

  selectPiece: (pos: Position) => {
    const { board, currentTurn, phase, selectedPiece, currentPath } = get()

    if (phase !== 'playing') return

    // If we're mid-chain and click a valid jump destination, continue the chain
    if (currentPath.length > 0) {
      const options = get()._currentMoveOptions
      const option = options.find(o => posEq(o.to, pos))
      if (option && option.isJump) {
        get().applyMoveOption(option)
        return
      }
      // Click elsewhere during chain = ignore
      return
    }

    const cell = board[pos.row]?.[pos.col]
    if (!cell) return

    const piece = cell.piece

    // Clicking own piece
    if (piece && piece.color === currentTurn) {
      if (selectedPiece && posEq(selectedPiece, pos)) {
        // Deselect
        set({ selectedPiece: null, validMoves: [], validJumps: [], _currentMoveOptions: [] })
        return
      }

      // Select new piece
      const allMoves = getAllMoves(piece, board)
      const validMoves = allMoves.filter(m => !m.isJump).map(m => m.to)
      const validJumps = allMoves.filter(m => m.isJump).map(m => m.to)

      set({
        selectedPiece: pos,
        validMoves,
        validJumps,
        _currentMoveOptions: allMoves,
        currentPath: [],
        pathJumpedOver: [],
        _pathJumpedOverSets: [],
      })
      return
    }

    // Clicking a valid move destination
    if (selectedPiece) {
      const options = get()._currentMoveOptions
      const option = options.find(o => posEq(o.to, pos))
      if (option) {
        get().applyMoveOption(option)
      }
    }
  },

  applyMoveOption: (option: MoveOption) => {
    const { board, selectedPiece, currentPath, currentTurn, _pathJumpedOverSets, pathJumpedOver } = get()
    if (!selectedPiece) return

    const newPath = currentPath.length === 0 ? [selectedPiece, option.to] : [...currentPath, option.to]

    const jumpedOver = option.jumpedOver ?? []
    const newJumpedOverSets = [..._pathJumpedOverSets, jumpedOver]
    const newPathJumpedOver = [...pathJumpedOver, jumpedOver]

    if (!option.isJump) {
      // Normal 1-step move — apply immediately, no confirmation needed
      const { newBoard, capturedCircles } = applyMove(board, [selectedPiece, option.to], currentTurn, [])

      const didWin = checkWin(newBoard, currentTurn)

      if (capturedCircles.length > 0) {
        set({
          board: newBoard,
          phase: 'circle-return',
          capturedCircleEvent: capturedCircles[0],
          _pendingCapturedCircles: capturedCircles.slice(1),
          lastMove: { from: selectedPiece, path: [selectedPiece, option.to], color: currentTurn },
          selectedPiece: null,
          validMoves: [],
          validJumps: [],
          currentPath: [],
          pathJumpedOver: [],
          _currentMoveOptions: [],
          _pathJumpedOverSets: [],
          winner: didWin ? currentTurn : null,
        })
      } else {
        const { players, currentTurn: ct } = get()
        const nextTurn = getNextTurn(players, ct)
        set({
          board: newBoard,
          phase: didWin ? 'finished' : 'playing',
          winner: didWin ? currentTurn : null,
          currentTurn: didWin ? ct : nextTurn,
          lastMove: { from: selectedPiece, path: [selectedPiece, option.to], color: ct },
          selectedPiece: null,
          validMoves: [],
          validJumps: [],
          currentPath: [],
          pathJumpedOver: [],
          _currentMoveOptions: [],
          _pathJumpedOverSets: [],
          capturedCircleEvent: null,
        })
      }
      return
    }

    // Jump — add to chain, compute continuation jumps
    // Temporarily move the piece for continuation calculation
    const tempBoard = board.map(row => row.map(cell => ({ ...cell, piece: cell.piece ? { ...cell.piece } : null })))
    const origPiece = getPiece(board, selectedPiece)!
    tempBoard[selectedPiece.row][selectedPiece.col] = { ...tempBoard[selectedPiece.row][selectedPiece.col], piece: null }
    const tempPiece: typeof origPiece = { ...origPiece, position: option.to }
    tempBoard[option.to.row][option.to.col] = { ...tempBoard[option.to.row][option.to.col], piece: tempPiece }

    const continuations = getContinuationJumps(tempPiece, tempBoard, newPath)

    set({
      currentPath: newPath,
      pathJumpedOver: newPathJumpedOver,
      _pathJumpedOverSets: newJumpedOverSets,
      validMoves: [],
      validJumps: continuations.map(c => c.to),
      _currentMoveOptions: continuations,
    })
  },

  undoLastStep: () => {
    const { currentPath, pathJumpedOver, _pathJumpedOverSets, selectedPiece, board } = get()

    if (currentPath.length <= 1) {
      // Undo the initial piece selection
      set({
        selectedPiece: null,
        validMoves: [],
        validJumps: [],
        currentPath: [],
        pathJumpedOver: [],
        _currentMoveOptions: [],
        _pathJumpedOverSets: [],
      })
      return
    }

    // Remove last step from chain
    const newPath = currentPath.slice(0, -1)
    const newJumpedOverSets = _pathJumpedOverSets.slice(0, -1)
    const newPathJumpedOver = pathJumpedOver.slice(0, -1)

    const lastPos = newPath[newPath.length - 1]

    // Recompute temp board state at previous position
    const piece = getPiece(board, selectedPiece!)!
    const tempBoard = board.map(row => row.map(cell => ({ ...cell, piece: cell.piece ? { ...cell.piece } : null })))
    tempBoard[selectedPiece!.row][selectedPiece!.col] = { ...tempBoard[selectedPiece!.row][selectedPiece!.col], piece: null }
    const tempPiece = { ...piece, position: lastPos }
    tempBoard[lastPos.row][lastPos.col] = { ...tempBoard[lastPos.row][lastPos.col], piece: tempPiece }

    const continuations = getContinuationJumps(tempPiece, tempBoard, newPath)

    set({
      currentPath: newPath,
      pathJumpedOver: newPathJumpedOver,
      _pathJumpedOverSets: newJumpedOverSets,
      validJumps: continuations.map(c => c.to),
      _currentMoveOptions: continuations,
    })
  },

  confirmMove: () => {
    const { board, selectedPiece, currentPath, currentTurn, _pathJumpedOverSets, players } = get()
    if (!selectedPiece || currentPath.length < 2) return

    const { newBoard, capturedCircles } = applyMove(board, currentPath, currentTurn, _pathJumpedOverSets)
    const didWin = checkWin(newBoard, currentTurn)

    if (capturedCircles.length > 0) {
      set({
        board: newBoard,
        phase: 'circle-return',
        capturedCircleEvent: capturedCircles[0],
        _pendingCapturedCircles: capturedCircles.slice(1),
        lastMove: { from: selectedPiece, path: currentPath, color: currentTurn },
        selectedPiece: null,
        validMoves: [],
        validJumps: [],
        currentPath: [],
        pathJumpedOver: [],
        _currentMoveOptions: [],
        _pathJumpedOverSets: [],
        winner: didWin ? currentTurn : null,
      })
    } else {
      const nextTurn = getNextTurn(players, currentTurn)
      set({
        board: newBoard,
        phase: didWin ? 'finished' : 'playing',
        winner: didWin ? currentTurn : null,
        currentTurn: didWin ? currentTurn : nextTurn,
        lastMove: { from: selectedPiece, path: currentPath, color: currentTurn },
        selectedPiece: null,
        validMoves: [],
        validJumps: [],
        currentPath: [],
        pathJumpedOver: [],
        _currentMoveOptions: [],
        _pathJumpedOverSets: [],
        capturedCircleEvent: null,
      })
    }
  },

  placeReturnedCircle: (pos: Position) => {
    const { board, capturedCircleEvent, _pendingCapturedCircles, currentTurn, players, lastMove } = get()
    if (!capturedCircleEvent) return

    // Verify pos is a valid empty home base slot for the circle's owner
    const emptySlots = getEmptyHomeBaseSlots(board, capturedCircleEvent.piece.color)
    if (!emptySlots.some(s => posEq(s, pos))) return

    const newBoard = placeCircleAtBase(board, capturedCircleEvent.piece, pos)

    if (_pendingCapturedCircles.length > 0) {
      // More circles to place
      set({
        board: newBoard,
        capturedCircleEvent: _pendingCapturedCircles[0],
        _pendingCapturedCircles: _pendingCapturedCircles.slice(1),
      })
    } else {
      // Done with circle returns — check win and advance turn
      const movingColor = lastMove?.color ?? currentTurn
      const didWin = checkWin(newBoard, movingColor)
      const nextTurn = getNextTurn(players, movingColor)
      set({
        board: newBoard,
        phase: didWin ? 'finished' : 'playing',
        winner: didWin ? movingColor : null,
        currentTurn: didWin ? movingColor : nextTurn,
        capturedCircleEvent: null,
        _pendingCapturedCircles: [],
      })
    }
  },
}))
