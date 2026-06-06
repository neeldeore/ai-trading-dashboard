import { useState, useEffect, useRef } from 'react'

const API = 'https://ai-trading-dashboard-backend-vh7n.onrender.com'

const colors = {
  bg: '#0a0a0a',
  card: '#141414',
  border: '#222',
  cyan: '#00bcd4',
  green: '#4caf50',
  red: '#f44336',
  text: '#ffffff',
  muted: '#888',
}

const QUICK_QUESTIONS = [
  "Should I sell any stocks?",
  "How is my portfolio doing?",
  "What should I buy next?",
  "Analyze my holdings",
  "Am I diversified enough?",
]

function AIChatPanel({ onClose, email }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I'm your AI trading assistant. I have access to your portfolio data and can help you make better investment decisions. What would you like to know?"
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function sendMessage(text) {
    const messageText = text || input
    if (!messageText.trim()) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: messageText }])
    setLoading(true)
    fetch(`${API}/chat?message=${encodeURIComponent(messageText)}&email=${email}`, {
      method: 'POST'
    })
      .then(res => res.json())
      .then(data => {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])
        setLoading(false)
      })
      .catch(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: "Sorry, I couldn't connect. Please try again."
        }])
        setLoading(false)
      })
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0,
      width: '380px', height: '100%',
      backgroundColor: colors.card,
      borderLeft: `1px solid ${colors.border}`,
      zIndex: 200,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#0d0d0d',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🤖</span>
          <div>
            <p style={{ margin: 0, fontWeight: 'bold', color: colors.text }}>AI Assistant</p>
            <p style={{ margin: 0, fontSize: '12px', color: colors.green }}>● Online</p>
          </div>
        </div>
        <button onClick={onClose} style={{
          backgroundColor: 'transparent', border: 'none',
          color: colors.muted, cursor: 'pointer', fontSize: '20px',
        }}>✕</button>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '12px',
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              backgroundColor: msg.role === 'user' ? colors.cyan : '#1a1a1a',
              color: msg.role === 'user' ? 'black' : colors.text,
              fontSize: '14px', lineHeight: '1.5',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
              backgroundColor: '#1a1a1a', color: colors.muted, fontSize: '14px',
            }}>
              🤖 Analyzing your portfolio...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 16px', borderTop: `1px solid ${colors.border}` }}>
        <div style={{
          display: 'flex', gap: '8px', marginBottom: '10px',
          overflowX: 'auto', paddingBottom: '4px',
        }}>
          {QUICK_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              style={{
                padding: '6px 12px', whiteSpace: 'nowrap',
                backgroundColor: 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: '16px', color: colors.muted,
                cursor: 'pointer', fontSize: '12px',
              }}
            >{q}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about your portfolio..."
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '20px',
              border: `1px solid ${colors.border}`,
              backgroundColor: '#0d0d0d', color: colors.text,
              fontSize: '14px', outline: 'none',
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading}
            style={{
              padding: '10px 16px', backgroundColor: colors.cyan,
              border: 'none', borderRadius: '20px',
              color: 'black', fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >Send</button>
        </div>
      </div>
    </div>
  )
}

export default AIChatPanel