import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './Home'
import Room from './Room'
import Admin from './Admin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:pin" element={<Room />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App