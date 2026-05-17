import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function StockCard({ symbol, data, onClick, isSelected }) {
  const isPositive = data.change >= 0

  return (
    <div
      onClick={() => onClick(symbol)}
      style={{
        border: isSelected ? '2px solid #00bcd4' : '1px solid #333',
        borderRadius: '8px',
        padding: '16px',
        margin: '8px',
        backgroundColor: '#1a1a1a',
        color: 'white',
        width: '200px',
        cursor: 'pointer',
      }}
    >
      <h3 style={{ margin: 0, color: '#00bcd4' }}>{symbol}</h3>
      <p style={{ margin: '4px 0', fontSize: '12px', color: '#aaa' }}>{data.name}</p>
      <p style={{ margin: '8px 0', fontSize: '24px', fontWeight: 'bold' }}>
        ₹{data.price}
      </p>
      <p style={{
        margin: 0,
        color: isPositive ? '#4caf50' : '#f44336',
        fontWeight: 'bold'
      }}>
        {isPositive ? '▲' : '▼'} {data.change}%
      </p>
    </div>
  )
}

function StockChart({ symbol, history }) {
  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      borderRadius: '8px',
      padding: '24px',
      margin: '8px',
      color: 'white',
    }}>
      <h2 style={{ color: '#00bcd4', marginTop: 0 }}>
        {symbol} — Price History
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={history}>
          <XAxis dataKey="day" stroke="#aaa" />
          <YAxis stroke="#aaa" domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ backgroundColor: '#333', border: 'none' }}
            labelStyle={{ color: '#00bcd4' }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#00bcd4"
            strokeWidth={2}
            dot={{ fill: '#00bcd4' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function App() {
  const [stocks, setStocks] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedStock, setSelectedStock] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    fetch('http://localhost:8000/stocks')
      .then(res => res.json())
      .then(data => {
        setStocks(data)
        setLoading(false)
      })
  }, [])

  function handleStockClick(symbol) {
    setSelectedStock(symbol)
    fetch(`http://localhost:8000/history/${symbol}`)
      .then(res => res.json())
      .then(data => setHistory(data))
  }

  return (
    <div style={{
      backgroundColor: '#0d0d0d',
      minHeight: '100vh',
      padding: '24px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: 'white' }}>📈 AI Trading Dashboard</h1>
      <p style={{ color: '#aaa' }}>Click on a stock to see its chart</p>

      {loading ? (
        <p style={{ color: 'white' }}>Loading stocks...</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {Object.entries(stocks).map(([symbol, data]) => (
            <StockCard
              key={symbol}
              symbol={symbol}
              data={data}
              onClick={handleStockClick}
              isSelected={selectedStock === symbol}
            />
          ))}
        </div>
      )}

      {selectedStock && (
        <StockChart symbol={selectedStock} history={history} />
      )}
    </div>
  )
}

export default App