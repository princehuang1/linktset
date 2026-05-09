import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

// 設定 Kahoot 風格的四個顏色與標籤
const optionColors = ['#e21b3c', '#1368ce', '#d89e00', '#26890c']
const optionLabels = ['[A]', '[B]', '[C]', '[D]']

export default function Room() {
  const { pin } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  // 從 Home.jsx 傳過來的資料 (如果有直接改網址進來的，會給預設值)
  const nickname = location.state?.nickname || '訪客'
  const playerId = location.state?.playerId 

  // 狀態管理
  const [roomStatus, setRoomStatus] = useState('waiting')
  const [players, setPlayers] = useState([])
  const [question, setQuestion] = useState(null)
  
  // 答題狀態
  const [hasAnswered, setHasAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(null)

  // 1. 初始化與即時監聽房間/玩家變動
  useEffect(() => {
    // 初始抓取房間狀態與玩家名單
    const initRoom = async () => {
      const { data: roomData } = await supabase.from('rooms').select('status').eq('pin', pin).single()
      if (roomData) {
        setRoomStatus(roomData.status)
      } else {
        alert('找不到此房間！')
        navigate('/') // 房間不存在就回首頁
      }

      const { data: playersData } = await supabase.from('players').select('*').eq('room_pin', pin)
      if (playersData) setPlayers(playersData)
    }
    initRoom()

    // 監聽玩家加入與「離開 (DELETE)」
    const playerSub = supabase.channel('room-players')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players', filter: `room_pin=eq.${pin}` }, (payload) => {
        setPlayers((current) => [...current, payload.new])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'players', filter: `room_pin=eq.${pin}` }, (payload) => {
        // 瞬間移除離開的幽靈玩家
        setPlayers((current) => current.filter(p => p.id !== payload.old.id))
      })
      .subscribe()

    // 監聽房間狀態更新與「房主關閉房間 (DELETE)」
    const roomSub = supabase.channel('room-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `pin=eq.${pin}` }, (payload) => {
        setRoomStatus(payload.new.status)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms', filter: `pin=eq.${pin}` }, () => {
        alert('房主已關閉遊戲房間！')
        navigate('/') // 房主關視窗，踢所有玩家回首頁
      })
      .subscribe()

    // 當此玩家關閉瀏覽器視窗時，從資料庫刪除自己
    const handleUnload = () => {
      if (playerId) supabase.from('players').delete().eq('id', playerId).then()
    }
    window.addEventListener('beforeunload', handleUnload)

    // 清理監聽器
    return () => { 
      supabase.removeChannel(playerSub)
      supabase.removeChannel(roomSub)
      window.removeEventListener('beforeunload', handleUnload)
      // 如果元件卸載 (例如按上一頁)，也主動刪除玩家
      if (playerId) supabase.from('players').delete().eq('id', playerId).then()
    }
  }, [pin, playerId, navigate])

  // 2. 當狀態變成 playing 時，去資料庫撈這間房間的題目
  useEffect(() => {
    if (roomStatus === 'playing') {
      const fetchQuestion = async () => {
        // 抓取綁定在這個房間 PIN 碼的題目
        const { data } = await supabase.from('questions').select('*').eq('room_pin', pin).single()
        if (data) setQuestion(data)
      }
      fetchQuestion()
    }
  }, [roomStatus, pin])

  // 3. 處理玩家送出答案
  const handleAnswer = async (selectedOption) => {
    if (hasAnswered || !question) return // 防呆：避免重複作答

    const correct = (selectedOption === question.correct_answer)
    setIsCorrect(correct)
    setHasAnswered(true) // 切換到等待結果畫面

    if (correct && playerId) {
      // 答對了！去資料庫幫這個玩家加 100 分 (這裡改用 playerId 去精準更新)
      const { data: playerData } = await supabase.from('players').select('score').eq('id', playerId).single()
      if (playerData) {
        await supabase.from('players').update({ score: playerData.score + 100 }).eq('id', playerId)
      }
    }
  }

  // ==============================
  // 畫面 1：大廳等待畫面
  // ==============================
  if (roomStatus === 'waiting') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#111', color: 'white', padding: '40px', fontFamily: 'sans-serif' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>您已進入房間：{pin}</h2>
        <h3 style={{ textAlign: 'center', color: '#aaa' }}>等待房主開始遊戲...</h3>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center', marginTop: '50px' }}>
          {players.map((p) => (
            <div key={p.id} style={{ padding: '10px 20px', backgroundColor: '#333', borderRadius: '20px', fontSize: '20px', fontWeight: 'bold' }}>
              {p.nickname}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ==============================
  // 畫面 2：答題後的等待結果畫面
  // ==============================
  if (hasAnswered) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: isCorrect ? '#26890c' : '#e21b3c', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
          {isCorrect ? '答對了！ +100分 🎉' : '答錯了！ 😢'}
        </h1>
        <p style={{ fontSize: '24px' }}>請看大螢幕，等待房主切換下一題...</p>
      </div>
    )
  }

  // ==============================
  // 畫面 3：四宮格真實答題畫面
  // ==============================
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', margin: 0 }}>
      
      {/* 上半部：預留的黑色區域 */}
      <div style={{ flex: '1', backgroundColor: '#111', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#555' }}>
        (未來預留區域：圖片或影片)
      </div>

      {/* 下半部：答題區域 */}
      <div style={{ flex: '1', backgroundColor: '#5c164e', display: 'flex', flexDirection: 'column', padding: '15px 20px' }}>
        
        {/* 頂部資訊列 */}
        <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', fontStyle: 'italic', textDecoration: 'underline', marginBottom: '15px' }}>
          Math Quiz. 1
        </div>

        {/* 動態顯示題目內容 */}
        <div style={{ backgroundColor: '#2d0b27', color: 'white', padding: '30px', textAlign: 'center', fontSize: '28px', fontWeight: 'bold', borderRadius: '4px', marginBottom: '15px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }}>
          {question ? question.title : '載入題目中...'}
        </div>

        {/* 動態渲染四個選項 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '8px', flex: '1' }}>
          {question?.options.map((opt, idx) => (
            <button 
              key={idx} 
              onClick={() => handleAnswer(opt)}
              style={{ backgroundColor: optionColors[idx], color: 'white', fontSize: '22px', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              {optionLabels[idx]} {opt}
            </button>
          ))}
        </div>
      </div>
      
    </div>
  )
}