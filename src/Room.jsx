import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { supabase } from './supabaseClient'

// 設定 Kahoot 風格的四個顏色與標籤
const optionColors = ['#e21b3c', '#1368ce', '#d89e00', '#26890c']
const optionLabels = ['[A]', '[B]', '[C]', '[D]']

export default function Room() {
  const { pin } = useParams()
  const location = useLocation()
  const nickname = location.state?.nickname || '訪客'

  const [roomStatus, setRoomStatus] = useState('waiting')
  const [players, setPlayers] = useState([])
  const [question, setQuestion] = useState(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(null)

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data } = await supabase.from('players').select('*').eq('room_pin', pin)
      if (data) setPlayers(data)
    }
    fetchPlayers()

    const fetchRoomStatus = async () => {
      const { data } = await supabase.from('rooms').select('status').eq('pin', pin).single()
      if (data) setRoomStatus(data.status)
    }
    fetchRoomStatus()

    const playerSub = supabase.channel('players').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players', filter: `room_pin=eq.${pin}` }, (payload) => {
      setPlayers((current) => [...current, payload.new])
    }).subscribe()

    const roomSub = supabase.channel('rooms').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `pin=eq.${pin}` }, (payload) => {
      setRoomStatus(payload.new.status)
    }).subscribe()

    return () => { supabase.removeChannel(playerSub); supabase.removeChannel(roomSub) }
  }, [pin])

  // 當狀態變成 playing 時，去資料庫撈這間房間的題目
  useEffect(() => {
    if (roomStatus === 'playing') {
      const fetchQuestion = async () => {
        const { data } = await supabase.from('questions').select('*').eq('room_pin', pin).single()
        if (data) setQuestion(data)
      }
      fetchQuestion()
    }
  }, [roomStatus, pin])

  // 處理玩家送出答案
  const handleAnswer = async (selectedOption) => {
    if (hasAnswered || !question) return

    const correct = (selectedOption === question.correct_answer)
    setIsCorrect(correct)
    setHasAnswered(true)

    if (correct) {
      // 答對了！去資料庫幫這個玩家加 100 分
      const { data: playerData } = await supabase.from('players').select('id, score').eq('room_pin', pin).eq('nickname', nickname).single()
      if (playerData) {
        await supabase.from('players').update({ score: playerData.score + 100 }).eq('id', playerData.id)
      }
    }
  }

  // 畫面 1：大廳
  if (roomStatus === 'waiting') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#111', color: 'white', padding: '40px', fontFamily: 'sans-serif' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>您已進入房間：{pin}</h2>
        <h3 style={{ textAlign: 'center', color: '#aaa' }}>等待房主開始遊戲...</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center', marginTop: '50px' }}>
          {players.map((p, index) => <div key={index} style={{ padding: '10px 20px', backgroundColor: '#333', borderRadius: '20px', fontSize: '20px', fontWeight: 'bold' }}>{p.nickname}</div>)}
        </div>
      </div>
    )
  }

  // 畫面 2：答題後的等待結果畫面
  if (hasAnswered) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: isCorrect ? '#26890c' : '#e21b3c', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>{isCorrect ? '答對了！ +100分 🎉' : '答錯了！ 😢'}</h1>
        <p style={{ fontSize: '24px' }}>請看大螢幕，等待房主切換下一題...</p>
      </div>
    )
  }

  // 畫面 3：四宮格真實答題畫面
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', margin: 0 }}>
      <div style={{ flex: '1', backgroundColor: '#111', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#555' }}>
        (未來預留區域：圖片或影片)
      </div>
      <div style={{ flex: '1', backgroundColor: '#5c164e', display: 'flex', flexDirection: 'column', padding: '15px 20px' }}>
        <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', fontStyle: 'italic', textDecoration: 'underline', marginBottom: '15px' }}>
          Math Quiz. 1
        </div>
        
        {/* 動態顯示題目內容 */}
        <div style={{ backgroundColor: '#2d0b27', color: 'white', padding: '30px', textAlign: 'center', fontSize: '28px', fontWeight: 'bold', borderRadius: '4px', marginBottom: '15px' }}>
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