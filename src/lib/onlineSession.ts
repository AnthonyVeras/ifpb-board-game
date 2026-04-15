import type { OnlineRoomSession } from '../types'

const ONLINE_SESSION_KEY = 'ifpb_online_room_session'

export function loadOnlineRoomSession(): OnlineRoomSession | null {
  const raw = localStorage.getItem(ONLINE_SESSION_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as OnlineRoomSession
  } catch (error) {
    console.error('Failed to parse online room session:', error)
    localStorage.removeItem(ONLINE_SESSION_KEY)
    return null
  }
}

export function saveOnlineRoomSession(session: OnlineRoomSession): void {
  localStorage.setItem(ONLINE_SESSION_KEY, JSON.stringify(session))
}

export function clearOnlineRoomSession(): void {
  localStorage.removeItem(ONLINE_SESSION_KEY)
}
