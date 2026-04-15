import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

const HomePage = lazy(async () => ({ default: (await import('./pages/HomePage')).HomePage }))
const SetupPage = lazy(async () => ({ default: (await import('./pages/SetupPage')).SetupPage }))
const GamePage = lazy(async () => ({ default: (await import('./pages/GamePage')).GamePage }))
const LobbyPage = lazy(async () => ({ default: (await import('./pages/LobbyPage')).LobbyPage }))
const RulesPage = lazy(async () => ({ default: (await import('./pages/RulesPage')).RulesPage }))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/lobby/:roomCode" element={<LobbyPage />} />
          <Route path="/rules" element={<RulesPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
