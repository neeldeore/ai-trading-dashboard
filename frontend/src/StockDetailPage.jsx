import { useState, useEffect } from 'react'
import CandlestickChart from './CandlestickChart'

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

const PERIODS = [
  { label: '1W', value: '5d' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
]

function StockDetailPage({ symbol, email, onBack, onBuy, onSell, onAddToWatchlist }) {
  const [detail, setDetail] = useState(null)
  const [history, setHistory] = useState([])
  const [period, setPeriod] = useState('1mo')
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [signal, setSignal] = useState(null)
  const [news, setNews] = useState([])

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/stock/detail/${symbol}`)
      .then(res => res.json())
      .then(data => { setDetail(data); setLoading(false) })

    fetch(`${API}/signal/${symbol}`)
      .then(res => res.json())
      .then(data => setSignal(data))

    fetch(`${API}/news/${symbol}`)
      .then(res => res.json())
      .then(data => setNews(data))
  }, [symbol])

  useEffect(() => {
    fetch(`${API}/history/${symbol}?period=${period}`)
      .then(res => res.json())
      .then(data => setHistory(data))
  }, [symbol, period])

  if (loading) return (
    <div style={{ padding: '24px', color: colors.muted }}>Loading stock details...</div>
  )

  if (!detail || detail.error) return (
    <div style={{ padding: '24px' }}>
      <button onClick={onBack} style={{
        backgroundColor: 'transparent', border: `1px solid ${colors.border}`,
        borderRadius: '8px', padding: '8px 16px',
        color: colors.muted, cursor: 'pointer', marginBottom: '16px',
      }}>← Back</button>
      <p style={{ color: colors.red }}>Could not load stock data. Symbol may be invalid.</p>
    </div>
  )

  const isPositive = detail.change >= 0
  const signalColor = signal?.signal === 'BUY' ? colors.green
    : signal?.signal === 'SELL' ? colors.red : colors.orange

  const formatNumber = (num) => {
    if (!num) return 'N/A'
    if (num >= 1e7) return `₹${(num / 1e7).toFixed(2)} Cr`
    return num.toFixed(2)
  }

  return (
    <div style={{
      backgroundColor: colors.bg,
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
      color: colors.text,
    }}>
      <div style={{
        padding: '16px 24px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        backgroundColor: '#0d0d0d',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          backgroundColor: 'transparent',
          border: `1px solid ${colors.border}`,
          borderRadius: '8px', padding: '8px 16px',
          color: colors.muted, cursor: 'pointer', fontSize: '14px',
        }}>← Back</button>
        <div>
          <h2 style={{ margin: 0, color: colors.text }}>{detail.symbol}</h2>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => onAddToWatchlist && onAddToWatchlist(detail.symbol)}
            style={{
              padding: '10px 16px', backgroundColor: 'transparent',
              border: `1px solid ${colors.cyan}`, borderRadius: '8px',
              color: colors.cyan, fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
            }}
          >+ Watchlist</button>
          <input
            type="number"
            value={quantity}
            min="0.01"
            step="0.01"
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
            style={{
              width: '80px', padding: '8px', borderRadius: '6px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.card, color: colors.text, fontSize: '14px',
            }}
          />
          <button
            onClick={() => onBuy(detail.symbol, quantity)}
            style={{
              padding: '10px 24px', backgroundColor: colors.green,
              border: 'none', borderRadius: '8px',
              color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
            }}
          >BUY</button>
          <button
            onClick={() => onSell(detail.symbol, quantity)}
            style={{
              padding: '10px 24px', backgroundColor: colors.red,
              border: 'none', borderRadius: '8px',
              color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
            }}
          >SELL</button>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '8px' }}>
            <span style={{ fontSize: '40px', fontWeight: 'bold' }}>₹{detail.price.toLocaleString()}</span>
            <span style={{ fontSize: '18px', color: isPositive ? colors.green : colors.red, fontWeight: 'bold' }}>
              {isPositive ? '▲' : '▼'} {Math.abs(detail.change)}%
            </span>
          </div>
          {signal && (
            <div style={{
              display: 'inline-flex', gap: '16px', alignItems: 'center',
              backgroundColor: colors.card, borderRadius: '8px',
              padding: '8px 16px', border: `1px solid ${colors.border}`,
              borderLeft: `4px solid ${signalColor}`,
            }}>
              <span style={{ color: signalColor, fontWeight: 'bold' }}>
                🤖 AI: {signal.signal}
              </span>
              <span style={{ color: colors.muted, fontSize: '13px' }}>
                {signal.confidence}% confidence
              </span>
              <span style={{ color: colors.muted, fontSize: '13px' }}>
                RSI: {signal.rsi}
              </span>
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: colors.card, borderRadius: '12px',
          padding: '24px', border: `1px solid ${colors.border}`,
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                style={{
                  padding: '6px 16px', borderRadius: '20px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: period === p.value ? colors.cyan : 'transparent',
                  color: period === p.value ? 'black' : colors.muted,
                  cursor: 'pointer', fontWeight: period === p.value ? 'bold' : 'normal',
                  fontSize: '13px',
                }}
              >{p.label}</button>
            ))}
          </div>
          {history.length > 0 ? (
            <CandlestickChart symbol={detail.symbol} data={history} />
          ) : (
            <p style={{ color: colors.muted, textAlign: 'center', padding: '40px' }}>
              Loading chart data...
            </p>
          )}
        </div>

        <div style={{
          backgroundColor: colors.card, borderRadius: '12px',
          padding: '24px', border: `1px solid ${colors.border}`,
          marginBottom: '24px',
        }}>
          <h3 style={{ margin: '0 0 16px', color: colors.text }}>📊 Performance</h3>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: colors.muted, fontSize: '12px' }}>Today's Low</span>
              <span style={{ color: colors.muted, fontSize: '12px' }}>Today's High</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 'bold' }}>₹{detail.low}</span>
              <span style={{ fontWeight: 'bold' }}>₹{detail.high}</span>
            </div>
            <div style={{ height: '6px', backgroundColor: colors.border, borderRadius: '3px', position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0,
                width: `${((detail.price - detail.low) / (detail.high - detail.low)) * 100}%`,
                height: '100%', backgroundColor: colors.cyan, borderRadius: '3px',
              }} />
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: colors.muted, fontSize: '12px' }}>52 Week Low</span>
              <span style={{ color: colors.muted, fontSize: '12px' }}>52 Week High</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 'bold' }}>₹{detail.week_52_low}</span>
              <span style={{ fontWeight: 'bold' }}>₹{detail.week_52_high}</span>
            </div>
            <div style={{ height: '6px', backgroundColor: colors.border, borderRadius: '3px', position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0,
                width: `${((detail.price - detail.week_52_low) / (detail.week_52_high - detail.week_52_low)) * 100}%`,
                height: '100%', backgroundColor: colors.green, borderRadius: '3px',
              }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {[
              { label: 'Open', value: `₹${detail.open}` },
              { label: 'Prev Close', value: `₹${detail.prev_close}` },
              { label: 'Volume', value: detail.volume.toLocaleString() },
            ].map(item => (
              <div key={item.label} style={{
                flex: 1, minWidth: '120px',
                backgroundColor: '#0d0d0d', borderRadius: '8px', padding: '12px',
              }}>
                <p style={{ margin: 0, color: colors.muted, fontSize: '12px' }}>{item.label}</p>
                <p style={{ margin: '4px 0 0', fontWeight: 'bold' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          backgroundColor: colors.card, borderRadius: '12px',
          padding: '24px', border: `1px solid ${colors.border}`,
        }}>
          <h3 style={{ margin: '0 0 16px', color: colors.text }}>📈 Fundamentals</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
            {[
              { label: 'Market Cap', value: formatNumber(detail.market_cap) },
              { label: 'P/E Ratio (TTM)', value: detail.pe_ratio ? detail.pe_ratio.toFixed(2) : 'N/A' },
              { label: 'P/B Ratio', value: detail.pb_ratio ? detail.pb_ratio.toFixed(2) : 'N/A' },
              { label: 'EPS (TTM)', value: detail.eps ? `₹${detail.eps.toFixed(2)}` : 'N/A' },
              { label: 'Dividend Yield', value: detail.dividend_yield ? `${(detail.dividend_yield * 100).toFixed(2)}%` : 'N/A' },
              { label: 'ROE', value: detail.roe ? `${(detail.roe * 100).toFixed(2)}%` : 'N/A' },
              { label: 'Book Value', value: detail.book_value ? `₹${detail.book_value.toFixed(2)}` : 'N/A' },
              { label: 'Face Value', value: detail.face_value ? `₹${detail.face_value}` : 'N/A' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: `1px solid ${colors.border}`,
              }}>
                <span style={{ color: colors.muted, fontSize: '14px' }}>{item.label}</span>
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {news.length > 0 && (
          <div style={{
            backgroundColor: colors.card,
            borderRadius: '12px',
            padding: '24px',
            border: `1px solid ${colors.border}`,
            marginTop: '24px',
          }}>
            <h3 style={{ margin: '0 0 16px', color: colors.text }}>📰 Latest News</h3>
            {news.map((item, i) => (
              <div
                key={i}
                onClick={() => item.url && window.open(item.url, '_blank')}
                style={{
                  padding: '16px 0',
                  borderBottom: i < news.length - 1 ? `1px solid ${colors.border}` : 'none',
                  cursor: item.url ? 'pointer' : 'default',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: colors.muted, fontSize: '12px' }}>{item.publisher}</span>
                  <span style={{ color: colors.muted, fontSize: '12px' }}>{item.time}</span>
                </div>
                <p style={{
                  margin: '0 0 6px', color: colors.text,
                  fontSize: '14px', fontWeight: 'bold',
                  lineHeight: '1.4',
                }}>{item.title}</p>
                {item.summary && (
                  <p style={{
                    margin: 0, color: colors.muted,
                    fontSize: '13px', lineHeight: '1.5',
                  }}>{item.summary.slice(0, 150)}{item.summary.length > 150 ? '...' : ''}</p>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

export default StockDetailPage