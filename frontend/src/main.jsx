import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// ── Load ALL styles eagerly before any component renders ──
import './styles/variables.css'
import './styles/global.css'
import './styles/Groups.css'
import './styles/Friends.css'
import './components/layout/AppLayout.css'
import './pages/Dashboard.css'
import './pages/Transactions.css'
import './pages/Analytics.css'
import './pages/Goals.css'
import './pages/Settings.css'
import './pages/AIAssistant.css'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)