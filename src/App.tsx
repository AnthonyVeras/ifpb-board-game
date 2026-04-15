import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { SetupPage } from './pages/SetupPage'
import { GamePage } from './pages/GamePage'
import { LobbyPage } from './pages/LobbyPage'
import { RulesPage } from './pages/RulesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/lobby/:roomCode" element={<LobbyPage />} />
        <Route path="/rules" element={<RulesPage />} />
      </Routes>
    </BrowserRouter>
  )
}
