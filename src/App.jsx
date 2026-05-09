// 1. 改引入 HashRouter
import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './Home'
import Room from './Room'
import Admin from './Admin'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:pin" element={<Room />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </HashRouter>
  )
}

export default App