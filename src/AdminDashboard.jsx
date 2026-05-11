import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'

export default function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  
  // === 出題狀態 ===
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState('')
  
  // === 大廳與房間狀態 ===
  const [bankQuestions, setBankQuestions] = useState([])
  const [selectedQuestionId, setSelectedQuestionId] = useState('')
  const [activeRoomPin, setActiveRoomPin] = useState(null)
  const [roomStatus, setRoomStatus] = useState('none') // 'none', 'lobby', 'playing'
  const [players, setPlayers] = useState([])

  // 抓取題庫
  useEffect(() => {
    if (activeTab === 'dashboard') {
      const fetchQuestions = async () => {
        const { data } = await supabase.from('questions').select('*').eq('room_pin', 'bank')
        if (data) setBankQuestions(data)
      }
      fetchQuestions()
    }
  }, [activeTab])

  // 監聽玩家與房間關閉
  useEffect(() => {
    if (activeRoomPin) {
      const playerSub = supabase.channel('host-lobby')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players', filter: `room_pin=eq.${activeRoomPin}` }, (payload) => {
          setPlayers(prev => [...prev, payload.new])
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'players', filter: `room_pin=eq.${activeRoomPin}` }, (payload) => {
          setPlayers(prev => prev.filter(p => p.id !== payload.old.id))
        })
        .subscribe()

      const handleUnload = () => {
        supabase.from('rooms').delete().eq('pin', activeRoomPin).then()
        supabase.from('players').delete().eq('room_pin', activeRoomPin).then()
      }
      window.addEventListener('beforeunload', handleUnload)

      return () => {
        supabase.removeChannel(playerSub)
        window.removeEventListener('beforeunload', handleUnload)
      }
    }
  }, [activeRoomPin])

  // 儲存新題目到題庫
  const handleSaveQuestion = async () => {
    if (!title.trim() || options.some(opt => !opt.trim()) || !correctAnswer) {
      alert('請填寫完整題目、四個選項，並選擇正確答案！')
      return
    }
    const { error } = await supabase.from('questions').insert([{ room_pin: 'bank', title, options, correct_answer: correctAnswer }])
    if (!error) {
      alert('題目儲存成功！')
      setTitle('')
      setOptions(['', '', '', ''])
      setCorrectAnswer('')
    } else {
      alert('儲存失敗，請重試！')
    }
  }

  // 建立房間
  const handleCreateRoom = async () => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString()
    const { error: roomError } = await supabase.from('rooms').insert([{ pin: newPin, status: 'waiting', current_question: 1 }])
    
    const targetQ = bankQuestions.find(q => q.id.toString() === selectedQuestionId)
    const { error: qError } = await supabase.from('questions').insert([{ room_pin: newPin, title: targetQ.title, options: targetQ.options, correct_answer: targetQ.correct_answer }])

    if (!roomError && !qError) {
      setActiveRoomPin(newPin)
      setRoomStatus('lobby')
      setPlayers([])
    }
  }

  // 開始遊戲
  const handleStartGame = async () => {
    const { error } = await supabase.from('rooms').update({ status: 'playing' }).eq('pin', activeRoomPin)
    if (!error) setRoomStatus('playing')
  }

  // 選項輸入處理
  const handleOptionChange = (index, value) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      {/* 導覽列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
        <h2>Level 1 控制台</h2>
        <div>
          <button onClick={() => setActiveTab('dashboard')} style={navButtonStyle(activeTab === 'dashboard')}>首頁</button>
          <button onClick={() => setActiveTab('create')} style={navButtonStyle(activeTab === 'create')}>出題</button>
          <button onClick={onLogout} style={{ ...navButtonStyle(false), backgroundColor: '#ff4d4f', color: 'white', borderColor: '#ff4d4f' }}>登出</button>
        </div>
      </div>

      {/* 頁籤：首頁 (大廳管理) */}
      {activeTab === 'dashboard' && (
        <div>
          {roomStatus === 'none' && (
            <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
              <h3>建立新遊戲</h3>
              <select value={selectedQuestionId} onChange={e => setSelectedQuestionId(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '20px' }}>
                <option value="">-- 請先選擇要測驗的題目 --</option>
                {bankQuestions.map(q => <option key={q.id} value={q.id.toString()}>{q.title}</option>)}
              </select>
              <button 
                onClick={handleCreateRoom} 
                disabled={!selectedQuestionId}
                style={{ width: '100%', padding: '15px', fontSize: '18px', color: 'white', border: 'none', borderRadius: '8px', cursor: selectedQuestionId ? 'pointer' : 'not-allowed', backgroundColor: selectedQuestionId ? '#28a745' : '#ccc' }}>
                建立房間
              </button>
            </div>
          )}

          {roomStatus === 'lobby' && (
            <div style={{ border: '2px solid #ccc', padding: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9', textAlign: 'center' }}>
              <h2>房間已建立！請玩家加入</h2>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '30px 0' }}>
                <div>
                  <p style={{ margin: 0, color: '#666' }}>遊戲 PIN 碼</p>
                  <h1 style={{ fontSize: '64px', color: '#0a42cf', margin: '10px 0' }}>{activeRoomPin}</h1>
                  <p>連結: <a href="https://princehuang1.github.io/linktset/" target="_blank" rel="noreferrer">https://princehuang1.github.io/linktset/</a></p>
                </div>
                <div style={{ padding: '10px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px' }}>
                  <QRCodeCanvas value="https://princehuang1.github.io/linktset/" size={150} />
                </div>
              </div>

              <div style={{ backgroundColor: '#eee', padding: '15px', borderRadius: '8px', minHeight: '100px' }}>
                <h4>已加入的玩家 ({players.length})：</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                  {players.length === 0 ? <span style={{ color: '#888' }}>等待中...</span> : 
                    players.map(p => <span key={p.id} style={{ backgroundColor: '#333', color: 'white', padding: '5px 15px', borderRadius: '20px' }}>{p.nickname}</span>)
                  }
                </div>
              </div>

              <button onClick={handleStartGame} style={{ padding: '15px 40px', fontSize: '24px', backgroundColor: '#e21b3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '30px', width: '100%', fontWeight: 'bold' }}>
                開始遊戲！
              </button>
            </div>
          )}

          {roomStatus === 'playing' && (
            <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#2d0b27', color: 'white', borderRadius: '8px' }}>
              <h2 style={{ color: '#aaa' }}>目前正在進行中的題目：</h2>
              <h1 style={{ fontSize: '48px', marginTop: '20px' }}>
                {bankQuestions.find(q => q.id.toString() === selectedQuestionId)?.title}
              </h1>
            </div>
          )}
        </div>
      )}

      {/* 頁籤：出題表單 (補回來了！) */}
      {activeTab === 'create' && (
        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
          <h3>新增題目</h3>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>題目內容：</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} 
              placeholder="請輸入題目" 
            />
          </div>
          
          <div style={{ marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {options.map((opt, idx) => (
              <div key={idx}>
                <label style={{ display: 'block', marginBottom: '5px' }}>選項 {idx + 1}：</label>
                <input 
                  type="text" 
                  value={opt} 
                  onChange={e => handleOptionChange(idx, e.target.value)} 
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} 
                />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>設定正確答案：</label>
            <select 
              value={correctAnswer} 
              onChange={e => setCorrectAnswer(e.target.value)} 
              style={{ padding: '8px', width: '100%' }}
            >
              <option value="">-- 請選擇正確解答 --</option>
              {options.map((opt, idx) => (
                opt.trim() !== '' && <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <button onClick={handleSaveQuestion} style={{ padding: '10px 20px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            儲存placeholder目
          </button>
        </div>
      )}
    </div>
  )
}

const navButtonStyle = (isActive) => ({
  padding: '8px 16px',
  marginLeft: '10px',
  cursor: 'pointer',
  backgroundColor: isActive ? '#0a42cf' : 'white',
  color: isActive ? 'white' : '#333',
  border: '1px solid #0a42cf',
  borderRadius: '4px'
})