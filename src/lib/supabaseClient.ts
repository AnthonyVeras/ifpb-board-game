import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

// Lazy singleton — only created when actually needed (avoids crash when env vars are missing)
let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  return _supabase
}

export function isSupabaseConfigured(): boolean {
  return supabaseUrl.length > 0 && supabaseAnonKey.length > 0
}

// Generate a unique player ID for this browser session
export function getPlayerId(): string {
  let id = sessionStorage.getItem('ifpb_player_id')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('ifpb_player_id', id)
  }
  return id
}

// Generate a random 6-character room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I, O, 0, 1 to avoid confusion
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Create/join a Supabase Realtime channel for a room
export function getRoomChannel(roomCode: string): RealtimeChannel {
  return getSupabase().channel(`room:${roomCode}`, {
    config: {
      broadcast: { self: false }, // don't receive own broadcasts
      presence: { key: getPlayerId() },
    },
  })
}
