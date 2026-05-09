import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function Home() {
  const [pin, setPin] = useState('')
  const [nickname, setNickname] = useState('')
  const navigate = useNavigate()

  const handleJoin = async () => {
    if (!pin.trim() || !nickname.trim()) {
      alert('請輸入 PIN 碼和暱稱！')
      return
    }

    // 1. 將玩家寫入 Supabase 資料庫
    const { data, error } = await supabase
      .from('players')
      .insert([{ room_pin: pin, nickname: nickname, score: 0 }])
      .select()

    if (error) {
      console.error('加入失敗:', error)
      alert('加入失敗，請確認 PIN 碼是否正確')
    } else {
      // 2. 成功後，跳轉到房間頁面
      navigate(`/room/${pin}`, { state: { nickname: nickname } })
    }
  }

  return (
    // 經典的紫色背景
    <div style={{ minHeight: '100vh', backgroundColor: '#46178f', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
      
      {/* 標題 Logo */}
      <h1 style={{ color: 'white', fontSize: '64px', fontWeight: 'bold', marginBottom: '30px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
        Link!
      </h1>

      {/* 白色輸入卡片 */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '4px', width: '300px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
        <input
          type="text"
          placeholder="遊戲 PIN 碼"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{ width: '100%', padding: '15px', marginBottom: '10px', border: '2px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', fontSize: '18px', textAlign: 'center', fontWeight: 'bold' }}
        />
        <input
          type="text"
          placeholder="輸入您的暱稱"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          style={{ width: '100%', padding: '15px', marginBottom: '15px', border: '2px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', fontSize: '18px', textAlign: 'center', fontWeight: 'bold' }}
        />
        <button
          onClick={handleJoin}
          style={{ width: '100%', padding: '15px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}
        >
          輸入
        </button>
      </div>
    </div>
  )
}