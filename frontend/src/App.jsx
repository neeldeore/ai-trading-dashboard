import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ReferenceLine } from 'recharts'
import CandlestickChart from './CandlestickChart'
import LoginPage from './LoginPage'
import StockDetailPage from './StockDetailPage'

const API = 'https://ai-trading-dashboard-backend-vh7n.onrender.com'

const colors = {
  bg: '#0a0a0a',
  card: '#141414',
  border: '#222',
  cyan: '#00bcd4',
  green: '#4caf50',
  red: '#f44336',
  orange: '#ff9800',
  text: '#ffffff',
  muted: '#888',
}

function Navbar({ onAlertClick, alertCount, onProfileClick, onAIClick, onSearch }) {
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  function handleSearchChange(value) {
    setSearch(value)
    if (value.length < 1) { setSuggestions([]); setShowSuggestions(false); return }
    fetch(`${API}/stocks/search?query=${value}`)
      .then(res => res.json())
      .then(data => { setSuggestions(data); setShowSuggestions(true) })
  }

  function handleSelect(symbol) {
    setSearch('')
    setSuggestions([])
    setShowSuggestions(false)
    onSearch(symbol)
  }

  return (
    <div style={{
      backgroundColor: '#0d0d0d',
      borderBottom: `1px solid #222`,
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '60px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '24px' }}>📈</span>
        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '18px' }}>
          AI Trading Dashboard
        </span>
      </div>

      <div style={{ position: 'relative', flex: 1, maxWidth: '400px', margin: '0 24px' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value.toUpperCase())}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onFocus={() => search.length > 0 && setShowSuggestions(true)}
          placeholder="🔍 Search any stock..."
          style={{
            width: '100%', padding: '8px 16px', borderRadius: '20px',
            border: '1px solid #333',
            backgroundColor: '#1a1a1a', color: '#fff',
            fontSize: '14px', boxSizing: 'border-box', outline: 'none',
          }}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0,
            width: '100%', backgroundColor: '#141414',
            border: '1px solid #222', borderRadius: '8px',
            zIndex: 200, marginTop: '4px',
            maxHeight: '280px', overflowY: 'auto',
          }}>
            {suggestions.map(s => (
              <div
                key={s.symbol}
                onMouseDown={() => handleSelect(s.symbol)}
                style={{
                  padding: '10px 16px', cursor: 'pointer',
                  borderBottom: '1px solid #222',
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1a1a1a'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span style={{ color: '#00bcd4', fontWeight: 'bold', fontSize: '14px' }}>
                  {s.symbol}
                </span>
                <span style={{ color: '#888', fontSize: '12px' }}>{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button onClick={onAlertClick} style={{
          position: 'relative', padding: '8px 12px',
          backgroundColor: 'transparent', border: '1px solid #222',
          borderRadius: '20px', color: '#fff', cursor: 'pointer', fontSize: '18px',
        }}>
          🔔
          {alertCount > 0 && (
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              backgroundColor: '#f44336', color: 'white',
              borderRadius: '50%', width: '18px', height: '18px',
              fontSize: '11px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
            }}>{alertCount}</span>
          )}
        </button>
        <button onClick={onProfileClick} style={{
          padding: '8px 12px', backgroundColor: 'transparent',
          border: '1px solid #222', borderRadius: '20px',
          color: '#fff', cursor: 'pointer', fontSize: '14px',
        }}>👤</button>
      </div>
    </div>
  )
}

function IndicesBar({ indices }) {
  return (
    <div style={{
      backgroundColor: '#0d0d0d',
      borderBottom: `1px solid ${colors.border}`,
      padding: '8px 24px',
      display: 'flex',
      gap: '32px',
      overflowX: 'auto',
    }}>
      {indices.map((index) => (
        <div key={index.name} style={{ display: 'flex', gap: '8px', alignItems: 'center', whiteSpace: 'nowrap' }}>
          <span style={{ color: colors.muted, fontSize: '13px' }}>{index.name}</span>
          <span style={{ color: colors.text, fontSize: '13px', fontWeight: 'bold' }}>{index.value}</span>
          <span style={{ color: index.change >= 0 ? colors.green : colors.red, fontSize: '12px' }}>
            {index.change >= 0 ? '▲' : '▼'} {Math.abs(index.change)}%
          </span>
        </div>
      ))}
    </div>
  )
}

function Tabs({ activeTab, onTabChange }) {
  const tabs = ['Explore', 'Watchlist', 'Holdings', 'Orders', 'Analytics']
  return (
    <div style={{
      backgroundColor: '#0d0d0d',
      borderBottom: `1px solid ${colors.border}`,
      padding: '0 24px',
      display: 'flex',
    }}>
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          style={{
            padding: '14px 24px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === tab ? `2px solid ${colors.cyan}` : '2px solid transparent',
            color: activeTab === tab ? colors.cyan : colors.muted,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === tab ? 'bold' : 'normal',
          }}
        >{tab}</button>
      ))}
    </div>
  )
}

function StockCard({ symbol, data, onClick, isSelected, onRemove, onBuy, onSell }) {
  const isPositive = data.change >= 0
  const qtyId = `qty-${symbol}`
  return (
    <div
      onClick={() => onClick(symbol)}
      style={{
        border: isSelected ? `2px solid ${colors.cyan}` : `1px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '16px',
        margin: '8px',
        backgroundColor: colors.card,
        color: colors.text,
        width: '200px',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(symbol) }}
        style={{
          position: 'absolute', top: '8px', right: '8px',
          backgroundColor: 'transparent', border: 'none',
          color: colors.red, cursor: 'pointer', fontSize: '14px',
        }}
      >✕</button>
      <h3 style={{ margin: 0, color: colors.cyan, fontSize: '16px' }}>{symbol}</h3>
      <p style={{ margin: '4px 0', fontSize: '11px', color: colors.muted }}>{data.name}</p>
      <p style={{ margin: '8px 0', fontSize: '22px', fontWeight: 'bold' }}>₹{data.price}</p>
      <p style={{ margin: 0, color: isPositive ? colors.green : colors.red, fontWeight: 'bold', fontSize: '13px' }}>
        {isPositive ? '▲' : '▼'} {data.change}%
      </p>
      <div style={{ marginTop: '12px' }}>
        <input
          type="number"
          id={qtyId}
          defaultValue="1"
          min="0.01"
          step="0.01"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', padding: '6px', borderRadius: '6px',
            border: `1px solid ${colors.border}`,
            backgroundColor: '#0d0d0d', color: colors.text,
            fontSize: '13px', marginBottom: '8px',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              const qty = parseFloat(document.getElementById(qtyId).value) || 1
              onBuy(symbol, qty)
            }}
            style={{
              flex: 1, padding: '6px', backgroundColor: colors.green,
              border: 'none', borderRadius: '6px',
              color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px',
            }}
          >BUY</button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              const qty = parseFloat(document.getElementById(qtyId).value) || 1
              onSell(symbol, qty)
            }}
            style={{
              flex: 1, padding: '6px', backgroundColor: colors.red,
              border: 'none', borderRadius: '6px',
              color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px',
            }}
          >SELL</button>
        </div>
      </div>
    </div>
  )
}

function StockChart({ symbol, history }) {
  return <CandlestickChart symbol={symbol} data={history} />
}

function AIPopup({ onClose, stocks }) {
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [signal, setSignal] = useState(null)
  const [loading, setLoading] = useState(false)

  function analyzeStock() {
    if (!selectedSymbol) return
    setLoading(true)
    setSignal(null)
    fetch(`${API}/signal/${selectedSymbol}`)
      .then(res => res.json())
      .then(data => { setSignal(data); setLoading(false) })
  }

  const signalColor = signal?.signal === 'BUY' ? colors.green
    : signal?.signal === 'SELL' ? colors.red : colors.orange

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        backgroundColor: colors.card, borderRadius: '16px',
        padding: '32px', width: '480px',
        color: colors.text, border: `1px solid ${colors.border}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: colors.cyan }}>🤖 AI Stock Analyzer</h2>
          <button onClick={onClose} style={{
            backgroundColor: 'transparent', border: 'none',
            color: colors.muted, cursor: 'pointer', fontSize: '20px',
          }}>✕</button>
        </div>
        <p style={{ color: colors.muted, marginTop: 0 }}>
          Select a stock to get AI buy/sell signal.
        </p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px',
              backgroundColor: '#0d0d0d', border: `1px solid ${colors.border}`,
              color: colors.text, fontSize: '14px',
            }}
          >
            <option value="">Select a stock...</option>
            {Object.keys(stocks).map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
          <button onClick={analyzeStock} style={{
            padding: '10px 20px', backgroundColor: colors.cyan,
            border: 'none', borderRadius: '8px',
            color: 'black', fontWeight: 'bold', cursor: 'pointer',
          }}>Analyze</button>
        </div>
        {loading && <p style={{ color: colors.muted, textAlign: 'center' }}>🤖 Analyzing...</p>}
        {signal && (
          <div style={{
            backgroundColor: '#0d0d0d', borderRadius: '12px',
            padding: '20px', borderLeft: `4px solid ${signalColor}`,
          }}>
            <div style={{ display: 'flex', gap: '32px', marginBottom: '16px' }}>
              <div>
                <p style={{ margin: 0, color: colors.muted, fontSize: '12px' }}>Signal</p>
                <p style={{ margin: '4px 0', fontSize: '28px', fontWeight: 'bold', color: signalColor }}>
                  {signal.signal === 'BUY' ? '✅' : signal.signal === 'SELL' ? '🔴' : '⚠️'} {signal.signal}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, color: colors.muted, fontSize: '12px' }}>Confidence</p>
                <p style={{ margin: '4px 0', fontSize: '28px', fontWeight: 'bold' }}>{signal.confidence}%</p>
              </div>
              <div>
                <p style={{ margin: 0, color: colors.muted, fontSize: '12px' }}>RSI</p>
                <p style={{ margin: '4px 0', fontSize: '28px', fontWeight: 'bold' }}>{signal.rsi}</p>
              </div>
            </div>
            <p style={{ margin: 0, color: colors.muted, fontSize: '12px' }}>Reason</p>
            <p style={{ margin: '4px 0' }}>{signal.reason}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function AlertsPopup({ onClose, alerts, stocks, onAlertsChange, email }) {
  const [symbol, setSymbol] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [condition, setCondition] = useState('above')
  const [message, setMessage] = useState('')

  function handleAddAlert() {
    if (!symbol || !targetPrice) { setMessage('Fill all fields'); return }
    fetch(`${API}/alerts/add?symbol=${symbol}&target_price=${targetPrice}&condition=${condition}&email=${email}`, {
      method: 'POST'
    })
      .then(res => res.json())
      .then(data => { setMessage(data.message); setSymbol(''); setTargetPrice(''); onAlertsChange() })
  }

  function handleDeleteAlert(id) {
    fetch(`${API}/alerts/delete/${id}?email=${email}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => onAlertsChange())
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        backgroundColor: colors.card, borderRadius: '16px',
        padding: '32px', width: '500px',
        color: colors.text, border: `1px solid ${colors.border}`,
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: colors.cyan }}>🔔 Price Alerts</h2>
          <button onClick={onClose} style={{
            backgroundColor: 'transparent', border: 'none',
            color: colors.muted, cursor: 'pointer', fontSize: '20px',
          }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px',
              backgroundColor: '#0d0d0d', border: `1px solid ${colors.border}`,
              color: colors.text, fontSize: '14px',
            }}
          >
            <option value="">Select stock...</option>
            {Object.keys(stocks).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            style={{
              padding: '10px', borderRadius: '8px',
              backgroundColor: '#0d0d0d', border: `1px solid ${colors.border}`,
              color: colors.text, fontSize: '14px',
            }}
          >
            <option value="above">Goes Above</option>
            <option value="below">Goes Below</option>
          </select>
          <input
            type="number"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddAlert()}
            placeholder="Target ₹"
            style={{
              width: '120px', padding: '10px', borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              backgroundColor: '#0d0d0d',
              color: colors.text, fontSize: '14px',
            }}
          />
        </div>
        <button onClick={handleAddAlert} style={{
          width: '100%', padding: '10px',
          backgroundColor: colors.cyan, border: 'none',
          borderRadius: '8px', color: 'black',
          fontWeight: 'bold', cursor: 'pointer', marginBottom: '16px',
        }}>+ Set Alert</button>
        {message && <p style={{ color: colors.muted, fontSize: '13px' }}>{message}</p>}
        <h3 style={{ color: colors.muted }}>Active Alerts</h3>
        {alerts.filter(a => !a.triggered).length === 0 ? (
          <p style={{ color: colors.muted, fontSize: '13px' }}>No active alerts.</p>
        ) : (
          alerts.filter(a => !a.triggered).map(alert => (
            <div key={alert.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px', borderRadius: '8px',
              backgroundColor: '#0d0d0d', marginBottom: '8px',
            }}>
              <div>
                <span style={{ color: colors.cyan, fontWeight: 'bold' }}>{alert.symbol}</span>
                <span style={{ color: colors.muted, fontSize: '13px', marginLeft: '8px' }}>
                  {alert.condition === 'above' ? 'Goes above' : 'Goes below'} ₹{alert.target_price}
                </span>
              </div>
              <button onClick={() => handleDeleteAlert(alert.id)} style={{
                backgroundColor: 'transparent', border: 'none',
                color: colors.red, cursor: 'pointer', fontSize: '16px',
              }}>✕</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ProfilePanel({ onClose, onTabChange, onLogout, email }) {
  const [user, setUser] = useState(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(`${API}/user?email=${email}`)
      .then(res => res.json())
      .then(data => {
        setUser(data)
        setName(data.name)
        setPhone(data.phone)
      })
  }, [])

  function handleUpdate() {
    fetch(`${API}/user/update?email=${email}&name=${name}&phone=${phone}`, {
      method: 'PUT'
    })
      .then(res => res.json())
      .then(data => {
        setMessage(data.message)
        setEditing(false)
        fetch(`${API}/user?email=${email}`)
          .then(res => res.json())
          .then(data => setUser(data))
      })
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0,
      width: '320px', height: '100%',
      backgroundColor: colors.card,
      borderLeft: `1px solid ${colors.border}`,
      zIndex: 200,
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      <div style={{
        padding: '24px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '48px', height: '48px',
              borderRadius: '50%',
              backgroundColor: colors.cyan,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: 'bold', color: 'black',
            }}>
              {user ? user.name[0].toUpperCase() : '?'}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
                {user ? user.name : 'Loading...'}
              </p>
              <p style={{ margin: 0, color: colors.muted, fontSize: '12px' }}>
                {user ? user.email : ''}
              </p>
            </div>
          </div>
          <p style={{ margin: 0, color: colors.muted, fontSize: '12px' }}>
            Member since {user ? user.joined : ''}
          </p>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: '8px', padding: '6px 10px',
            color: colors.muted, cursor: 'pointer', fontSize: '16px',
          }}
        >⚙️</button>
      </div>

      {editing && (
        <div style={{ padding: '16px', borderBottom: `1px solid ${colors.border}` }}>
          <p style={{ margin: '0 0 12px', color: colors.cyan, fontWeight: 'bold' }}>Edit Profile</p>
          {[
            { label: 'Name', value: name, setter: setName },
            { label: 'Phone', value: phone, setter: setPhone },
          ].map(field => (
            <div key={field.label} style={{ marginBottom: '10px' }}>
              <p style={{ margin: '0 0 4px', color: colors.muted, fontSize: '12px' }}>{field.label}</p>
              <input
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                style={{
                  width: '100%', padding: '8px', borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: '#0d0d0d', color: colors.text,
                  fontSize: '14px', boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
          <button onClick={handleUpdate} style={{
            width: '100%', padding: '10px',
            backgroundColor: colors.cyan, border: 'none',
            borderRadius: '8px', color: 'black',
            fontWeight: 'bold', cursor: 'pointer',
          }}>Save Changes</button>
          {message && <p style={{ color: colors.green, fontSize: '13px', marginTop: '8px' }}>{message}</p>}
        </div>
      )}

      <div style={{ padding: '16px', borderBottom: `1px solid ${colors.border}` }}>
        <p style={{ margin: '0 0 12px', color: colors.muted, fontSize: '12px' }}>PORTFOLIO SUMMARY</p>
        {user && [
          { label: 'Available Balance', value: `₹${user.balance.toLocaleString()}` },
          { label: 'Stocks Owned', value: user.stocks_owned },
          { label: 'Total Orders', value: user.total_orders },
          { label: 'Member Since', value: user.joined },
        ].map(item => (
          <div key={item.label} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '12px 0',
            borderBottom: `1px solid ${colors.border}`,
          }}>
            <span style={{ color: colors.muted, fontSize: '14px' }}>{item.label}</span>
            <span style={{ color: colors.text, fontWeight: 'bold', fontSize: '14px' }}>{item.value}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px' }}>
        <p style={{ margin: '0 0 12px', color: colors.muted, fontSize: '12px' }}>QUICK LINKS</p>
        {[
          { label: '💰 Holdings', tab: 'Holdings' },
          { label: '📋 All Orders', tab: 'Orders' },
          { label: '👀 Watchlist', tab: 'Watchlist' },
        ].map(item => (
          <div
            key={item.label}
            onClick={() => { onTabChange(item.tab); onClose() }}
            style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 0',
              borderBottom: `1px solid ${colors.border}`,
              cursor: 'pointer',
            }}
          >
            <span style={{ color: colors.text, fontSize: '14px' }}>{item.label}</span>
            <span style={{ color: colors.muted }}>›</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px', marginTop: 'auto' }}>
        <button onClick={onClose} style={{
          width: '100%', padding: '12px', marginBottom: '8px',
          backgroundColor: 'transparent',
          border: `1px solid ${colors.border}`,
          borderRadius: '8px', color: colors.muted,
          cursor: 'pointer', fontSize: '14px',
        }}>Close</button>
        <button onClick={onLogout} style={{
          width: '100%', padding: '12px',
          backgroundColor: 'transparent',
          border: `1px solid ${colors.red}`,
          borderRadius: '8px', color: colors.red,
          cursor: 'pointer', fontSize: '14px',
          fontWeight: 'bold',
        }}>Log Out</button>
      </div>
    </div>
  )
}

function ExploreTab({ stocks, selectedStock, history, onStockClick, onRemove, onBuy, onSell, onAddStock, onViewDetail }) {
  return (
    <div style={{ padding: '24px' }}>
      <h3 style={{ color: colors.muted, marginBottom: '12px' }}>Market Overview</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {Object.entries(stocks).map(([symbol, data]) => (
          <StockCard
            key={symbol} symbol={symbol} data={data}
            onClick={(s) => onViewDetail(s)}
            isSelected={selectedStock === symbol}
            onRemove={onRemove}
            onBuy={onBuy}
            onSell={onSell}
          />
        ))}
      </div>
      {selectedStock && <CandlestickChart symbol={selectedStock} data={history} />}
    </div>
  )
}

function HoldingsTab({ portfolio, stocks, onBuy, onSell, onDeposit }) {
  const [depositAmount, setDepositAmount] = useState('')
  const [message, setMessage] = useState('')

  function handleDeposit() {
    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0) { setMessage('Enter valid amount'); return }
    onDeposit(amount, setMessage, setDepositAmount)
  }

  const totalHoldingsValue = Object.entries(portfolio.holdings).reduce(
    (total, [symbol, holding]) => {
      const price = stocks[symbol]?.price || holding.avg_price
      return total + price * holding.quantity
    }, 0
  )

  const totalPnL = Object.entries(portfolio.holdings).reduce(
    (total, [symbol, holding]) => {
      const price = stocks[symbol]?.price || holding.avg_price
      return total + (price - holding.avg_price) * holding.quantity
    }, 0
  )

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { label: 'Available Balance', value: `₹${portfolio.balance.toLocaleString()}`, color: colors.green },
          { label: 'Holdings Value', value: `₹${totalHoldingsValue.toFixed(2)}`, color: colors.text },
          { label: 'Total P&L', value: `${totalPnL >= 0 ? '+' : ''}₹${totalPnL.toFixed(2)}`, color: totalPnL >= 0 ? colors.green : colors.red },
        ].map(item => (
          <div key={item.label} style={{
            backgroundColor: colors.card, padding: '20px 24px',
            borderRadius: '12px', border: `1px solid ${colors.border}`, minWidth: '180px',
          }}>
            <p style={{ margin: 0, color: colors.muted, fontSize: '12px' }}>{item.label}</p>
            <p style={{ margin: '6px 0 0', fontSize: '22px', fontWeight: 'bold', color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <input
          type="number"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          placeholder="Deposit amount"
          style={{
            padding: '10px 16px', borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.card,
            color: colors.text, width: '200px', fontSize: '14px',
          }}
        />
        <button onClick={handleDeposit} style={{
          padding: '10px 20px', backgroundColor: colors.green,
          border: 'none', borderRadius: '8px',
          color: 'white', fontWeight: 'bold', cursor: 'pointer',
        }}>+ Deposit</button>
        {message && <p style={{ color: colors.muted, margin: 'auto 8px' }}>{message}</p>}
      </div>
      <h3 style={{ color: colors.muted }}>Your Holdings</h3>
      {Object.keys(portfolio.holdings).length === 0 ? (
        <div style={{
          backgroundColor: colors.card, borderRadius: '12px',
          padding: '48px', textAlign: 'center', border: `1px solid ${colors.border}`,
        }}>
          <p style={{ color: colors.muted, fontSize: '16px' }}>No holdings yet.</p>
          <p style={{ color: colors.muted, fontSize: '13px' }}>Go to Explore tab and buy some stocks!</p>
        </div>
      ) : (
        <div style={{
          backgroundColor: colors.card, borderRadius: '12px',
          border: `1px solid ${colors.border}`, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a1a1a' }}>
                {['Symbol', 'Qty', 'Avg Price', 'Current', 'P&L', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', color: colors.muted,
                    fontSize: '12px', textAlign: 'left', fontWeight: 'normal',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(portfolio.holdings).map(([symbol, holding]) => {
                const price = stocks[symbol]?.price || holding.avg_price
                const pnl = (price - holding.avg_price) * holding.quantity
                return (
                  <tr key={symbol} style={{ borderTop: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '12px 16px', color: colors.cyan, fontWeight: 'bold' }}>{symbol}</td>
                    <td style={{ padding: '12px 16px' }}>{holding.quantity}</td>
                    <td style={{ padding: '12px 16px' }}>₹{holding.avg_price}</td>
                    <td style={{ padding: '12px 16px' }}>₹{price}</td>
                    <td style={{ padding: '12px 16px', color: pnl >= 0 ? colors.green : colors.red }}>
                      {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => onBuy(symbol, 1)} style={{
                        marginRight: '8px', padding: '4px 12px',
                        backgroundColor: colors.green, border: 'none',
                        borderRadius: '4px', color: 'white',
                        cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
                      }}>BUY</button>
                      <button onClick={() => onSell(symbol, 1)} style={{
                        padding: '4px 12px', backgroundColor: colors.red,
                        border: 'none', borderRadius: '4px',
                        color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
                      }}>SELL</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function WatchlistTab({ stocks, onBuy, onSell, onRemove }) {
  return (
    <div style={{ padding: '24px' }}>
      <h3 style={{ color: colors.muted, marginBottom: '16px' }}>Your Watchlist</h3>
      <div style={{
        backgroundColor: colors.card, borderRadius: '12px',
        border: `1px solid ${colors.border}`, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a' }}>
              {['Symbol', 'Price', 'Change', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', color: colors.muted,
                  fontSize: '12px', textAlign: 'left', fontWeight: 'normal',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(stocks).map(([symbol, data]) => (
              <tr key={symbol} style={{ borderTop: `1px solid ${colors.border}` }}>
                <td style={{ padding: '12px 16px', color: colors.cyan, fontWeight: 'bold' }}>{symbol}</td>
                <td style={{ padding: '12px 16px' }}>₹{data.price}</td>
                <td style={{ padding: '12px 16px', color: data.change >= 0 ? colors.green : colors.red }}>
                  {data.change >= 0 ? '▲' : '▼'} {data.change}%
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => onBuy(symbol, 1)} style={{
                    marginRight: '8px', padding: '4px 12px',
                    backgroundColor: colors.green, border: 'none',
                    borderRadius: '4px', color: 'white',
                    cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
                  }}>BUY</button>
                  <button onClick={() => onSell(symbol, 1)} style={{
                    marginRight: '8px', padding: '4px 12px',
                    backgroundColor: colors.red, border: 'none',
                    borderRadius: '4px', color: 'white',
                    cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
                  }}>SELL</button>
                  <button onClick={() => onRemove(symbol)} style={{
                    padding: '4px 12px', backgroundColor: 'transparent',
                    border: `1px solid ${colors.border}`, borderRadius: '4px',
                    color: colors.muted, cursor: 'pointer', fontSize: '12px',
                  }}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OrdersTab({ email }) {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    fetch(`${API}/orders?email=${email}`)
      .then(res => res.json())
      .then(data => setOrders(data))
  }, [])

  return (
    <div style={{ padding: '24px' }}>
      <h3 style={{ color: colors.muted, marginBottom: '16px' }}>Order History</h3>
      {orders.length === 0 ? (
        <div style={{
          backgroundColor: colors.card, borderRadius: '12px',
          padding: '48px', textAlign: 'center', border: `1px solid ${colors.border}`,
        }}>
          <p style={{ color: colors.muted, fontSize: '16px' }}>No orders yet.</p>
          <p style={{ color: colors.muted, fontSize: '13px' }}>Your past trades will appear here.</p>
        </div>
      ) : (
        <div style={{
          backgroundColor: colors.card, borderRadius: '12px',
          border: `1px solid ${colors.border}`, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a1a1a' }}>
                {['Symbol', 'Type', 'Quantity', 'Price', 'Total', 'Time'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', color: colors.muted,
                    fontSize: '12px', textAlign: 'left', fontWeight: 'normal',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                  <td style={{ padding: '12px 16px', color: colors.cyan, fontWeight: 'bold' }}>{order.symbol}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: '12px', fontSize: '12px',
                      backgroundColor: order.type === 'BUY' ? '#1a3a1a' : '#3a1a1a',
                      color: order.type === 'BUY' ? colors.green : colors.red,
                      fontWeight: 'bold',
                    }}>{order.type}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{order.quantity}</td>
                  <td style={{ padding: '12px 16px' }}>₹{order.price}</td>
                  <td style={{ padding: '12px 16px' }}>₹{order.total}</td>
                  <td style={{ padding: '12px 16px', color: colors.muted, fontSize: '12px' }}>{order.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AnalyticsTab({ email }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/analytics?email=${email}`)
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ padding: '24px' }}>
      <p style={{ color: colors.muted }}>Loading analytics...</p>
    </div>
  )

  if (!data) return null

  const statCards = [
    { label: 'Total Invested', value: `₹${data.total_invested.toLocaleString()}`, color: colors.text },
    { label: 'Current Value', value: `₹${data.current_value.toLocaleString()}`, color: colors.cyan },
    { label: 'Total P&L', value: `${data.total_pnl >= 0 ? '+' : ''}₹${data.total_pnl.toFixed(2)}`, color: data.total_pnl >= 0 ? colors.green : colors.red },
    { label: 'P&L %', value: `${data.total_pnl_percent >= 0 ? '+' : ''}${data.total_pnl_percent}%`, color: data.total_pnl_percent >= 0 ? colors.green : colors.red },
    { label: 'Available Balance', value: `₹${data.balance.toLocaleString()}`, color: colors.green },
    { label: 'Total Orders', value: data.total_orders, color: colors.text },
    { label: 'Win Rate', value: `${data.win_rate}%`, color: data.win_rate >= 50 ? colors.green : colors.orange },
  ]

  const DONUT_COLORS = ['#00bcd4', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#2196f3']

  const donutData = data.stock_pnl.map((s, i) => ({
    name: s.symbol,
    value: parseFloat(s.current.toFixed(2)),
    color: DONUT_COLORS[i % DONUT_COLORS.length]
  }))

  const barData = data.stock_pnl.map(s => ({
    symbol: s.symbol,
    pnl: s.pnl,
    fill: s.pnl >= 0 ? '#4caf50' : '#f44336'
  }))

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ color: colors.text, marginTop: 0 }}>📊 Portfolio Analytics</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        {statCards.map(card => (
          <div key={card.label} style={{
            backgroundColor: colors.card,
            borderRadius: '12px',
            padding: '20px 24px',
            border: `1px solid ${colors.border}`,
            minWidth: '160px',
            flex: '1',
          }}>
            <p style={{ margin: 0, color: colors.muted, fontSize: '12px' }}>{card.label}</p>
            <p style={{ margin: '6px 0 0', fontSize: '20px', fontWeight: 'bold', color: card.color }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>

        {donutData.length > 0 && (
          <div style={{
            backgroundColor: colors.card,
            borderRadius: '12px',
            padding: '24px',
            border: `1px solid ${colors.border}`,
            flex: '1',
            minWidth: '300px',
          }}>
            <h3 style={{ color: colors.text, marginTop: 0 }}>🍩 Portfolio Composition</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#333', border: 'none' }}
                  formatter={(value) => [`₹${value}`, 'Value']}
                />
                <Legend
                  formatter={(value) => <span style={{ color: colors.text }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.order_history.length > 0 && (
          <div style={{
            backgroundColor: colors.card,
            borderRadius: '12px',
            padding: '24px',
            border: `1px solid ${colors.border}`,
            flex: '2',
            minWidth: '300px',
          }}>
            <h3 style={{ color: colors.text, marginTop: 0 }}>💰 Portfolio Value Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.order_history}>
                <XAxis dataKey="date" stroke={colors.muted} />
                <YAxis stroke={colors.muted} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#333', border: 'none' }}
                  labelStyle={{ color: colors.cyan }}
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Balance']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={colors.cyan}
                  strokeWidth={2}
                  dot={{ fill: colors.cyan, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {barData.length > 0 && (
        <div style={{
          backgroundColor: colors.card,
          borderRadius: '12px',
          padding: '24px',
          border: `1px solid ${colors.border}`,
          marginBottom: '24px',
        }}>
          <h3 style={{ color: colors.text, marginTop: 0 }}>📈 P&L Per Stock</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} barSize={48}>
              <XAxis dataKey="symbol" stroke={colors.muted} />
              <YAxis stroke={colors.muted} />
              <Tooltip
                contentStyle={{ backgroundColor: '#333', border: 'none' }}
                labelStyle={{ color: colors.cyan }}
                formatter={(value) => [`₹${value.toFixed(2)}`, 'P&L']}
              />
              <ReferenceLine y={0} stroke={colors.muted} strokeDasharray="3 3" />
              <Bar dataKey="pnl" radius={[4, 4, 4, 4]}
                label={{ position: 'top', fill: colors.muted, fontSize: 11,
                  formatter: (v) => `₹${v.toFixed(0)}` }}>
                {barData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.stock_pnl.length > 0 && (
        <div style={{
          backgroundColor: colors.card,
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a1a1a' }}>
                {['Symbol', 'Invested', 'Current Value', 'P&L', 'P&L %'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', color: colors.muted,
                    fontSize: '12px', textAlign: 'left', fontWeight: 'normal',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.stock_pnl.map(stock => (
                <tr key={stock.symbol} style={{ borderTop: `1px solid ${colors.border}` }}>
                  <td style={{ padding: '12px 16px', color: colors.cyan, fontWeight: 'bold' }}>{stock.symbol}</td>
                  <td style={{ padding: '12px 16px' }}>₹{stock.invested.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}>₹{stock.current.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', color: stock.pnl >= 0 ? colors.green : colors.red }}>
                    {stock.pnl >= 0 ? '+' : ''}₹{stock.pnl.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 16px', color: stock.pnl_percent >= 0 ? colors.green : colors.red }}>
                    {stock.pnl_percent >= 0 ? '+' : ''}{stock.pnl_percent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.stock_pnl.length === 0 && (
        <div style={{
          backgroundColor: colors.card,
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ color: colors.muted, fontSize: '16px' }}>No holdings to analyze yet.</p>
          <p style={{ color: colors.muted, fontSize: '13px' }}>Buy some stocks to see your analytics!</p>
        </div>
      )}
    </div>
  )
}

function Dashboard({ currentUser, onLogout }) {
  const [stocks, setStocks] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedStock, setSelectedStock] = useState(null)
  const [history, setHistory] = useState([])
  const [portfolio, setPortfolio] = useState({ balance: 0, holdings: {} })
  const [activeTab, setActiveTab] = useState('Explore')
  const [showAI, setShowAI] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [triggeredAlerts, setTriggeredAlerts] = useState([])
  const [indices, setIndices] = useState([])
  const [detailSymbol, setDetailSymbol] = useState(null)

  const email = currentUser.email

  function loadStocks() {
    setLoading(true)
    fetch(`${API}/stocks?email=${email}`)
      .then(res => res.json())
      .then(data => { setStocks(data); setLoading(false) })
  }

  function loadIndices() {
    fetch('${API}/indices')
      .then(res => res.json())
      .then(data => setIndices(data))
  }

  function loadPortfolio() {
    fetch(`${API}/portfolio?email=${email}`)
      .then(res => res.json())
      .then(data => setPortfolio(data))
  }

  function loadAlerts() {
    fetch(`${API}/alerts?email=${email}`)
      .then(res => res.json())
      .then(data => setAlerts(data))
  }

  function checkAlerts() {
    fetch(`${API}/alerts/check?email=${email}`)
      .then(res => res.json())
      .then(data => { if (data.length > 0) setTriggeredAlerts(data) })
  }

  useEffect(() => {
    if (!currentUser) return
    loadStocks()
    loadPortfolio()
    loadAlerts()
    loadIndices()
    const interval = setInterval(() => checkAlerts(), 30000)
    return () => clearInterval(interval)
  }, [currentUser])

  function handleStockClick(symbol) {
    setSelectedStock(symbol)
    fetch(`${API}/history/${symbol}`)
      .then(res => res.json())
      .then(data => setHistory(data))
  }

  function handleViewDetail(symbol) {
    setDetailSymbol(symbol)
  }

  function handleRemoveStock(symbol) {
    fetch(`${API}/watchlist/remove/${symbol}?email=${email}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => {
        if (selectedStock === symbol) { setSelectedStock(null); setHistory([]) }
        loadStocks()
      })
  }

  function handleBuy(symbol, qty = 1) {
    fetch(`${API}/trade/buy/${symbol}?email=${email}&quantity=${qty}`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.error) { alert(data.error); return }
        alert(data.message)
        loadPortfolio()
      })
  }

  function handleSell(symbol, qty = 1) {
    fetch(`${API}/trade/sell/${symbol}?email=${email}&quantity=${qty}`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.error) { alert(data.error); return }
        alert(data.message)
        loadPortfolio()
      })
  }

  function handleDeposit(amount, setMessage, setDepositAmount) {
    fetch(`${API}/portfolio/deposit/${amount}?email=${email}`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setMessage(data.message)
        setDepositAmount('')
        loadPortfolio()
      })
  }

  function renderTab() {
    if (loading) return <p style={{ color: colors.text, padding: '24px' }}>Loading stocks...</p>
    switch (activeTab) {
      case 'Explore': return (
        <ExploreTab
          stocks={stocks}
          selectedStock={selectedStock}
          history={history}
          onStockClick={handleStockClick}
          onRemove={handleRemoveStock}
          onBuy={handleBuy}
          onSell={handleSell}
          onAddStock={{ email, reload: loadStocks }}
          onViewDetail={handleViewDetail}
        />
      )
      case 'Watchlist': return (
        <WatchlistTab stocks={stocks} onBuy={handleBuy} onSell={handleSell} onRemove={handleRemoveStock} />
      )
      case 'Holdings': return (
        <HoldingsTab portfolio={portfolio} stocks={stocks} onBuy={handleBuy} onSell={handleSell} onDeposit={handleDeposit} />
      )
      case 'Orders': return <OrdersTab email={email} />
      case 'Analytics': return <AnalyticsTab email={email} />
      default: return null
    }
  }

  if (detailSymbol) {
    return (
      <>
        <StockDetailPage
          symbol={detailSymbol}
          email={email}
          onBack={() => setDetailSymbol(null)}
          onBuy={handleBuy}
          onSell={handleSell}
          onAddToWatchlist={(symbol) => {
            fetch(`${API}/watchlist/add/${symbol}?email=${email}`, { method: 'POST' })
              .then(res => res.json())
              .then(data => { alert(data.message); loadStocks() })
          }}
        />
        <button
          onClick={() => setShowAI(true)}
          style={{
            position: 'fixed', bottom: '24px', right: '24px',
            padding: '14px 20px',
            backgroundColor: colors.cyan,
            border: 'none', borderRadius: '50px',
            color: 'black', fontWeight: 'bold',
            cursor: 'pointer', fontSize: '14px',
            zIndex: 50,
            boxShadow: '0 4px 20px rgba(0,188,212,0.4)',
          }}
        >🤖 Ask AI</button>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: 'fixed', bottom: '24px', left: '24px',
            padding: '12px 16px',
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: '50px',
            color: colors.muted, fontWeight: 'bold',
            cursor: 'pointer', fontSize: '14px',
            zIndex: 50,
          }}
        >↑ Top</button>
        {showAI && <AIPopup onClose={() => setShowAI(false)} stocks={stocks} />}
      </>
    )
  }

  return (
    <div style={{ backgroundColor: colors.bg, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <Navbar
        onAIClick={() => setShowAI(true)}
        onAlertClick={() => { setShowAlerts(true); loadAlerts() }}
        alertCount={triggeredAlerts.length}
        onProfileClick={() => setShowProfile(true)}
        onSearch={(symbol) => setDetailSymbol(symbol)}
      />
      <IndicesBar indices={indices} />
      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
      {renderTab()}
      {showAI && <AIPopup onClose={() => setShowAI(false)} stocks={stocks} />}
      {showAlerts && (
        <AlertsPopup
          onClose={() => setShowAlerts(false)}
          alerts={alerts}
          stocks={stocks}
          onAlertsChange={loadAlerts}
          email={email}
        />
      )}
      {showProfile && (
        <ProfilePanel
          onClose={() => setShowProfile(false)}
          onTabChange={setActiveTab}
          email={email}
          onLogout={onLogout}
        />
      )}
      {triggeredAlerts.length > 0 && (
        <div style={{
          position: 'fixed', bottom: '80px', right: '24px',
          backgroundColor: colors.card,
          border: `1px solid ${colors.red}`,
          borderRadius: '12px', padding: '16px',
          zIndex: 49, maxWidth: '300px',
        }}>
          <p style={{ margin: '0 0 8px', color: colors.red, fontWeight: 'bold' }}>
            🔔 Price Alert Triggered!
          </p>
          {triggeredAlerts.map((a, i) => (
            <p key={i} style={{ margin: '4px 0', color: colors.text, fontSize: '13px' }}>
              {a.message}
            </p>
          ))}
          <button
            onClick={() => setTriggeredAlerts([])}
            style={{
              marginTop: '8px', padding: '4px 12px',
              backgroundColor: colors.red, border: 'none',
              borderRadius: '6px', color: 'white',
              cursor: 'pointer', fontSize: '12px',
            }}
          >Dismiss</button>
        </div>
      )}
      <button
        onClick={() => setShowAI(true)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          padding: '14px 20px',
          backgroundColor: colors.cyan,
          border: 'none', borderRadius: '50px',
          color: 'black', fontWeight: 'bold',
          cursor: 'pointer', fontSize: '14px',
          zIndex: 50,
          boxShadow: '0 4px 20px rgba(0,188,212,0.4)',
        }}
      >🤖 Ask AI</button>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{
          position: 'fixed', bottom: '24px', left: '24px',
          padding: '12px 16px',
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: '50px',
          color: colors.muted, fontWeight: 'bold',
          cursor: 'pointer', fontSize: '14px',
          zIndex: 150,
        }}
      >↑ Top</button>
    </div>
  )
}

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  function handleLogin(user) {
    localStorage.setItem('user', JSON.stringify(user))
    setCurrentUser(user)
  }

  function handleLogout() {
    localStorage.removeItem('user')
    setCurrentUser(null)
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLogin} />
  }

  return <Dashboard currentUser={currentUser} onLogout={handleLogout} />
}

export default App