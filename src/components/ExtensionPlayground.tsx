import { useState, useEffect } from 'react';
import { 
  Laptop, 
  Search, 
  History, 
  Terminal, 
  Play, 
  Settings as SettingsIcon, 
  Copy, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  Download,
  CheckCircle,
  XCircle,
  Award,
  Globe,
  Clock
} from 'lucide-react';
import { ScannerData, HistoryItem, AppSettings, Candle } from '../types';

interface ExtensionPlaygroundProps {
  currentSymbol: string;
  setSymbol: (s: string) => void;
  currentTimeframe: string;
  setTimeframe: (t: string) => void;
  isOtc: boolean;
  setIsOtc: (otc: boolean) => void;
  activePlatform: string;
  setActivePlatform: (p: string) => void;
  onAnalyze: () => void;
  history: HistoryItem[];
  setHistory: (h: HistoryItem[]) => void;
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  triggerToast: (title: string, desc: string, type: 'success' | 'warning' | 'info') => void;
}

export default function ExtensionPlayground({
  currentSymbol,
  setSymbol,
  currentTimeframe,
  setTimeframe,
  isOtc,
  setIsOtc,
  activePlatform,
  setActivePlatform,
  onAnalyze,
  history,
  setHistory,
  settings,
  updateSettings,
  triggerToast
}: ExtensionPlaygroundProps) {
  const [activePlaygroundTab, setActivePlaygroundTab] = useState<'SCANNER' | 'HISTORY' | 'CODE' | 'GUIDE'>('SCANNER');
  const [scannerData, setScannerData] = useState<ScannerData | null>(null);
  const [isLoadingScanner, setIsLoadingScanner] = useState(false);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // Expose local url for extension
  const appUrl = window.location.origin;

  // Fetch real-time scanner updates from backend
  const fetchScanner = async () => {
    setIsLoadingScanner(true);
    try {
      const res = await fetch('/api/scanner');
      if (res.ok) {
        const data = await res.json();
        setScannerData(data);
      }
    } catch (e) {
      console.error('Error fetching scanner data:', e);
    } finally {
      setIsLoadingScanner(false);
    }
  };

  useEffect(() => {
    fetchScanner();
    const timer = setInterval(fetchScanner, 20000); // refresh every 20 seconds
    return () => clearInterval(timer);
  }, []);

  const handleCopyCode = (filename: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(filename);
    triggerToast('Copied to Clipboard', `${filename} content is ready to be pasted.`, 'success');
    setTimeout(() => setCopiedFile(null), 2000);
  };

  // Switch asset in active simulated browser
  const handleSelectScannerItem = (symbol: string, otc: boolean) => {
    setSymbol(symbol);
    setIsOtc(otc);
    onAnalyze(); // trigger fresh analysis on selection
    triggerToast('Asset Loaded', `Switched broker workspace to ${symbol}`, 'info');
  };

  // Win Rate Statistics calculation
  const totalRated = history.filter(h => h.outcome === 'WIN' || h.outcome === 'LOSS').length;
  const winsCount = history.filter(h => h.outcome === 'WIN').length;
  const winRatePercent = totalRated > 0 ? ((winsCount / totalRated) * 100).toFixed(1) : '0.0';

  const updateHistoryOutcome = (id: string, outcome: 'WIN' | 'LOSS') => {
    const updated = history.map(h => {
      if (h.id === id) {
        return { ...h, outcome };
      }
      return h;
    });
    setHistory(updated);
    // save to storage
    localStorage.setItem('tlp_history', JSON.stringify(updated));
    triggerToast(
      'Signal Rated', 
      `Logged signal as ${outcome === 'WIN' ? 'WINNING (✓)' : 'LOSS (✗)'}. Statistics updated.`, 
      outcome === 'WIN' ? 'success' : 'warning'
    );
  };

  // Browser extension codebases templates
  const chromeExtensionFiles = {
    'manifest.json': `{
  "manifest_version": 3,
  "name": "TLP AI Trading Assistant Overlay",
  "version": "1.0.0",
  "description": "Institutional-quality market analysis & SMC confirmations overlaid on TradingView, Quotex, and Binance Futures.",
  "permissions": [
    "activeTab",
    "storage",
    "notifications"
  ],
  "host_permissions": [
    "*://*.tradingview.com/*",
    "*://*.quotex.io/*",
    "*://*.quotex.com/*",
    "*://*.binance.com/*",
    "https://*.run.app/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": [
        "*://*.tradingview.com/*",
        "*://*.quotex.io/*",
        "*://*.quotex.com/*",
        "*://*.binance.com/*"
      ],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ]
}`,

    'background.js': `// TLP Chrome Extension Background Worker proxying requests to TLP server backend
const BACKEND_URL = "${appUrl}";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzeMarket") {
    // Inject institutional metrics in real time
    fetch(\`\${BACKEND_URL}/api/analyze\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.payload)
    })
    .then(res => res.json())
    .then(data => {
      sendResponse({ success: true, data });
    })
    .catch(err => {
      console.error("TLP Backend Server Unreachable:", err);
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep message channel open for async response
  }
});`,

    'content.js': `// TLP Content script running directly inside the trader's active broker webpage
console.log("TLP Institutional AI Trading Assistant Initialized on " + window.location.hostname);

// Creates the floating Overlay element on broker layout
function createFloatingOverlay() {
  const div = document.createElement("div");
  div.id = "tlp-floating-frame";
  div.style.position = "fixed";
  div.style.top = "50px";
  div.style.right = "50px";
  div.style.width = "380px";
  div.style.height = "560px";
  div.style.zIndex = "10000000";
  div.style.borderRadius = "12px";
  div.style.overflow = "hidden";
  div.style.boxShadow = "0 25px 50px -12px rgba(0,0,0,0.5)";
  div.style.border = "1px solid rgba(255,255,255,0.1)";
  
  // Directly embeds this interactive deployed Web Interface
  div.innerHTML = \`<iframe src="${appUrl}" style="width:100%; height:100%; border:none;" allow="clipboard-read; clipboard-write"></iframe>\`;
  document.body.appendChild(div);
}

// Automatically mount when loaded
if (!document.getElementById("tlp-floating-frame")) {
  createFloatingOverlay();
}`
  };

  return (
    <div className="w-full flex flex-col bg-[#16181D] border border-gray-700 rounded-xl overflow-hidden shadow-2xl shadow-black glow-border-blue" id="extension-playground">
      
      {/* 1. Broker Platform Selector (Simulated Browser Hub) */}
      <div className="p-4 border-b border-gray-700 bg-[#1C1F26]">
        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Simulated Active Broker Platform</span>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'Quotex', name: 'Quotex.io', isOtc: true },
            { id: 'Binance', name: 'Binance Futures', isOtc: false },
            { id: 'TradingView', name: 'TradingView', isOtc: false }
          ].map(plat => (
            <button
              key={plat.id}
              onClick={() => {
                setActivePlatform(plat.id);
                setIsOtc(plat.isOtc);
                triggerToast('Broker Switched', `Active page set to ${plat.name} ${plat.isOtc ? '(OTC Market)' : '(Standard Market)'}`, 'info');
              }}
              className={`p-2 rounded text-center cursor-pointer transition-all ${
                activePlatform === plat.id 
                  ? 'bg-blue-600 text-white font-bold scale-[1.03] shadow-md glow-border-blue' 
                  : 'bg-[#121418] text-gray-400 hover:text-gray-200 border border-gray-800'
              }`}
            >
              <div className="text-[11px] truncate font-medium">{plat.name}</div>
              <div className="text-[7px] tracking-wider opacity-80 mt-0.5">{plat.isOtc ? 'OTC' : 'STANDARD'}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Control center tabs */}
      <div className="flex border-b border-gray-700 bg-[#121418] text-xs font-semibold">
        <button
          onClick={() => setActivePlaygroundTab('SCANNER')}
          className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
            activePlaygroundTab === 'SCANNER' ? 'border-blue-500 text-blue-400 bg-gray-900/10' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            <span>MARKET SCANNER</span>
          </div>
        </button>
        <button
          onClick={() => setActivePlaygroundTab('HISTORY')}
          className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
            activePlaygroundTab === 'HISTORY' ? 'border-blue-500 text-blue-400 bg-gray-900/10' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            <span>SIGNAL LOG</span>
            {history.length > 0 && (
              <span className="bg-blue-500/10 text-blue-400 text-[9px] px-1.5 py-0.2 rounded-full border border-blue-500/20">
                {history.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActivePlaygroundTab('CODE')}
          className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
            activePlaygroundTab === 'CODE' ? 'border-blue-500 text-blue-400 bg-gray-900/10' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            <span>EXTENSION CODE</span>
          </div>
        </button>
        <button
          onClick={() => setActivePlaygroundTab('GUIDE')}
          className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
            activePlaygroundTab === 'GUIDE' ? 'border-blue-500 text-blue-400 bg-gray-900/10' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>INTEGRATION GUIDE</span>
          </div>
        </button>
      </div>

      {/* 3. Panel Content Area */}
      <div className="p-4 flex-1 overflow-y-auto max-h-[420px] scrollbar-thin scrollbar-thumb-slate-800 bg-gradient-to-br from-[#16181D] to-[#0F1115]">
        
        {/* TAB 1: SCANNER */}
        {activePlaygroundTab === 'SCANNER' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h4 className="text-sm font-bold text-slate-200">Continuous AI Market Scanner</h4>
                <p className="text-[10px] text-slate-500">Real-time indicators scanned across top broker indices and liquidity hubs.</p>
              </div>
              <button
                onClick={fetchScanner}
                disabled={isLoadingScanner}
                className="text-[10px] bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold px-2 py-1 rounded border border-slate-850 cursor-pointer disabled:opacity-50"
              >
                {isLoadingScanner ? 'SCANNING...' : 'FORCE REFRESH'}
              </button>
            </div>

            {isLoadingScanner && !scannerData ? (
              <div className="flex justify-center items-center py-10 text-xs text-slate-400 gap-2">
                <Clock className="w-4 h-4 animate-spin text-amber-500" />
                <span>Broadcasting AI signals...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                
                {/* Top Buying Segment */}
                <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg flex flex-col gap-2">
                  <span className="text-[9px] font-extrabold text-emerald-400 tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> TOP BUY SIGNALS
                  </span>
                  <div className="flex flex-col gap-1.5 mt-1">
                    {scannerData?.topBuy.slice(0, 3).map((item, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelectScannerItem(item.symbol, item.symbol.includes('OTC'))}
                        className="bg-slate-900 hover:bg-slate-850 p-2 rounded flex items-center justify-between text-[11px] border border-slate-850 hover:border-emerald-500/40 cursor-pointer transition-all"
                      >
                        <span className="font-bold text-slate-300">{item.symbol}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-mono">{item.price.toFixed(item.price > 1000 ? 1 : 4)}</span>
                          <span className="bg-emerald-500/10 text-emerald-400 px-1 rounded text-[9px] font-bold">
                            {item.confidence}%
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!scannerData || scannerData.topBuy.length === 0) && (
                      <span className="text-[10px] text-slate-600 italic">No strong buy filters filled currently.</span>
                    )}
                  </div>
                </div>

                {/* Top Selling Segment */}
                <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg flex flex-col gap-2">
                  <span className="text-[9px] font-extrabold text-rose-400 tracking-wider flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> TOP SELL SIGNALS
                  </span>
                  <div className="flex flex-col gap-1.5 mt-1">
                    {scannerData?.topSell.slice(0, 3).map((item, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelectScannerItem(item.symbol, item.symbol.includes('OTC'))}
                        className="bg-slate-900 hover:bg-slate-850 p-2 rounded flex items-center justify-between text-[11px] border border-slate-850 hover:border-rose-500/40 cursor-pointer transition-all"
                      >
                        <span className="font-bold text-slate-300">{item.symbol}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-mono">{item.price.toFixed(item.price > 1000 ? 1 : 4)}</span>
                          <span className="bg-rose-500/10 text-rose-400 px-1 rounded text-[9px] font-bold">
                            {item.confidence}%
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!scannerData || scannerData.topSell.length === 0) && (
                      <span className="text-[10px] text-slate-600 italic">No strong sell filters filled currently.</span>
                    )}
                  </div>
                </div>

                {/* Top Reversals & Scalping */}
                <div className="col-span-2 grid grid-cols-3 gap-2 mt-1">
                  {[
                    { label: 'TOP BREAKOUTS', items: scannerData?.topBreakout || [], badgeColor: 'bg-indigo-500/15 text-indigo-400' },
                    { label: 'TOP TRENDS', items: scannerData?.topTrending || [], badgeColor: 'bg-amber-500/15 text-amber-400' },
                    { label: 'HIGH CONFIDENCE', items: scannerData?.topReversal || [], badgeColor: 'bg-emerald-500/15 text-emerald-400' }
                  ].map((block, bIdx) => (
                    <div key={bIdx} className="bg-slate-950/20 border border-slate-850 p-2.5 rounded">
                      <span className="text-[8px] text-slate-500 block uppercase font-black tracking-widest mb-1.5">{block.label}</span>
                      <div className="flex flex-col gap-1">
                        {block.items.slice(0, 2).map((item, i) => (
                          <div
                            key={i}
                            onClick={() => handleSelectScannerItem(item.symbol, item.symbol.includes('OTC'))}
                            className="bg-slate-900 hover:bg-slate-850 p-1.5 rounded flex justify-between items-center text-[10px] cursor-pointer border border-transparent hover:border-slate-700 truncate"
                          >
                            <span className="text-slate-300 font-semibold truncate">{item.symbol}</span>
                            <span className={`text-[8px] px-1 rounded font-bold ${block.badgeColor}`}>{item.confidence}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 2: SIGNAL HISTORY */}
        {activePlaygroundTab === 'HISTORY' && (
          <div className="flex flex-col gap-3">
            {/* Win rate indicator banner */}
            <div className="bg-slate-950/80 border border-gray-700 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">SIGNAL PERFORMANCE TRACKER</span>
                <span className="text-xs text-gray-300 mt-0.5 block">Rate signals win/loss to update statistics locally.</span>
              </div>
              <div className="text-right flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 px-3 rounded-lg border border-blue-500/20">
                  <span className="text-[8px] text-gray-450 block">WIN RATE</span>
                  <span className="text-lg font-black font-mono text-blue-400">{winRatePercent}%</span>
                </div>
                <div className="text-xs font-mono text-gray-300 leading-tight">
                  <div>Wins: <span className="text-emerald-400 font-bold">{winsCount}</span></div>
                  <div>Total: <span className="text-gray-400 font-semibold">{totalRated}</span></div>
                </div>
              </div>
            </div>

            {/* List of recent signals */}
            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs italic">
                No signal scans saved yet. Recent signals will populate here automatically.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {history.slice(0, 15).map((item, idx) => (
                  <div key={idx} className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg flex flex-col gap-2 text-xs">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{item.symbol}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({item.timeframe})</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900/50 p-1.5 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">BIAS:</span>
                        <span className={`font-bold font-mono ${
                          item.bias.includes('BUY') ? 'text-emerald-400' : item.bias.includes('SELL') ? 'text-rose-400' : 'text-slate-400'
                        }`}>{item.bias}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">CONFIDENCE:</span>
                        <span className="font-mono text-amber-400 font-semibold">{item.confidence}%</span>
                      </div>
                    </div>

                    {/* Win/Loss logger buttons */}
                    <div className="flex items-center justify-between border-t border-slate-900 pt-2 mt-1">
                      <span className="text-[10px] text-slate-500">Record Signal Outcome:</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateHistoryOutcome(item.id, 'WIN')}
                          className={`flex items-center gap-1 p-1 px-2.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                            item.outcome === 'WIN' 
                              ? 'bg-emerald-500 text-slate-950' 
                              : 'bg-slate-900 text-slate-400 hover:text-emerald-400 border border-slate-850'
                          }`}
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>WIN</span>
                        </button>
                        <button
                          onClick={() => updateHistoryOutcome(item.id, 'LOSS')}
                          className={`flex items-center gap-1 p-1 px-2.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                            item.outcome === 'LOSS' 
                              ? 'bg-rose-500 text-slate-950' 
                              : 'bg-slate-900 text-slate-400 hover:text-rose-400 border border-slate-850'
                          }`}
                        >
                          <XCircle className="w-3 h-3" />
                          <span>LOSS</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EXTENSION CODE */}
        {activePlaygroundTab === 'CODE' && (
          <div className="flex flex-col gap-4">
            <div className="border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-slate-200">Chrome Extension MV3 Core Scripts</h4>
              <p className="text-[10px] text-slate-500">
                Create these files locally, load them as unpacked, and TLP will float directly inside your real broker window!
              </p>
            </div>

            {Object.entries(chromeExtensionFiles).map(([filename, code]) => (
              <div key={filename} className="flex flex-col border border-slate-800 rounded bg-slate-950 overflow-hidden text-xs">
                <div className="bg-slate-900 px-3 py-1.5 flex items-center justify-between border-b border-slate-850">
                  <span className="font-mono text-slate-300 text-[11px] font-semibold">{filename}</span>
                  <button
                    onClick={() => handleCopyCode(filename, code)}
                    className="p-1 px-2 hover:bg-slate-850 rounded text-slate-400 hover:text-slate-200 cursor-pointer flex items-center gap-1 text-[10px] transition-colors"
                  >
                    {copiedFile === filename ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedFile === filename ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 text-[10px] font-mono overflow-x-auto text-slate-400 max-h-[160px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-900 whitespace-pre">
                  {code}
                </pre>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: GUIDE */}
        {activePlaygroundTab === 'GUIDE' && (
          <div className="flex flex-col gap-4 text-xs leading-relaxed text-slate-300">
            <div className="border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1">
                <Award className="w-4 h-4 text-amber-500" /> Connecting to Real Broker Platforms
              </h4>
              <p className="text-[10px] text-slate-500">How to load TLP as a functional Google Chrome extension.</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="bg-slate-950/40 p-3.5 rounded-lg border border-slate-850 flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold font-mono text-xs flex-shrink-0">
                  1
                </div>
                <div>
                  <h5 className="font-bold text-slate-200">Create Extension Folder</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Create a new folder on your computer named <code className="bg-slate-950 text-amber-400 px-1 rounded font-mono text-[10px]">TLP-Extension</code>.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/40 p-3.5 rounded-lg border border-slate-850 flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold font-mono text-xs flex-shrink-0">
                  2
                </div>
                <div>
                  <h5 className="font-bold text-slate-200">Save Manifest & Workers</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Save the scripts from the <strong className="text-amber-500">EXTENSION CODE</strong> tab into files named exactly <code className="bg-slate-950 text-slate-300 px-1 rounded font-mono">manifest.json</code>, <code className="bg-slate-950 text-slate-300 px-1 rounded font-mono">background.js</code>, and <code className="bg-slate-950 text-slate-300 px-1 rounded font-mono">content.js</code> inside that folder.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/40 p-3.5 rounded-lg border border-slate-850 flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold font-mono text-xs flex-shrink-0">
                  3
                </div>
                <div>
                  <h5 className="font-bold text-slate-200">Load Unpacked in Chrome</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Open Google Chrome and navigate to <code className="bg-slate-950 text-slate-300 px-1 rounded font-mono">chrome://extensions</code>. Enable <strong className="text-amber-500">Developer Mode</strong> in the top-right corner. Click <strong className="text-slate-200">Load unpacked</strong> and select your extension folder.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/40 p-3.5 rounded-lg border border-slate-850 flex gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold font-mono text-xs flex-shrink-0 animate-pulse">
                  ✓
                </div>
                <div>
                  <h5 className="font-bold text-emerald-400">Open Your Broker & Confirm</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Navigate to Quotex, Binance, or TradingView. The TLP overlay will slide in automatically and connect in real time to this exact deployed sandbox API route!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
