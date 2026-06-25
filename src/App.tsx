import { useState, useEffect, useCallback } from 'react';
import { 
  Globe, 
  Clock, 
  HelpCircle, 
  Sliders, 
  Zap, 
  Volume2, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Maximize2,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus
} from 'lucide-react';
import ChartCanvas from './components/ChartCanvas';
import TradingViewChart from './components/TradingViewChart';
import FloatingPanel from './components/FloatingPanel';
import ExtensionPlayground from './components/ExtensionPlayground';
import ToastContainer, { Toast, playAlertSound } from './components/Notifications';
import { Candle, AIAnalysisResult, AppSettings, HistoryItem } from './types';

// Asset base prices & volatilities for highly realistic simulation
const ASSET_SPECS: Record<string, { base: number; vol: number }> = {
  'EUR/USD': { base: 1.0824, vol: 0.00015 },
  'GBP/USD': { base: 1.2645, vol: 0.00018 },
  'AUD/USD': { base: 0.6582, vol: 0.00012 },
  'USD/JPY': { base: 154.22, vol: 0.025 },
  'BTC/USD': { base: 92450.00, vol: 45.0 },
  'ETH/USD': { base: 3120.50, vol: 2.2 },
  'GOLD (XAU/USD)': { base: 2324.40, vol: 0.8 },
  'US30': { base: 39120, vol: 15.0 },
  'EUR/USD (OTC)': { base: 1.0895, vol: 0.00022 },
  'GBP/JPY (OTC)': { base: 194.50, vol: 0.035 }
};

export default function App() {
  const [currentSymbol, setSymbol] = useState('EUR/USD');
  const [isCustomSymbolMode, setIsCustomSymbolMode] = useState(false);
  const [currentTimeframe, setTimeframe] = useState('1M');
  const [isOtc, setIsOtc] = useState(false);
  const [activePlatform, setActivePlatform] = useState('Quotex');
  
  const [candles, setCandles] = useState<Candle[]>([]);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isPanelVisible, setPanelVisible] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Default app settings
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'DARK',
    language: 'en',
    opacity: 0.95,
    position: { x: 30, y: 30 },
    confidenceThreshold: 65,
    notifications: {
      sound: true,
      browser: true,
      highConfidenceOnly: false
    },
    risk: {
      riskPerTrade: 1,
      maxSpreadAllowed: 2.5
    }
  });

  // Canvas visual toggles
  const [showIndicators, setShowIndicators] = useState({
    ema20: true,
    sma50: true,
    bb: true,
    smc: true
  });

  // Chart view source (Local simulation vs real live TradingView API)
  const [chartSource, setChartSource] = useState<'SIMULATOR' | 'TRADINGVIEW'>('SIMULATOR');

  // Real-time UTC+6 Clock State
  const [systemTime, setSystemTime] = useState(() => {
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Dhaka', // UTC+6
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(new Date());
      const year = parts.find(p => p.type === 'year')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const day = parts.find(p => p.type === 'day')?.value || '';
      const hour = parts.find(p => p.type === 'hour')?.value || '';
      const minute = parts.find(p => p.type === 'minute')?.value || '';
      const second = parts.find(p => p.type === 'second')?.value || '';
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    } catch (e) {
      return new Date().toISOString().replace('T', ' ').substring(0, 19);
    }
  });

  useEffect(() => {
    const timer = setInterval(() => {
      try {
        const options: Intl.DateTimeFormatOptions = {
          timeZone: 'Asia/Dhaka', // UTC+6
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        };
        const formatter = new Intl.DateTimeFormat('en-US', options);
        const parts = formatter.formatToParts(new Date());
        const year = parts.find(p => p.type === 'year')?.value || '';
        const month = parts.find(p => p.type === 'month')?.value || '';
        const day = parts.find(p => p.type === 'day')?.value || '';
        const hour = parts.find(p => p.type === 'hour')?.value || '';
        const minute = parts.find(p => p.type === 'minute')?.value || '';
        const second = parts.find(p => p.type === 'second')?.value || '';
        setSystemTime(`${year}-${month}-${day} ${hour}:${minute}:${second}`);
      } catch (e) {
        setSystemTime(new Date().toISOString().replace('T', ' ').substring(0, 19));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Toast trigger utility
  const triggerToast = useCallback((title: string, description: string, type: 'success' | 'warning' | 'info') => {
    const newToast: Toast = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      description,
      type
    };
    setToasts(prev => [...prev, newToast]);
    
    // Play alert sound based on user configuration
    if (settings.notifications.sound) {
      playAlertSound(type);
    }

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 4000);
  }, [settings.notifications.sound]);

  // Pre-generate historical candles for current symbol
  const loadHistoricalCandles = useCallback((symbol: string) => {
    const spec = ASSET_SPECS[symbol] || { base: 1.0, vol: 0.001 };
    let currentPrice = spec.base;
    const historyCount = 65;
    const tempCandles: Candle[] = [];
    const now = Date.now();
    const tInterval = 60000; // 1 minute interval representation

    for (let i = historyCount; i > 0; i--) {
      const open = currentPrice;
      const change = (Math.random() - 0.495) * spec.vol;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * spec.vol * 0.3;
      const low = Math.min(open, close) - Math.random() * spec.vol * 0.3;
      const volume = 150 + Math.round(Math.random() * 850);

      tempCandles.push({
        time: now - i * tInterval,
        open,
        high,
        low,
        close,
        volume
      });
      currentPrice = close; // roll close over
    }
    setCandles(tempCandles);
  }, []);

  // Initialize historical candles on boot and reset on Symbol changes
  useEffect(() => {
    loadHistoricalCandles(currentSymbol);
    setAnalysis(undefined); // clear old analysis
  }, [currentSymbol, loadHistoricalCandles]);

  // Load history log from localStorage on boot
  useEffect(() => {
    const saved = localStorage.getItem('tlp_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history from storage', e);
      }
    }
  }, []);

  // Real-time market tick generator loop
  useEffect(() => {
    if (candles.length === 0) return;

    const spec = ASSET_SPECS[currentSymbol] || { base: 1.0, vol: 0.001 };
    
    const interval = setInterval(() => {
      setCandles(prevCandles => {
        if (prevCandles.length === 0) return prevCandles;
        const last = { ...prevCandles[prevCandles.length - 1] };
        
        // Dynamic live price tick walk
        const tick = (Math.random() - 0.5) * spec.vol * 0.15;
        const nextPrice = last.close + tick;

        last.close = nextPrice;
        if (nextPrice > last.high) last.high = nextPrice;
        if (nextPrice < last.low) last.low = nextPrice;
        last.volume += Math.round(Math.random() * 5);

        // Periodically (say, every 12 ticks) close candle and spawn a new one
        const isNewCandleTrigger = Math.random() < 0.08; 
        if (isNewCandleTrigger) {
          const newCandle: Candle = {
            time: Date.now(),
            open: last.close,
            high: last.close,
            low: last.close,
            close: last.close,
            volume: 100 + Math.round(Math.random() * 100)
          };
          return [...prevCandles.slice(1), newCandle]; // slide window
        }

        return [...prevCandles.slice(0, -1), last];
      });
    }, 1500); // price updates every 1.5s

    return () => clearInterval(interval);
  }, [candles, currentSymbol]);

  // Trigger main full-scope AI Technical Analysis
  const performAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: currentSymbol,
          timeframe: currentTimeframe,
          candles,
          isOtc,
          confidenceThreshold: settings.confidenceThreshold
        })
      });

      if (!res.ok) {
        throw new Error('Server returned an error responding to analysis request');
      }

      const result: AIAnalysisResult = await res.json();
      setAnalysis(result);

      // Save to History locally
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        symbol: result.symbol,
        timeframe: result.timeframe,
        price: result.price,
        bias: result.bias,
        confidence: result.confidence,
        setup: result.setup,
        outcome: 'UNRESOLVED'
      };

      const updatedHistory = [newHistoryItem, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('tlp_history', JSON.stringify(updatedHistory));

      // Notification Alerts
      if (result.bias !== 'NO_TRADE') {
        const isHighConf = result.confidence >= 75;
        const isBuy = result.bias.includes('BUY');
        
        if (!settings.notifications.highConfidenceOnly || isHighConf) {
          triggerToast(
            `TLP AI ${isBuy ? 'BUY' : 'SELL'} ALERT`,
            `Detected strong ${result.bias} setup on ${result.symbol} (${result.timeframe}) with ${result.confidence}% confidence.`,
            isBuy ? 'success' : 'warning'
          );
        }
      } else {
        triggerToast(
          'Scanner Update',
          `Analysis complete for ${result.symbol}. Consensus is currently neutral. Stand by.`,
          'info'
        );
      }

    } catch (e: any) {
      console.error(e);
      triggerToast('Analysis Failed', 'Could not reach TLP AI Engine. Using detailed mathematical math parameters.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const latestPrice = candles[candles.length - 1]?.close || 1.0;

  return (
    <div className="min-h-screen bg-brand-bg text-slate-100 flex flex-col font-sans relative antialiased" id="root-viewport">
      
      {/* Dynamic Toast Alerts Container */}
      <ToastContainer toasts={toasts} setToasts={setToasts} />

      {/* 1. MAIN NAVIGATION TOP BAR */}
      <header className="border-b border-gray-800 bg-header-bg p-3 px-6 flex items-center justify-between select-none shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg font-black tracking-tighter text-sm flex items-center gap-1 shadow glow-border-blue">
            <Zap className="w-4 h-4 fill-current" />
            <span>TLP</span>
          </div>
          <div>
            <span className="font-bold text-xs text-white">INSTITUTIONAL AI CORE</span>
            <span className="text-[9px] text-gray-400 block">Forex & OTC Trading Intelligence Terminal</span>
          </div>
        </div>

        {/* Live System Time / Status */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-gray-300">
          <div className="flex items-center gap-1.5 bg-[#121418] px-3 py-1.5 rounded-lg border border-gray-800">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
            <span className="text-gray-200">AI ENGINE ONLINE</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>UTC+6 {systemTime}</span>
          </div>
        </div>
      </header>

      {/* 2. SPLIT SCREEN WORKSPACE LAYOUT */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT COLUMN: SIMULATED BROKER WEB WINDOW (65% width) */}
        <section className="flex-1 lg:max-w-[65%] border-r border-gray-800 flex flex-col relative bg-[#0E1014] p-4">
          
          {/* Simulated Browser Web bar */}
          <div className="bg-[#1C1F26] rounded-t-xl border border-gray-700 p-2.5 flex items-center gap-2.5 select-none text-xs">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/85" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/85" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/85" />
            </div>
            
            {/* Mock Web URL bar */}
            <div className="flex-1 bg-[#0A0B0D] rounded px-3 py-1 font-mono text-[10px] text-gray-300 flex items-center gap-2 truncate border border-gray-800">
              <Globe className="w-3.5 h-3.5 text-gray-500" />
              <span>
                {activePlatform === 'Binance' 
                  ? `https://www.binance.com/en/futures/${currentSymbol.replace('/', '').toUpperCase()}`
                  : activePlatform === 'TradingView'
                  ? `https://www.tradingview.com/chart/?symbol=${currentSymbol.replace('/', '').toUpperCase()}`
                  : `https://quotex.io/trade/${currentSymbol.replace('/', '').toLowerCase()}`}
              </span>
            </div>

            <div className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-[10px] font-bold border border-green-500/20">
              SSL SECURED
            </div>
          </div>

          {/* Simulated Broker Page Canvas Area */}
          <div className="flex-1 bg-[#121418] border-x border-b border-gray-700 rounded-b-xl relative flex flex-col p-4 overflow-hidden">
            
            {/* Simulated Broker Dashboard Header */}
            <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-3 select-none">
              
              {/* Asset and Timeframe Selectors */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] text-gray-500 tracking-wider uppercase font-bold">Asset Selection</span>
                    <button 
                      onClick={() => setIsCustomSymbolMode(!isCustomSymbolMode)}
                      className="text-[8px] text-blue-400 hover:underline font-bold ml-2 cursor-pointer"
                    >
                      {isCustomSymbolMode ? 'Presets' : 'Type Symbol'}
                    </button>
                  </div>
                  {isCustomSymbolMode ? (
                    <input
                      type="text"
                      placeholder="e.g. SOL/USD, AAPL"
                      value={currentSymbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      className="bg-[#1C1F26] text-white font-bold text-xs p-1 px-2 rounded border border-gray-700 outline-none focus:border-blue-500 w-36 uppercase"
                    />
                  ) : (
                    <select
                      value={currentSymbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      className="bg-[#1C1F26] text-white font-bold text-xs p-1 px-2 rounded border border-gray-700 cursor-pointer outline-none focus:border-blue-500"
                    >
                      <option value="EUR/USD">EUR/USD (Forex Major)</option>
                      <option value="GBP/USD">GBP/USD (Cable)</option>
                      <option value="AUD/USD">AUD/USD (Aussie)</option>
                      <option value="USD/JPY">USD/JPY (Ninja)</option>
                      <option value="BTC/USD">BTC/USD (Bitcoin)</option>
                      <option value="ETH/USD">ETH/USD (Ethereum)</option>
                      <option value="GOLD (XAU/USD)">GOLD (XAU/USD)</option>
                      <option value="US30">US30 (Dow Jones)</option>
                      <option value="EUR/USD (OTC)">EUR/USD (OTC Index)</option>
                      <option value="GBP/JPY (OTC)">GBP/JPY (OTC Index)</option>
                    </select>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="text-[8px] text-gray-500 tracking-wider uppercase font-bold">Interval</span>
                  <select
                    value={currentTimeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="bg-[#1C1F26] text-white font-bold text-xs p-1 px-1.5 rounded border border-gray-700 cursor-pointer outline-none focus:border-blue-500"
                  >
                    {['15S', '30S', '1M', '2M', '3M', '5M', '15M', '30M', '1H', '4H', '1D'].map(tf => (
                      <option key={tf} value={tf}>{tf}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <span className="text-[8px] text-gray-500 tracking-wider uppercase font-bold">Chart Engine</span>
                  <div className="flex bg-[#1C1F26] p-0.5 rounded border border-gray-700 text-[10px] items-center">
                    <button
                      onClick={() => setChartSource('SIMULATOR')}
                      className={`p-1 px-2 rounded font-bold cursor-pointer transition-colors ${chartSource === 'SIMULATOR' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      SIMULATOR
                    </button>
                    <button
                      onClick={() => setChartSource('TRADINGVIEW')}
                      className={`p-1 px-2 rounded font-bold cursor-pointer transition-colors ${chartSource === 'TRADINGVIEW' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      TRADINGVIEW API
                    </button>
                  </div>
                </div>
              </div>

              {/* Chart Indicator Visual Toggles */}
              <div className="flex items-center gap-1 bg-[#1C1F26] p-1 rounded-lg border border-gray-750 text-[10px]">
                <button
                  onClick={() => setShowIndicators(p => ({ ...p, ema20: !p.ema20 }))}
                  className={`p-1 px-2 rounded font-bold cursor-pointer transition-colors ${showIndicators.ema20 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-gray-500'}`}
                >
                  EMA20
                </button>
                <button
                  onClick={() => setShowIndicators(p => ({ ...p, sma50: !p.sma50 }))}
                  className={`p-1 px-2 rounded font-bold cursor-pointer transition-colors ${showIndicators.sma50 ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-gray-500'}`}
                >
                  SMA50
                </button>
                <button
                  onClick={() => setShowIndicators(p => ({ ...p, bb: !p.bb }))}
                  className={`p-1 px-2 rounded font-bold cursor-pointer transition-colors ${showIndicators.bb ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-500'}`}
                >
                  BOLL
                </button>
                <button
                  onClick={() => setShowIndicators(p => ({ ...p, smc: !p.smc }))}
                  className={`p-1 px-2 rounded font-bold cursor-pointer transition-colors ${showIndicators.smc ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-gray-500'}`}
                >
                  SMC
                </button>
              </div>

              {/* Action Button inside Broker Frame */}
              <button
                onClick={performAnalysis}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-black text-[11px] p-2 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all glow-border-blue"
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />}
                <span>AI TRIGGER</span>
              </button>
            </div>

            {/* High Performance Canvas Chart inside Simulated Page */}
            <div className="flex-1 relative bg-slate-950 rounded-xl overflow-hidden min-h-[350px]">
              {chartSource === 'SIMULATOR' ? (
                <ChartCanvas
                  candles={candles}
                  analysis={analysis}
                  showIndicators={showIndicators}
                />
              ) : (
                <TradingViewChart symbol={currentSymbol} />
              )}

              {/* Drag limits boundaries representing simulated overlay window */}
              <FloatingPanel
                analysis={analysis}
                isLoading={isLoading}
                settings={settings}
                updateSettings={updateSettings}
                onAnalyze={performAnalysis}
                isVisible={isPanelVisible}
                setVisible={setPanelVisible}
                setAnalysis={setAnalysis}
                setIsLoading={setIsLoading}
                currentSymbol={currentSymbol}
                currentTimeframe={currentTimeframe}
              />
            </div>

            {/* Simulated Broker Order Execution footer */}
            <div className="mt-4 border-t border-gray-800 pt-3 flex items-center justify-between text-xs text-gray-400 select-none">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-gray-600" /> Demo Account Trade Simulator
              </span>
              <div className="flex gap-2">
                <button className="bg-green-500/10 hover:bg-green-500/20 text-green-400 p-1.5 px-4 rounded font-bold border border-green-500/20 cursor-not-allowed transition-colors">
                  MOCK BUY
                </button>
                <button className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-1.5 px-4 rounded font-bold border border-red-500/20 cursor-not-allowed transition-colors">
                  MOCK SELL
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* RIGHT COLUMN: TLP AI INTERACTIVE EXTENSION PLAYGROUND SIDEBAR (35% width) */}
        <section className="flex-1 lg:max-w-[35%] p-4 flex flex-col gap-4 overflow-y-auto bg-brand-bg">
          
          {/* Quick Informational header */}
          <div className="bg-[#1C1F26] border border-gray-700 p-4 rounded-xl flex items-start gap-3 shadow-md glow-border-blue">
            <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20 text-blue-400 mt-0.5">
              <Zap className="w-5 h-5 fill-current animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-black tracking-wide text-white">TLP REAL-TIME SIMULATOR</h3>
              <p className="text-[11px] text-gray-300 leading-relaxed mt-1">
                This dashboard acts as both the control panel for the simulated broker environment on the left, and provides the real-world Google Chrome manifest & content injection codebases!
              </p>
            </div>
          </div>

          <ExtensionPlayground
            currentSymbol={currentSymbol}
            setSymbol={setSymbol}
            currentTimeframe={currentTimeframe}
            setTimeframe={setTimeframe}
            isOtc={isOtc}
            setIsOtc={setIsOtc}
            activePlatform={activePlatform}
            setActivePlatform={setActivePlatform}
            onAnalyze={performAnalysis}
            history={history}
            setHistory={setHistory}
            settings={settings}
            updateSettings={updateSettings}
            triggerToast={triggerToast}
          />
          
        </section>

      </main>

      {/* 3. STATIC SYSTEM STATUS FOOTER */}
      <footer className="border-t border-gray-800 bg-header-bg p-2 text-center text-[10px] text-gray-500 font-mono select-none">
        TLP AI TRADING ASSISTANT • MODEL REFERENCE: models/gemini-3.5-flash • DECISION SUPPORT SYSTEM V1.0 • MADE BY GOOGLE AI STUDIO BUILD
      </footer>

    </div>
  );
}
