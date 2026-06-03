import { useState } from 'react'

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

function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit() {
    setError('')
    if (!email || !password) {
      setError('Please fill all fields')
      return
    }
    if (mode === 'signup' && !name) {
      setError('Please enter your name')
      return
    }
    setLoading(true)

    if (mode === 'signup') {
      fetch(`http://localhost:8000/auth/signup?name=${name}&email=${email}&password=${password}`, {
        method: 'POST'
      })
        .then(res => res.json())
        .then(data => {
          setLoading(false)
          if (data.error) { setError(data.error); return }
          localStorage.setItem('user', JSON.stringify({ name: data.name, email: data.email }))
          onLoginSuccess({ name: data.name, email: data.email })
        })
    } else {
      fetch(`http://localhost:8000/auth/login?email=${email}&password=${password}`, {
        method: 'POST'
      })
        .then(res => res.json())
        .then(data => {
          setLoading(false)
          if (data.error) { setError(data.error); return }
          localStorage.setItem('user', JSON.stringify({ name: data.name, email: data.email }))
          onLoginSuccess({ name: data.name, email: data.email })
        })
    }
  }

  return (
    <div style={{
      backgroundColor: colors.bg,
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{
        backgroundColor: colors.card,
        borderRadius: '16px',
        padding: '40px',
        width: '400px',
        border: `1px solid ${colors.border}`,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontSize: '40px' }}>📈</span>
          <h1 style={{ color: colors.text, margin: '8px 0 4px', fontSize: '24px' }}>
            AI Trading Dashboard
          </h1>
          <p style={{ color: colors.muted, margin: 0, fontSize: '14px' }}>
            {mode === 'login' ? 'Welcome back! Please login.' : 'Create your account'}
          </p>
        </div>

        <div style={{
          display: 'flex',
          backgroundColor: '#0d0d0d',
          borderRadius: '8px',
          padding: '4px',
          marginBottom: '24px',
        }}>
          {['login', 'signup'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              style={{
                flex: 1, padding: '8px',
                backgroundColor: mode === m ? colors.cyan : 'transparent',
                border: 'none', borderRadius: '6px',
                color: mode === m ? 'black' : colors.muted,
                fontWeight: mode === m ? 'bold' : 'normal',
                cursor: 'pointer', fontSize: '14px',
                textTransform: 'capitalize',
              }}
            >{m === 'login' ? 'Login' : 'Sign Up'}</button>
          ))}
        </div>

        {mode === 'signup' && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 6px', color: colors.muted, fontSize: '13px' }}>Full Name</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                backgroundColor: '#0d0d0d', color: colors.text,
                fontSize: '14px', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <p style={{ margin: '0 0 6px', color: colors.muted, fontSize: '13px' }}>Email</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            style={{
              width: '100%', padding: '12px', borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              backgroundColor: '#0d0d0d', color: colors.text,
              fontSize: '14px', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <p style={{ margin: '0 0 6px', color: colors.muted, fontSize: '13px' }}>Password</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            style={{
              width: '100%', padding: '12px', borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              backgroundColor: '#0d0d0d', color: colors.text,
              fontSize: '14px', boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <div style={{
            backgroundColor: '#3a1a1a', borderRadius: '8px',
            padding: '12px', marginBottom: '16px',
            border: `1px solid ${colors.red}`,
          }}>
            <p style={{ margin: 0, color: colors.red, fontSize: '13px' }}>⚠️ {error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            backgroundColor: colors.cyan,
            border: 'none', borderRadius: '8px',
            color: 'black', fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
        </button>

        <p style={{ color: colors.muted, fontSize: '13px', textAlign: 'center', marginTop: '16px' }}>
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <span
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            style={{ color: colors.cyan, cursor: 'pointer' }}
          >
            {mode === 'login' ? 'Sign Up' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  )
}

export default LoginPage