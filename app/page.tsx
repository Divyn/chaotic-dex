'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

// ─── Logistic Map Engine ────────────────────────────────────────────────────
const R = 3.95
const BASE_PRICE = 100
const AMPLITUDE = 3.2
const HISTORY_LEN = 120

function logisticStep(x: number, perturbation = 0): number {
  let next = R * x * (1 - x) + perturbation
  return Math.max(1e-6, Math.min(1 - 1e-6, next))
}

function xToPrice(x: number): number {
  return BASE_PRICE * Math.exp(AMPLITUDE * (x - 0.5))
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number, d = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtUSD = (n: number) => `$${fmt(n, 2)}`
const fmtCHAOS = (n: number) => `${fmt(n, 4)} CHAOS`

const STARTING_USD = 1000

// ─── Joke Content ───────────────────────────────────────────────────────────
interface ChaosEvent {
  text: string
  pert: number
  id: number
}

const EVENT_TEMPLATES: Omit<ChaosEvent, 'id'>[] = [
  { text: "someone divided by zero — reality destabilized", pert: 0.04 },
  { text: "a cat walked on a quant's keyboard, cascading orders triggered", pert: -0.03 },
  { text: "Riemann hypothesis solved on 4chan — markets unsure how to price this", pert: 0.02 },
  { text: "gradient descent converged to a local minimum — we're all trapped here now", pert: -0.02 },
  { text: "someone whispered 'tensor' in the server room, GPUs spooled up", pert: 0.03 },
  { text: "the market remembered it's a deterministic system — existential crisis", pert: -0.04 },
  { text: "Euler's identity proven... false? math twitter in shambles", pert: -0.03 },
  { text: "Nash equilibrium violated — game theorists baffled, markets volatile", pert: 0.05 },
  { text: "breaking: number continues to go up for no discernible reason", pert: 0.04 },
  { text: "a CS freshman just discovered the logistic map — mild academic interest", pert: 0.01 },
  { text: "quant fund replaced analysts with a literal roulette wheel — outperforming", pert: -0.02 },
  { text: "P = NP proof submitted to arXiv — cryptography markets in freefall", pert: -0.05 },
  { text: "the Fed chairman was replaced by a golden retriever — markets rally on vibes", pert: 0.06 },
  { text: "someone tried to short chaos itself — it didn't end well", pert: 0.04 },
  { text: "degenerate gambler entered the chat — volatility spike incoming", pert: 0.05 },
  { text: "your mom bought CHAOS — price action imminent", pert: 0.03 },
  { text: "hFT algo sneezed, 50,000 orders filled before anyone noticed", pert: -0.03 },
  { text: "market hit peak absurdity — traders now consulting astrology charts", pert: -0.02 },
  { text: "a butterfly flapped its wings in Brazil — chaotic attractor shifted", pert: 0.02 },
  { text: "someone on WSB just YOLO'd their life savings into CHAOS", pert: 0.07 },
  { text: "the SEC has no jurisdiction over mathematics — market ungovernable", pert: 0.03 },
  { text: "Mandelbrot set just grew a new bud — fractal traders euphoric", pert: 0.02 },
  { text: "'this time it's different' — last words of trader #8472", pert: -0.04 },
  { text: "L'Hôpital's rule applied to portfolio — limit does not exist", pert: -0.03 },
  { text: "someone found a closed-form solution — just kidding, we're still chaotic", pert: 0.01 },
]

const BUY_TOASTS = [
  "this is financial advice",
  "diamond hands: engaged",
  "buy high, sell... higher?",
  "injecting chaos directly into portfolio",
  "someone's bullish on math",
  "purchasing pure entropy",
  "this cannot possibly go wrong",
  "loading up on deterministic randomness",
]

const SELL_TOASTS = [
  "paper hands detected",
  "probably a good idea tbh",
  "weak hands make weak returns",
  "selling before the heat death of the universe",
  "taking profits on pure mathematics",
  "exiting chaos position — cowardice or wisdom?",
  "realizing losses to harvest for tax purposes (this is a game)",
  "someone check on this trader",
]

const NEWS_HEADLINES = [
  "Economists Baffled: Market Runs on Math They Skipped in College",
  "Local Trader Insists 'This Time the Attractor Is Different'",
  "Breaking: Number Goes Up, Then Down, Then Sideways Somehow",
  "Study Finds 100% of Traders Eventually Get Rekt by Chaos",
  "Market Maker Admits: 'We Have No Idea What We're Doing'",
  "Rogue Algorithm Achieves Sentience, Immediately Loses Money",
  "Quant Explains Market Using Only Hand Gestures and Screaming",
  "Federal Reserve Considers Switching to Logistic Map Standard",
  "Trader Who Held Through -90% Drawdown Declared 'Long Term Investor'",
  "Mathematicians Warn: This Market Has No Closed-Form Solution",
  "Day Trader Discovers the One Weird Trick (It's Just Luck)",
  "Supply and Demand Replaced by Vibes and Whimsy",
  "Trading Volume Spikes as Bots Discover Existential Dread",
  "Portfolio Diversification Strategy: 'Buy CHAOS, Pray'",
  "Technical Analyst Spots Rare 'Screaming Into Void' Pattern",
]

// ─── Types ──────────────────────────────────────────────────────────────────
interface Candle { t: number; price: number }
interface Trade  { id: number; side: 'BUY' | 'SELL'; qty: number; price: number; usd: number; ts: number }
interface Toast   { id: number; text: string; color: 'green' | 'red' }

// ─── Component ──────────────────────────────────────────────────────────────
export default function Home() {
  const [candles, setCandles]         = useState<Candle[]>([])
  const [price, setPrice]             = useState(BASE_PRICE)
  const [usd, setUsd]                 = useState(STARTING_USD)
  const [chaos, setChaos]             = useState(0)
  const [tradeLog, setTradeLog]       = useState<Trade[]>([])
  const [input, setInput]             = useState('')
  const [mode, setMode]               = useState<'USD' | 'CHAOS'>('USD')
  const [flash, setFlash]             = useState<'green' | 'red' | null>(null)
  const [tradeId, setTradeId]         = useState(0)
  const [impact, setImpact]           = useState(0)
  const [pnl, setPnl]                 = useState(0)
  const [costBasis, setCostBasis]     = useState(0)
  const [hoverPrice, setHoverPrice]   = useState<number | null>(null)
  const [toasts, setToasts]           = useState<Toast[]>([])
  const [activeEvent, setActiveEvent] = useState<ChaosEvent | null>(null)
  const [newsIdx, setNewsIdx]         = useState(0)
  const [eventId, setEventId]         = useState(0)
  const [toastId, setToastId]         = useState(0)
  const [mounted, setMounted]         = useState(false)

  const loadedRef = useRef(false)
  const xRef = useRef(0.4 + Math.random() * 0.2)

  // ─── Mark mounted (client-only) ─────────────────────────────────────────────
  useEffect(() => { setMounted(true) }, [])

  // ─── Load saved state from localStorage ────────────────────────────────────
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    try {
      const raw = localStorage.getItem('chaos-market')
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved.usd != null) setUsd(saved.usd)
      if (saved.chaos != null) setChaos(saved.chaos)
      if (saved.costBasis != null) setCostBasis(saved.costBasis)
      if (saved.tradeId != null) setTradeId(saved.tradeId)
      if (saved.tradeLog) setTradeLog(saved.tradeLog)
    } catch { /* corrupted data, start fresh */ }
  }, [])

  // ─── Persist state to localStorage ─────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem('chaos-market', JSON.stringify({
        usd, chaos, costBasis, tradeId, tradeLog,
      }))
    } catch { /* quota exceeded, nothing to do */ }
  }, [usd, chaos, costBasis, tradeId, tradeLog])

  // ─── Price ticker ──────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      const perturbation = impact
      setImpact(0)
      xRef.current = logisticStep(xRef.current, perturbation)
      const p = xToPrice(xRef.current)
      setPrice(p)
      setCandles(prev => {
        const next = [...prev, { t: Date.now(), price: p }]
        return next.length > HISTORY_LEN ? next.slice(-HISTORY_LEN) : next
      })
    }, 800)
    return () => clearInterval(tick)
  }, [impact])

  // ─── Random chaos events ──────────────────────────────────────────────────
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const schedule = () => {
      const delay = 7000 + Math.random() * 18000 // 7-25 seconds
      timeout = setTimeout(() => {
        const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)]
        const id = eventId
        setEventId(e => e + 1)
        const evt: ChaosEvent = { ...template, id }
        setActiveEvent(evt)
        setImpact(template.pert)
        setTimeout(() => setActiveEvent(null), 4000)
        schedule()
      }, delay)
    }
    schedule()
    return () => clearTimeout(timeout)
  }, [eventId])

  // ─── News ticker rotation ─────────────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      setNewsIdx(n => (n + 1) % NEWS_HEADLINES.length)
    }, 4500)
    return () => clearInterval(iv)
  }, [])

  // ─── PnL ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    setPnl(chaos * price - costBasis)
  }, [chaos, price, costBasis])

  // ─── Trade execution ───────────────────────────────────────────────────────
  const executeTrade = useCallback((side: 'BUY' | 'SELL') => {
    const val = parseFloat(input)
    if (!val || val <= 0) return

    let qty = 0
    let cost = 0

    if (side === 'BUY') {
      const spend = mode === 'USD' ? val : val * price
      if (spend > usd) {
        addToast("nice try, you don't have that much cash", 'red')
        return
      }
      qty  = spend / price
      cost = spend
      setUsd(u => u - spend)
      setChaos(c => c + qty)
      setCostBasis(b => b + spend)
      setImpact(Math.min(0.05, spend / (usd + spend) * 0.15))
    } else {
      qty  = mode === 'CHAOS' ? val : val / price
      if (qty > chaos) {
        addToast("you can't sell what you don't have, genius", 'red')
        return
      }
      const proceeds = qty * price
      setUsd(u => u + proceeds)
      setChaos(c => c - qty)
      setCostBasis(b => Math.max(0, b - qty / (chaos || 1) * b))
      cost = proceeds
      setImpact(-Math.min(0.05, proceeds / (usd + proceeds) * 0.15))
    }

    const toasts = side === 'BUY' ? BUY_TOASTS : SELL_TOASTS
    addToast(toasts[Math.floor(Math.random() * toasts.length)], side === 'BUY' ? 'green' : 'red')

    setFlash(side === 'BUY' ? 'green' : 'red')
    setTimeout(() => setFlash(null), 400)

    setTradeLog(prev => [{
      id: tradeId,
      side,
      qty,
      price,
      usd: cost,
      ts: Date.now(),
    }, ...prev].slice(0, 20))
    setTradeId(t => t + 1)
    setInput('')
  }, [input, mode, usd, chaos, price, tradeId, costBasis])

  function addToast(text: string, color: 'green' | 'red') {
    const id = toastId
    setToastId(t => t + 1)
    setToasts(p => [...p, { id, text, color }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }

  // ─── Chart data ────────────────────────────────────────────────────────────
  const chartData = candles.map((c, i) => ({ i, price: +c.price.toFixed(4) }))
  const entryPrice = chaos > 0 ? costBasis / chaos : null
  const displayPrice = hoverPrice ?? price
  const priceColor = candles.length > 1 && price >= candles[candles.length - 2]?.price
    ? '#22c55e' : '#ef4444'

  const portfolioValue = usd + chaos * price
  const totalReturn = ((portfolioValue - STARTING_USD) / STARTING_USD) * 100

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto relative">

      {/* ── Toast overlay ─────────────────────────────────────────────── */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast-enter px-3 py-2 rounded-lg text-xs font-medium shadow-lg border ${
              t.color === 'green'
                ? 'bg-green-950/90 border-green-700 text-green-300'
                : 'bg-red-950/90 border-red-700 text-red-300'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* ── Chaos event banner ────────────────────────────────────────── */}
      {activeEvent && (
        <div className="event-banner mb-4 bg-amber-950/60 border border-amber-700/50 rounded-xl px-4 py-2.5 text-center animate-slide-in">
          <span className="text-amber-400 text-sm font-semibold">
            CHAOS EVENT:
          </span>
          <span className="text-amber-300/80 text-sm ml-2">{activeEvent.text}</span>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-4">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            CHAOS<span className="text-slate-500">/USD</span>
          </h1>
          <span className="text-xs text-amber-500/70 border border-amber-800/40 rounded px-2 py-0.5">
            number go up technology
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-1">
          price driven by{' '}
          <span className="text-slate-400">x<sub>n+1</sub> = 3.95 · xₙ · (1 − xₙ)</span>
          {' '}— deterministic chaos, your trades just make it angrier
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Chart ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className={`flex justify-between items-start mb-4 rounded-lg px-3 py-2 -mx-1 transition-all ${
            flash === 'green' ? 'flash-green' : flash === 'red' ? 'flash-red' : ''
          }`}>
            <div>
              <div className="text-3xl font-bold" style={{ color: priceColor }}>
                {fmtUSD(displayPrice)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {mounted ? <>x = {xRef.current.toFixed(6)} <span className="blink">█</span></> : ' '}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">portfolio</div>
              <div className="text-lg font-semibold text-white">{fmtUSD(portfolioValue)}</div>
              <div className={`text-xs font-medium ${totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} onMouseMove={e => {
              if (e.activePayload?.[0]) setHoverPrice(e.activePayload[0].value)
            }} onMouseLeave={() => setHoverPrice(null)}>
              <XAxis dataKey="i" hide />
              <YAxis
                domain={['auto', 'auto']}
                tickFormatter={v => `$${v.toFixed(0)}`}
                width={60}
                tick={{ fill: '#475569', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                labelFormatter={() => ''}
                formatter={(v: number) => [fmtUSD(v), 'price']}
              />
              {entryPrice && (
                <ReferenceLine
                  y={entryPrice}
                  stroke="#f59e0b"
                  strokeDasharray="4 2"
                  label={{ value: 'avg entry', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
                />
              )}
              <Line
                type="monotone"
                dataKey="price"
                stroke={priceColor}
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>

        </div>

        {/* ── Right panel ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Portfolio */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-3">
              Wallet
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">USD</span>
                <span className="text-white font-semibold">{fmtUSD(usd)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">CHAOS</span>
                <span className="text-white font-semibold">{fmtCHAOS(chaos)}</span>
              </div>
              {chaos > 0 && (
                <>
                  <div className="border-t border-slate-800 my-2" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">avg entry</span>
                    <span className="text-amber-400">{fmtUSD(costBasis / chaos)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">unrealized P&amp;L</span>
                    <span className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {pnl >= 0 ? '+' : ''}{fmtUSD(pnl)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Trade panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-3">
              Trade
            </div>

            {/* Mode toggle */}
            <div className="flex gap-1 mb-3 bg-slate-800 rounded-lg p-1 text-xs">
              <button
                onClick={() => { setMode('USD'); setInput('') }}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
                  mode === 'USD' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >spend USD</button>
              <button
                onClick={() => { setMode('CHAOS'); setInput('') }}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
                  mode === 'CHAOS' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >spend CHAOS</button>
            </div>

            <input
              type="number"
              min="0"
              placeholder={mode === 'USD' ? 'amount in USD' : 'amount in CHAOS'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') executeTrade('BUY') }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-500 mb-3"
            />

            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-1 mb-3">
              {(mode === 'USD' ? [25, 100, 250, 500] : [0.1, 0.5, 1, 5]).map(v => (
                <button key={v} onClick={() => setInput(String(v))}
                  className="text-xs py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-all">
                  {mode === 'USD' ? `$${v}` : v}
                </button>
              ))}
            </div>

            {/* Preview */}
            {input && !isNaN(+input) && +input > 0 && (
              <div className="text-xs text-slate-500 mb-3 bg-slate-800 rounded-lg px-3 py-2 space-y-1">
                {mode === 'USD' ? (
                  <>
                    <div>spend <span className="text-white">{fmtUSD(+input)}</span></div>
                    <div>get ≈ <span className="text-green-400">{fmtCHAOS(+input / price)}</span></div>
                  </>
                ) : (
                  <>
                    <div>sell <span className="text-white">{fmtCHAOS(+input)}</span></div>
                    <div>get ≈ <span className="text-green-400">{fmtUSD(+input * price)}</span></div>
                  </>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => executeTrade('BUY')}
                className="py-2.5 rounded-lg font-bold text-sm bg-green-600 hover:bg-green-500 text-white transition-all active:scale-95"
              >BUY</button>
              <button
                onClick={() => executeTrade('SELL')}
                className="py-2.5 rounded-lg font-bold text-sm bg-red-600 hover:bg-red-500 text-white transition-all active:scale-95"
              >SELL</button>
            </div>

            {/* Bailout + Reset */}
            <button
              onClick={() => {
                setUsd(u => u + 1000)
                addToast("money printer go brrrr", 'green')
              }}
              className="w-full mt-2 py-2 rounded-lg text-xs text-slate-500 border border-slate-800 hover:border-slate-600 hover:text-slate-300 transition-all"
            >+ $1,000 free money (totally not inflation)</button>
            <button
              onClick={() => {
                setUsd(STARTING_USD)
                setChaos(0)
                setCostBasis(0)
                setTradeLog([])
                setTradeId(0)
                localStorage.removeItem('chaos-market')
                addToast("account reset — fresh start, same chaos", 'red')
              }}
              className="w-full mt-1 py-1.5 rounded-lg text-xs text-slate-700 border border-slate-800 hover:border-red-900 hover:text-red-500 transition-all"
            >reset account</button>
          </div>
        </div>
      </div>

      {/* ── Trade log ──────────────────────────────────────────────────── */}
      {tradeLog.length > 0 && (
        <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-3">
            Trade History
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {tradeLog.map(t => (
              <div key={t.id} className="flex items-center gap-3 text-xs text-slate-400">
                <span className={`font-bold w-8 ${t.side === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.side}
                </span>
                <span className="text-white">{fmt(t.qty, 4)} CHAOS</span>
                <span className="text-slate-600">@</span>
                <span>{fmtUSD(t.price)}</span>
                <span className="text-slate-600">·</span>
                <span>{fmtUSD(t.usd)}</span>
                <span className="ml-auto text-slate-700">{new Date(t.ts).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── News ticker ────────────────────────────────────────────────── */}
      <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 overflow-hidden">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-amber-500 font-bold shrink-0">MARKETWIRE:</span>
          <span className="text-slate-400 whitespace-nowrap">
            {NEWS_HEADLINES[newsIdx]}
          </span>
        </div>
      </div>

      {/* ── Math explainer ─────────────────────────────────────────────── */}
      <div className="mt-4 border border-slate-800 rounded-xl p-4 text-sm text-slate-400 leading-relaxed">
        <span className="text-slate-500 font-semibold">wtf is going on: </span>
        each tick computes{' '}
        <span className="text-slate-400">xₙ₊₁ = 3.95 · xₙ · (1 − xₙ)</span>,
        then maps to price via{' '}
        <span className="text-slate-400">P = $100 · e^(3.2 · (x − 0.5))</span>.
        at r = 3.95 we&apos;re deep in the{' '}
        <span className="text-slate-400">chaotic regime</span> —
        deterministic but so sensitive to initial conditions that
        a butterfly sneezing in Brazil sends your portfolio to zero.
        buying pushes x up (bullish vibes), selling pushes it down (bearish vibes).
        the math does not care about your feelings. you will get rekt.
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="mt-4 text-center text-xs text-slate-800">
        this is not financial advice. this is barely mathematics. past chaos does not predict future chaos.
      </div>
    </main>
  )
}
