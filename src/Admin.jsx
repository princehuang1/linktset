import { useState } from 'react'
import AdminDashboard from './AdminDashboard' 

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [password, setPassword] = useState('')

  const handleLogin = () => {
    if (password === 'testb1229031') {
      setIsLoggedIn(true)
    } else {
      alert('密碼錯誤！')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      handleLogin()
    }
  }

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a42cf', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '4px', width: '320px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '25px', fontSize: '24px', fontWeight: 'bold' }}>後台管理系統</h1>
          <input
            type="password"
            placeholder="請輸入密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ width: '100%', padding: '12px', marginBottom: '15px', border: '2px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', fontSize: '16px', textAlign: 'center' }}
          />
          <button
            onClick={handleLogin}
            style={{ width: '100%', padding: '12px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
          >
            登入
          </button>
        </div>
      </div>
    )
  }

  return <AdminDashboard onLogout={() => setIsLoggedIn(false)} />
}