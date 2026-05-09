import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [activeRoomPin, setActiveRoomPin] = useState(null)
  
  const [bankQuestions, setBankQuestions] = useState([])
  const [selectedQuestionId, setSelectedQuestionId] = useState('')

  useEffect(() => {
    if (activeTab === 'dashboard') {
      const fetchQuestions = async () => {
        const { data } = await supabase.from('questions').select('*').eq('room_pin', 'bank')
        if (data) setBankQuestions(data)
      }
      fetchQuestions()
    }
  }, [activeTab])

  const handleOptionChange = (index, value) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

 const handleSaveQuestion = async () => {
    if (!title.trim() || options.some(opt => !opt.trim()) || !correctAnswer) {
      alert('請填寫完整！') 
      return 
    }
    
    const { error } = await supabase.from('questions').insert([{ room_pin: 'bank', title, options, correct_answer: correctAnswer }])
    
    if (!error) {
      alert('題目儲存成功！')
      setTitle('')
      setOptions(['', '', '', ''])
      setCorrectAnswer('')
    } else {
      alert('儲存失敗！')
    }
  }

  const handleCreateRoom = async () => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString()
    const { error: roomError } = await supabase.from('rooms').insert([{ pin: newPin, status: 'waiting', current_question: 1 }])
    
    const targetQ = bankQuestions.find(q => q.id.toString() === selectedQuestionId)
    const { error: qError } = await supabase.from('questions').insert([{ room_pin: newPin, title: targetQ.title, options: targetQ.options, correct_answer: targetQ.correct_answer }])

    if (!roomError && !qError) setActiveRoomPin(newPin)
  }

  const handleStartGame = async () => {
    const { error } = await supabase.from('rooms').update({ status: 'playing' }).eq('pin', activeRoomPin)
    if (!error) alert('遊戲已開始！')
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
        <h2>Level 1 控制台</h2>
        <div>
          <button onClick={() => setActiveTab('dashboard')} style={navButtonStyle(activeTab === 'dashboard')}>首頁</button>
          <button onClick={() => setActiveTab('create')} style={navButtonStyle(activeTab === 'create')}>出題</button>
          <button onClick={onLogout} style={{ ...navButtonStyle(false), backgroundColor: '#ff4d4f', color: 'white', borderColor: '#ff4d4f' }}>登出</button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div>
          <h3>遊戲大廳管理</h3>
          {!activeRoomPin ? (
            <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
              <select value={selectedQuestionId} onChange={e => setSelectedQuestionId(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '20px' }}>
                <option value="">-- 請先選擇要測驗的題目 --</option>
                {bankQuestions.map(q => <option key={q.id} value={q.id.toString()}>{q.title}</option>)}
              </select>
              <button 
                onClick={handleCreateRoom} 
                disabled={!selectedQuestionId}
                style={{ width: '100%', padding: '15px', fontSize: '18px', color: 'white', border: 'none', borderRadius: '8px', cursor: selectedQuestionId ? 'pointer' : 'not-allowed', backgroundColor: selectedQuestionId ? '#28a745' : '#ccc' }}>
                建立新遊戲房間
              </button>
            </div>
          ) : (
            <div style={{ border: '2px solid #ccc', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
              <h1 style={{ fontSize: '48px', color: '#0a42cf' }}>PIN 碼: {activeRoomPin}</h1>
              <button onClick={handleStartGame} style={{ padding: '15px 40px', fontSize: '24px', backgroundColor: '#e21b3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '20px' }}>
                開始遊戲！
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
          {/* ... (出題表單，內容跟之前一樣，為了版面簡潔省略部分細節) ... */}
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="題目" style={{ width: '100%', padding: '8px', marginBottom: '15px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
            {options.map((opt, idx) => <input key={idx} type="text" value={opt} onChange={e => handleOptionChange(idx, e.target.value)} placeholder={`選項 ${idx + 1}`} style={{ padding: '8px' }} />)}
          </div>
          <select value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px' }}>
            <option value="">-- 請選擇正確解答 --</option>
            {options.map((opt, idx) => opt.trim() !== '' && <option key={idx} value={opt}>{opt}</option>)}
          </select>
          <button onClick={handleSaveQuestion} style={{ padding: '10px 20px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>儲存題目</button>
        </div>
      )}
    </div>
  )
}

const navButtonStyle = (isActive) => ({ padding: '8px 16px', marginLeft: '10px', cursor: 'pointer', backgroundColor: isActive ? '#0a42cf' : 'white', color: isActive ? 'white' : '#333', border: '1px solid #0a42cf', borderRadius: '4px' })