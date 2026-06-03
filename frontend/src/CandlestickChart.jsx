import { useEffect, useRef } from 'react'
import { createChart, CandlestickSeries } from 'lightweight-charts'

function CandlestickChart({ data, symbol }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)
  const seriesRef = useRef(null)

  useEffect(() => {
    if (!chartRef.current) return

    if (!chartInstance.current) {
      const chart = createChart(chartRef.current, {
        width: chartRef.current.clientWidth,
        height: 400,
        layout: {
          background: { color: '#141414' },
          textColor: '#888',
        },
        grid: {
          vertLines: { color: '#222' },
          horzLines: { color: '#222' },
        },
        rightPriceScale: {
          borderColor: '#222',
        },
        timeScale: {
          borderColor: '#222',
          timeVisible: true,
        },
      })

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#4caf50',
        downColor: '#f44336',
        borderUpColor: '#4caf50',
        borderDownColor: '#f44336',
        wickUpColor: '#4caf50',
        wickDownColor: '#f44336',
      })

      chartInstance.current = chart
      seriesRef.current = candleSeries

      const handleResize = () => {
        if (chartRef.current && chartInstance.current) {
          chartInstance.current.applyOptions({
            width: chartRef.current.clientWidth
          })
        }
      }
      window.addEventListener('resize', handleResize)
    }

    if (seriesRef.current && data && data.length > 0) {
      seriesRef.current.setData(data)
      chartInstance.current.timeScale().fitContent()
    }

    return () => {}
  }, [data])

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.remove()
        chartInstance.current = null
        seriesRef.current = null
      }
    }
  }, [])

  return (
    <div style={{
      backgroundColor: '#141414',
      borderRadius: '12px',
      padding: '24px',
      margin: '8px',
    }}>
      <h2 style={{ color: '#00bcd4', marginTop: 0 }}>
        🕯️ {symbol} — Candlestick Chart
      </h2>
      <div ref={chartRef} style={{ width: '100%' }} />
    </div>
  )
}

export default CandlestickChart