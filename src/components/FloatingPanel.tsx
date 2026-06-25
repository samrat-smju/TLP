import { useState, useEffect, useRef, MouseEvent } from 'react';
import { AIAnalysisResult, AppSettings } from '../types';
import { 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  EyeOff, 
  Settings as SettingsIcon, 
  Sliders, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Activity, 
  ShieldAlert, 
  Layers, 
  VolumeX, 
  Sparkles, 
  RefreshCw, 
  X,
  Lock,
  Compass,
  AlertTriangle,
  Flame,
  Info,
  Camera,
  UploadCloud,
  FileImage,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FloatingPanelProps {
  analysis?: AIAnalysisResult;
  isLoading: boolean;
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  onAnalyze: () => void;
  isVisible: boolean;
  setVisible: (v: boolean) => void;
  setAnalysis?: (a: any) => void;
  setIsLoading?: (l: boolean) => void;
  currentSymbol?: string;
  currentTimeframe?: string;
}

export default function FloatingPanel({
  analysis,
  isLoading,
  settings,
  updateSettings,
  onAnalyze,
  isVisible,
  setVisible,
  setAnalysis,
  setIsLoading,
  currentSymbol,
  currentTimeframe
}: FloatingPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 30, y: 30 });
  const [size, setSize] = useState({ width: 380, height: 560 });
  const [activeTab, setActiveTab] = useState<'BIAS' | 'SMC' | 'REASONING' | 'FUTURES' | 'VISUAL_SCAN' | 'SETTINGS'>('BIAS');

  // Vision scanner drag-drop and clipboard states
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/png");
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanningImage, setIsScanningImage] = useState(false);

  const handleDrag = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setScanError("Please upload a valid image file of a chart.");
      return;
    }
    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedImage(event.target.result as string);
        setScanError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: any) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClipboardPaste = (e: any) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) processFile(blob);
        }
      }
    }
  };

  // Clipboard paste handler mounted on window during active tab
  useEffect(() => {
    if (activeTab === 'VISUAL_SCAN') {
      const handlePaste = (e: ClipboardEvent) => {
        handleClipboardPaste(e);
      };
      window.addEventListener('paste', handlePaste);
      return () => {
        window.removeEventListener('paste', handlePaste);
      };
    }
  }, [activeTab]);

  const handleAnalyzeImage = async () => {
    if (!selectedImage) return;
    setIsScanningImage(true);
    setScanError(null);
    if (setIsLoading) setIsLoading(true);

    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: imageMime,
          symbol: currentSymbol || 'Active Browser Chart',
          timeframe: currentTimeframe || '1M'
        })
      });

      if (!res.ok) {
        throw new Error('Server returned an error for visual analysis');
      }

      const result = await res.json();
      if (setAnalysis) {
        setAnalysis(result);
        setActiveTab('BIAS'); // jump to Signal tab to show results!
      }
    } catch (e: any) {
      console.error(e);
      setScanError(e.message || 'Failed to scan image. Please try again.');
    } finally {
      setIsScanningImage(false);
      if (setIsLoading) setIsLoading(false);
    }
  };
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [futuresTimeframe, setFuturesTimeframe] = useState<'5M' | '15M'>('5M');

  useEffect(() => {
    const getMsToAdd = () => {
      switch (analysis?.timeframe) {
        case '15S': return 15 * 1000;
        case '30S': return 30 * 1000;
        case '1M': return 60 * 1000;
        case '2M': return 2 * 60 * 1000;
        case '3M': return 3 * 60 * 1000;
        case '5M': return 5 * 60 * 1000;
        case '15M': return 15 * 60 * 1000;
        case '30M': return 30 * 60 * 1000;
        case '1H': return 60 * 60 * 1000;
        default: return 60 * 1000;
      }
    };

    const update = () => {
      const ms = getMsToAdd();
      const now = Date.now();
      const nextStartMs = Math.ceil(now / ms) * ms;
      const diff = Math.max(0, Math.ceil((nextStartMs - now) / 1000));
      setSecondsLeft(diff);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [analysis?.timeframe]);

  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Drag state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panelStart = useRef({ x: 0, y: 0 });

  // Resize state
  const isResizing = useRef(false);
  const resizeStartSize = useRef({ width: 0, height: 0 });
  const resizeStartMouse = useRef({ x: 0, y: 0 });

  // Hotkey listener (Alt + Shift + T) to toggle visibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyT') {
        setVisible(!isVisible);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  // Handle Dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        
        // Boundaries: restrict panel within simulated container
        const newX = Math.max(10, Math.min(window.innerWidth - size.width - 20, panelStart.current.x + dx));
        const newY = Math.max(10, Math.min(window.innerHeight - 80, panelStart.current.y + dy));
        
        setPosition({ x: newX, y: newY });
      }

      if (isResizing.current) {
        const dx = e.clientX - resizeStartMouse.current.x;
        const dy = e.clientY - resizeStartMouse.current.y;
        
        const newWidth = Math.max(300, Math.min(600, resizeStartSize.current.width + dx));
        const newHeight = Math.max(250, Math.min(800, resizeStartSize.current.height + dy));
        
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      isResizing.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [size]);

  const onDragStart = (e: MouseEvent) => {
    // Only drag from header handle
    if (e.target !== dragRef.current && !dragRef.current?.contains(e.target as Node)) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panelStart.current = { ...position };
    e.preventDefault();
  };

  const onResizeStart = (e: MouseEvent) => {
    isResizing.current = true;
    resizeStartMouse.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = { ...size };
    e.preventDefault();
  };

  if (!isVisible) {
    return (
      <button 
        onClick={() => setVisible(true)}
        className="fixed bottom-6 right-6 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-3 rounded-full flex items-center gap-2 shadow-2xl z-[999] cursor-pointer transition-all border border-amber-400"
        id="btn-restore-panel"
      >
        <Zap className="w-5 h-5 animate-pulse" />
        <span>TLP overlay (Alt+Shift+T)</span>
      </button>
    );
  }

  // Visual variables based on Theme - Styled with Professional Polish theme
  const isDark = settings.theme === 'DARK';
  const themeClasses = isDark
    ? 'bg-[#16181D]/98 text-gray-200 border-gray-700 shadow-2xl shadow-black glow-border-blue'
    : 'bg-white/98 text-slate-900 border-slate-200 shadow-xl';
  const subTextClass = isDark ? 'text-gray-400' : 'text-slate-600';

  const getBiasConfig = (bias?: string) => {
    switch (bias) {
      case 'STRONG_BUY':
        return { label: 'STRONG BUY', bg: 'bg-green-900/25 border-green-700/50', text: 'text-green-400', iconColor: 'text-green-500' };
      case 'BUY':
        return { label: 'BUY', bg: 'bg-green-900/15 border-green-800/40', text: 'text-green-400', iconColor: 'text-green-500' };
      case 'SELL':
        return { label: 'SELL', bg: 'bg-red-900/15 border-red-800/40', text: 'text-red-400', iconColor: 'text-red-500' };
      case 'STRONG_SELL':
        return { label: 'STRONG SELL', bg: 'bg-red-900/25 border-red-700/50', text: 'text-red-400', iconColor: 'text-red-500' };
      case 'NO_TRADE':
        return { label: 'NO TRADE (WAIT)', bg: 'bg-amber-950/40 border-amber-800/40', text: 'text-amber-400', iconColor: 'text-amber-500' };
      default:
        return { label: 'NEUTRAL / SCANNING', bg: 'bg-gray-800 border-gray-700', text: 'text-gray-400', iconColor: 'text-gray-500' };
    }
  };

  const biasConfig = getBiasConfig(analysis?.bias);

  return (
    <div
      ref={panelRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isCollapsed ? 'auto' : `${size.height}px`,
        opacity: settings.opacity,
        zIndex: 999
      }}
      className={`fixed border rounded-xl shadow-2xl flex flex-col overflow-hidden select-none transition-opacity duration-150 ${themeClasses}`}
      id="tlp-floating-panel"
    >
      {/* 1. HEADER (DRAG BAR) */}
      <div
        ref={dragRef}
        onMouseDown={onDragStart}
        className={`px-4 py-3 border-b flex items-center justify-between cursor-move select-none ${
          isDark ? 'bg-[#1C1F26] border-gray-750' : 'bg-slate-100 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
          <span className="font-bold tracking-wider text-xs flex items-center gap-1 font-sans text-white">
            TLP <span className="text-[10px] text-blue-400 font-mono">v1.0</span>
          </span>
        </div>

        {/* Live Market Parameters summary */}
        {analysis && !isCollapsed && (
          <div className="text-[10px] bg-gray-800 rounded px-2.5 py-1 text-blue-100 flex items-center gap-2 border border-gray-700">
            <span className="font-mono">{analysis.symbol} • {analysis.timeframe}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-800 rounded cursor-pointer transition-colors"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
          </button>
          <button
            onClick={() => setVisible(false)}
            className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded cursor-pointer transition-colors"
            title="Minimize to Widget"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* COLLAPSED BODY (MINIMAL BAR) */}
      {isCollapsed && (
        <div className="p-3 flex items-center justify-between bg-[#121418] text-white border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-blue-300">
              {analysis?.symbol || 'SCANNING'}
            </span>
            <span className="text-xs text-gray-500">@</span>
            <span className="text-xs font-semibold font-mono text-green-400">{analysis?.price.toFixed(5) || '0.000'}</span>
          </div>
          <div className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${biasConfig.bg} ${biasConfig.text}`}>
            {biasConfig.label}
          </div>
          <button
            onClick={onAnalyze}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-500 text-white p-1 px-2.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'SCAN'}
          </button>
        </div>
      )}

      {/* 2. EXPANDED BODY */}
      {!isCollapsed && (
        <>
          {/* Quick Stats Bar */}
          {analysis && (
            <div className={`grid grid-cols-4 border-b divide-x text-[10px] font-medium ${
              isDark ? 'bg-[#121418] border-gray-700 divide-gray-750' : 'bg-slate-50 border-slate-200 divide-slate-200'
            }`}>
              <div className="p-2 text-center">
                <span className={`block uppercase text-[8px] tracking-wider text-gray-500`}>Price</span>
                <span className="font-mono text-gray-300 font-semibold">{analysis.price.toFixed(analysis.price > 1000 ? 2 : 5)}</span>
              </div>
              <div className="p-2 text-center">
                <span className={`block uppercase text-[8px] tracking-wider text-gray-500`}>Spread</span>
                <span className="text-gray-300 font-semibold">{analysis.spread} pips</span>
              </div>
              <div className="p-2 text-center">
                <span className={`block uppercase text-[8px] tracking-wider text-gray-500`}>Session</span>
                <span className="text-gray-300 truncate font-semibold">{analysis.session.split(' ')[0]}</span>
              </div>
              <div className="p-2 text-center">
                <span className={`block uppercase text-[8px] tracking-wider text-gray-500`}>Status</span>
                <span className="text-green-400 font-semibold flex items-center justify-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
                </span>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className={`flex overflow-x-auto whitespace-nowrap scrollbar-none border-b text-[9px] font-bold tracking-wider ${
            isDark ? 'bg-[#121418] border-gray-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setActiveTab('BIAS')}
              className={`flex-1 min-w-[65px] py-2 text-center border-b-2 transition-colors cursor-pointer ${
                activeTab === 'BIAS' 
                  ? 'border-blue-500 text-blue-400 bg-gray-800/10' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              SIGNAL
            </button>
            <button
              onClick={() => setActiveTab('SMC')}
              className={`flex-1 min-w-[90px] py-2 text-center border-b-2 transition-colors cursor-pointer ${
                activeTab === 'SMC' 
                  ? 'border-blue-500 text-blue-400 bg-gray-800/10' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              SMC LANDMARKS
            </button>
            <button
              onClick={() => setActiveTab('REASONING')}
              className={`flex-1 min-w-[80px] py-2 text-center border-b-2 transition-colors cursor-pointer ${
                activeTab === 'REASONING' 
              ? 'border-blue-500 text-blue-400 bg-gray-800/10' 
              : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              EXPLANATION
            </button>
            <button
              onClick={() => setActiveTab('FUTURES')}
              className={`flex-1 min-w-[85px] py-2 text-center border-b-2 transition-colors cursor-pointer ${
                activeTab === 'FUTURES' 
              ? 'border-blue-500 text-blue-400 bg-gray-800/10' 
              : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              FUTURE TRADE
            </button>
            <button
              onClick={() => setActiveTab('VISUAL_SCAN')}
              className={`flex-1 min-w-[90px] py-2 text-center border-b-2 transition-colors cursor-pointer ${
                activeTab === 'VISUAL_SCAN' 
              ? 'border-blue-500 text-blue-400 bg-gray-800/10' 
              : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              VISUAL SCAN 📸
            </button>
            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`flex-1 min-w-[60px] py-2 text-center border-b-2 transition-colors cursor-pointer ${
                activeTab === 'SETTINGS' 
              ? 'border-blue-500 text-blue-400 bg-gray-800/10' 
              : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              CONFIG
            </button>
          </div>

          {/* Tab Content area with scrolling */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 font-sans text-sm scrollbar-thin scrollbar-thumb-slate-800 bg-gradient-to-br from-[#16181D] to-[#0F1115]">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 gap-3">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                <div className="text-center">
                  <span className="font-bold text-xs text-amber-400 block tracking-widest uppercase">Analyzing Chart</span>
                  <span className="text-[10px] text-slate-500">Querying TLP Institutional AI Engine...</span>
                </div>
              </div>
            ) : !analysis ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center gap-3">
                <Compass className="w-10 h-10 text-slate-600 animate-bounce" />
                <div className="max-w-[250px]">
                  <p className="font-bold text-xs text-slate-400">NO LIVE ANALYSIS FOUND</p>
                  <p className="text-[10px] text-slate-500 mt-1">Open a trading chart or click the trigger below to run full AI technical analysis.</p>
                </div>
                <button
                  onClick={onAnalyze}
                  className="mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2 rounded shadow cursor-pointer transition-transform"
                >
                  START AI SCANNER
                </button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === 'BIAS' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-4"
                  >
                    {/* Primary Bias Banner */}
                    <div className={`p-4 rounded-xl border text-center flex flex-col items-center gap-1.5 ${biasConfig.bg}`}>
                      <span className="text-[9px] tracking-widest font-bold text-slate-400 block">AI CONSENSUS BIAS</span>
                      <h2 className={`text-2xl font-black font-mono tracking-tighter ${biasConfig.text}`}>
                        {biasConfig.label}
                      </h2>
                      {analysis.bias !== 'NO_TRADE' && (
                        <div className="flex items-center gap-4 mt-2 w-full text-[10px] font-mono justify-center">
                          <span className="bg-slate-950/50 px-2 py-1 rounded border border-slate-800">
                            Confidence: <strong className="text-amber-400">{analysis.confidence}%</strong>
                          </span>
                          <span className="bg-slate-950/50 px-2 py-1 rounded border border-slate-800">
                            Outlook: <strong className={analysis.nextCandleOutlook === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}>{analysis.nextCandleOutlook}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Dashboard Metrics (Scores) */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-950/40 border border-slate-800 p-2.5 rounded-lg text-center">
                        <span className="text-[8px] text-slate-500 block uppercase font-bold tracking-wider">Institutional</span>
                        <div className="text-base font-bold font-mono text-indigo-400 mt-0.5">{analysis.institutionalScore}%</div>
                      </div>
                      <div className="bg-slate-950/40 border border-slate-800 p-2.5 rounded-lg text-center">
                        <span className="text-[8px] text-slate-500 block uppercase font-bold tracking-wider">Risk Index</span>
                        <div className="text-base font-bold font-mono text-red-400 mt-0.5">{analysis.riskScore}%</div>
                      </div>
                      <div className="bg-slate-950/40 border border-slate-800 p-2.5 rounded-lg text-center">
                        <span className="text-[8px] text-slate-500 block uppercase font-bold tracking-wider">Setup Quality</span>
                        <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">{analysis.tradeQualityScore}%</div>
                      </div>
                    </div>

                    {/* QUOTEX BINARY SIGNAL CARD */}
                    <div className="bg-slate-950/80 border border-blue-500/35 rounded-xl p-4 flex flex-col gap-3 shadow-lg relative overflow-hidden">
                      {/* Decorative top pulse badge */}
                      <div className="absolute top-0 right-0 bg-blue-500/10 text-blue-400 text-[8px] font-bold px-2.5 py-1 rounded-bl-lg border-l border-b border-blue-500/25 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" /> QUOTEX ACTIVE
                      </div>

                      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                        <Activity className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[10px] font-black text-blue-300 tracking-wide">QUOTEX BINARY OPTIONS PREDICTOR</span>
                      </div>

                      {analysis.binaryPrediction ? (
                        <div className="flex flex-col gap-3">
                          {/* Main Prediction row */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Direction CALL / PUT */}
                            <div className="bg-[#121418] p-2.5 rounded-lg border border-gray-800 flex flex-col items-center text-center">
                              <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">DIRECTION</span>
                              <div className={`text-base font-black font-mono mt-1 flex items-center gap-1 ${
                                analysis.binaryPrediction.direction.includes('CALL') ? 'text-green-400' : analysis.binaryPrediction.direction.includes('PUT') ? 'text-red-400' : 'text-gray-400'
                              }`}>
                                {analysis.binaryPrediction.direction.includes('CALL') ? (
                                  <>
                                    <ChevronUp className="w-4 h-4 text-green-400 animate-bounce" /> CALL
                                  </>
                                ) : analysis.binaryPrediction.direction.includes('PUT') ? (
                                  <>
                                    <ChevronDown className="w-4 h-4 text-red-400 animate-bounce" /> PUT
                                  </>
                                ) : (
                                  'WAIT'
                                )}
                              </div>
                            </div>

                            {/* Candle Color */}
                            <div className="bg-[#121418] p-2.5 rounded-lg border border-gray-800 flex flex-col items-center text-center">
                              <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">CANDLE COLOR</span>
                              <div className={`text-sm font-black font-mono mt-1 flex items-center gap-1.5 ${
                                analysis.binaryPrediction.candleColor === 'GREEN' ? 'text-green-400' : analysis.binaryPrediction.candleColor === 'RED' ? 'text-red-400' : 'text-gray-400'
                              }`}>
                                <div className={`w-3.5 h-3.5 rounded-sm ${
                                  analysis.binaryPrediction.candleColor === 'GREEN' ? 'bg-green-500 shadow-green-500/30 shadow' : analysis.binaryPrediction.candleColor === 'RED' ? 'bg-red-500 shadow-red-500/30 shadow' : 'bg-gray-500'
                                }`} />
                                {analysis.binaryPrediction.candleColor}
                              </div>
                            </div>
                          </div>

                          {/* Secondary Prediction metrics */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Candle Size */}
                            <div className="bg-[#121418] p-2 flex justify-between items-center px-3 rounded-lg border border-gray-800">
                              <span className="text-[8px] text-gray-500 uppercase font-bold">CANDLE SIZE</span>
                              <span className={`text-[11px] font-black font-mono ${
                                analysis.binaryPrediction.candleSize === 'LARGE' ? 'text-blue-400' : analysis.binaryPrediction.candleSize === 'MEDIUM' ? 'text-indigo-300' : 'text-gray-400'
                              }`}>{analysis.binaryPrediction.candleSize}</span>
                            </div>

                            {/* Countdown Time */}
                            <div className="bg-[#121418] p-2 flex justify-between items-center px-3 rounded-lg border border-gray-800">
                              <span className="text-[8px] text-gray-500 uppercase font-bold">NEXT CANDLE IN</span>
                              <span className="text-[11px] font-black font-mono text-amber-400 animate-pulse">{secondsLeft}s</span>
                            </div>
                          </div>

                          {/* Expiration Details */}
                          <div className="bg-[#121418]/60 p-2 rounded-lg border border-gray-800 text-[10px] font-mono text-gray-400 flex items-center justify-between">
                            <span className="text-gray-500">Expirations:</span>
                            <span className="text-gray-300 font-medium truncate ml-2 text-[9px]">
                              {analysis.binaryPrediction.expirationTime}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic text-center">Binary options predictive metrics generating...</p>
                      )}
                    </div>

                    {/* Trade Confirmation Zone */}
                    {analysis.bias !== 'NO_TRADE' && analysis.setup ? (
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            INSTITUTIONAL ENTRY SETUP
                          </span>
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                            R:R = {analysis.setup.riskRewardRatio}
                          </span>
                        </div>

                        {/* Trade Parameters Table */}
                        <div className="flex flex-col gap-2 text-xs font-mono">
                          <div className="flex justify-between items-center py-1 border-b border-slate-900">
                            <span className="text-slate-500">Entry Zone</span>
                            <span className="text-amber-400 font-bold">
                              {analysis.setup.entryZone[0].toFixed(5)} - {analysis.setup.entryZone[1].toFixed(5)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-slate-900">
                            <span className="text-slate-500">Stop Loss</span>
                            <span className="text-red-400 font-bold">{analysis.setup.stopLoss.toFixed(5)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-slate-900">
                            <span className="text-slate-500">Take Profit 1</span>
                            <span className="text-emerald-400 font-bold">{analysis.setup.takeProfit1.toFixed(5)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-slate-900">
                            <span className="text-slate-500">Take Profit 2</span>
                            <span className="text-emerald-400 font-semibold">{analysis.setup.takeProfit2.toFixed(5)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-slate-900">
                            <span className="text-slate-500">Take Profit 3</span>
                            <span className="text-emerald-500">{analysis.setup.takeProfit3.toFixed(5)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 text-[10px]">
                            <span className="text-slate-500">Invalidation Trigger</span>
                            <span className="text-slate-400">{analysis.setup.invalidationLevel.toFixed(5)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-xs text-amber-500 block">NO REASONABLE SETUP</span>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Core algorithms report high market noise or uncertainty above our risk bounds. No execution setup is provided to safeguard institutional capital. Wait for next structural sweep.
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'SMC' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-3.5"
                  >
                    <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                      <Layers className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-xs text-amber-400">SMART MONEY LANDMARKS DETECTED</span>
                    </div>

                    {/* Order Blocks list */}
                    <div>
                      <span className="text-[9px] tracking-widest font-extrabold text-slate-500 block uppercase mb-1.5">Order Blocks (OB)</span>
                      {analysis.smc.orderBlocks.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic">No strong order blocks formed on this timeframe segment.</p>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {analysis.smc.orderBlocks.map((ob, idx) => (
                            <div key={idx} className="bg-slate-950/40 border border-slate-800/80 p-2 rounded flex items-center justify-between text-xs">
                              <span className={`font-mono font-bold ${ob.type === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {ob.type} OB
                              </span>
                              <span className="font-mono text-[11px] text-slate-300">
                                {ob.priceStart.toFixed(5)} - {ob.priceEnd.toFixed(5)}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${ob.isMitigated ? 'bg-slate-800 text-slate-500' : 'bg-amber-500/10 text-amber-400 animate-pulse'}`}>
                                {ob.isMitigated ? 'Mitigated' : 'UNMITIGATED'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fair Value Gaps list */}
                    <div>
                      <span className="text-[9px] tracking-widest font-extrabold text-slate-500 block uppercase mb-1.5">Fair Value Gaps (FVG)</span>
                      {analysis.smc.fairValueGaps.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic">No FVGs left open in current segment.</p>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {analysis.smc.fairValueGaps.map((fvg, idx) => (
                            <div key={idx} className="bg-slate-950/40 border border-slate-800/80 p-2 rounded flex items-center justify-between text-xs">
                              <span className={`font-mono font-bold ${fvg.type === 'BULLISH' ? 'text-teal-400' : 'text-amber-500'}`}>
                                {fvg.type} FVG
                              </span>
                              <span className="font-mono text-[11px] text-slate-300">
                                {fvg.bottom.toFixed(5)} - {fvg.top.toFixed(5)}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${fvg.isFilled ? 'bg-slate-800 text-slate-500' : 'bg-teal-500/10 text-teal-400 animate-pulse'}`}>
                                {fvg.isFilled ? 'Filled' : 'OPEN TARGET'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Equilibrium & Liquidity Sweeps */}
                    <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-lg text-[11px] flex flex-col gap-2">
                      <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
                        <span className="text-slate-500 font-bold uppercase text-[9px]">Market Equilibrium</span>
                        <span className="font-mono text-amber-400 font-bold">EQ: {analysis.smc.equilibrium.equilibriumPrice.toFixed(5)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono">
                        <div className="bg-red-500/5 p-1 rounded border border-red-500/10">
                          <span className="text-red-400 block font-bold">PREMIUM ZONE</span>
                          <span className="text-slate-400 text-[9px]">{analysis.smc.equilibrium.premiumZone[0].toFixed(5)} - {analysis.smc.equilibrium.premiumZone[1].toFixed(5)}</span>
                        </div>
                        <div className="bg-emerald-500/5 p-1 rounded border border-emerald-500/10">
                          <span className="text-emerald-400 block font-bold">DISCOUNT ZONE</span>
                          <span className="text-slate-400 text-[9px]">{analysis.smc.equilibrium.discountZone[0].toFixed(5)} - {analysis.smc.equilibrium.discountZone[1].toFixed(5)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'REASONING' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-3.5"
                  >
                    <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                      <TrendingUp className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-xs text-amber-400">INSTITUTIONAL LOGICAL EXPLANATION</span>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {analysis.reasonings.map((reason, idx) => (
                        <div key={idx} className="flex gap-2.5 items-start bg-slate-950/20 border border-slate-850 p-2.5 rounded-lg">
                          <div className="w-5 h-5 rounded-full bg-slate-950 border border-amber-500/30 flex items-center justify-center text-amber-400 text-[10px] font-mono flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">{reason}</p>
                        </div>
                      ))}
                    </div>

                    {/* Indicator Snapshot Checklist */}
                    <div className="border border-slate-800 p-3 rounded-lg flex flex-col gap-2 mt-2 bg-slate-950/20">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block border-b border-slate-900 pb-1">Mathematical Engine Confirmation</span>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">RSI (14)</span>
                          <span className={analysis.indicators.momentum.rsi > 60 ? 'text-emerald-400' : analysis.indicators.momentum.rsi < 40 ? 'text-rose-400' : 'text-slate-300'}>{analysis.indicators.momentum.rsi}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Trend Strength</span>
                          <span className="text-amber-400 font-semibold">{analysis.indicators.trend.strength}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">SuperTrend</span>
                          <span className={analysis.indicators.trend.superTrend === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}>{analysis.indicators.trend.superTrend}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Volatility BB</span>
                          <span className="text-slate-300 font-semibold">{analysis.indicators.volatility.state}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'FUTURES' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                      <Compass className="w-4 h-4 text-blue-400 animate-pulse" />
                      <span className="font-bold text-xs text-blue-400">MACRO SWING & FUTURE PREDICTIONS</span>
                    </div>

                    {analysis.futurePrediction ? (
                      <div className="flex flex-col gap-3">
                        {/* Timeframe Selector tabs */}
                        <div className="flex bg-slate-900/60 p-1 rounded-lg border border-slate-800 text-[10px] items-center">
                          <button
                            onClick={() => setFuturesTimeframe('5M')}
                            className={`flex-1 py-1.5 rounded font-black text-center transition-all cursor-pointer ${
                              futuresTimeframe === '5M'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                            }`}
                          >
                            5M SCALP FUTURE
                          </button>
                          <button
                            onClick={() => setFuturesTimeframe('15M')}
                            className={`flex-1 py-1.5 rounded font-black text-center transition-all cursor-pointer ${
                              futuresTimeframe === '15M'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                            }`}
                          >
                            15M SWING FUTURE
                          </button>
                        </div>

                        {(() => {
                          const currentForecast = futuresTimeframe === '5M' 
                            ? (analysis.futurePrediction.fiveMin || {
                                macroDirection: analysis.futurePrediction.macroDirection,
                                reasoning: analysis.futurePrediction.reasoning,
                                entryZone: analysis.futurePrediction.entryZone,
                                stopLoss: analysis.futurePrediction.stopLoss,
                                takeProfit: analysis.futurePrediction.takeProfit
                              })
                            : (analysis.futurePrediction.fifteenMin || {
                                macroDirection: analysis.futurePrediction.macroDirection,
                                reasoning: analysis.futurePrediction.reasoning,
                                entryZone: analysis.futurePrediction.entryZone,
                                stopLoss: analysis.futurePrediction.stopLoss,
                                takeProfit: analysis.futurePrediction.takeProfit
                              });

                          return (
                            <div className="flex flex-col gap-3">
                              {/* Macro Direction Big Card */}
                              <div className="p-3.5 rounded-xl border flex flex-col items-center gap-1.5 relative overflow-hidden bg-slate-950/60 border-slate-800">
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                                  {futuresTimeframe} FORECAST BIAS
                                </span>
                                
                                <div className="flex items-center gap-2">
                                  {currentForecast.macroDirection === 'LONG' ? (
                                    <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-3.5 py-1.5 rounded-xl border border-green-500/25 font-black text-lg font-mono">
                                      <TrendingUp className="w-4 h-4 text-green-400 animate-bounce" />
                                      BUY / LONG
                                    </div>
                                  ) : currentForecast.macroDirection === 'SHORT' ? (
                                    <div className="flex items-center gap-2 bg-red-500/10 text-red-400 px-3.5 py-1.5 rounded-xl border border-red-500/25 font-black text-lg font-mono">
                                      <TrendingDown className="w-4 h-4 text-red-400 animate-bounce" />
                                      SELL / SHORT
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 bg-gray-500/10 text-gray-400 px-3.5 py-1.5 rounded-xl border border-gray-500/25 font-black text-lg font-mono">
                                      <Minus className="w-4 h-4 text-gray-400" />
                                      NEUTRAL
                                    </div>
                                  )}
                                </div>

                                <div className="text-[9px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                                  <span>Interval:</span>
                                  <span className="text-blue-400 font-bold">{futuresTimeframe === '5M' ? '5 Minutes (Intraday)' : '15 Minutes (Macro Swing)'}</span>
                                </div>
                              </div>

                              {/* Detailed Reasoning section */}
                              <div className="bg-slate-950/30 border border-slate-850 p-3 rounded-lg flex flex-col gap-1.5">
                                <span className="text-[8px] uppercase tracking-wider text-slate-500 font-black">
                                  WHY THE MARKET WILL GO {currentForecast.macroDirection}
                                </span>
                                <p className="text-xs text-slate-300 leading-relaxed font-sans">{currentForecast.reasoning}</p>
                              </div>

                              {/* Entry & Exit Zones */}
                              <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-lg text-xs flex flex-col gap-2.5">
                                <span className="text-[8px] uppercase tracking-wider text-slate-500 font-black border-b border-slate-900 pb-1 block">
                                  {futuresTimeframe} INSTITUTIONAL LEVELS
                                </span>
                                
                                {/* Entry Zone */}
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Optimal Entry Zone:
                                  </span>
                                  <span className="font-mono text-blue-300 font-bold">
                                    {currentForecast.entryZone[0].toFixed(5)} - {currentForecast.entryZone[1].toFixed(5)}
                                  </span>
                                </div>

                                {/* Stop Loss & Take Profit Targets */}
                                <div className="grid grid-cols-2 gap-2 mt-0.5">
                                  <div className="bg-red-500/5 border border-red-500/10 p-2 rounded-lg flex flex-col gap-0.5">
                                    <span className="text-[8px] text-red-400 font-bold uppercase tracking-wide">Stop Loss</span>
                                    <span className="font-mono text-xs font-bold text-red-300">{currentForecast.stopLoss.toFixed(5)}</span>
                                  </div>
                                  <div className="bg-green-500/5 border border-green-500/10 p-2 rounded-lg flex flex-col gap-0.5">
                                    <span className="text-[8px] text-green-400 font-bold uppercase tracking-wide">Take Profit Exit</span>
                                    <span className="font-mono text-xs font-bold text-green-300">{currentForecast.takeProfit.toFixed(5)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic text-center py-6">Macro futures prediction metrics compiling...</p>
                    )}
                  </motion.div>
                )}

                {activeTab === 'VISUAL_SCAN' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-4 text-xs"
                  >
                    <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                      <Camera className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-xs text-amber-400">VISUAL SCREENSHOT SCANNER</span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Analyze <strong className="text-slate-200">any broker chart</strong> you are currently browsing. Capture a screenshot of your active trading page and upload or paste it here.
                    </p>

                    {/* Drag & Drop or Paste Container */}
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-6 transition-all flex flex-col items-center justify-center text-center cursor-pointer min-h-[160px] ${
                        dragActive 
                          ? 'border-blue-500 bg-blue-500/5' 
                          : selectedImage 
                          ? 'border-emerald-500/50 bg-emerald-500/5' 
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="file"
                        id="screenshot-file-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleChange}
                      />

                      {selectedImage ? (
                        <div className="flex flex-col items-center gap-3 w-full">
                          <div className="relative max-h-[100px] overflow-hidden rounded border border-slate-800">
                            <img 
                              src={selectedImage} 
                              alt="Uploaded Chart" 
                              className="object-contain max-h-[90px]"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(null);
                              }}
                              className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 shadow-md transition-all flex items-center justify-center"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-1">
                              <FileImage className="w-3.5 h-3.5" /> Chart Loaded Successfully
                            </span>
                            <span className="text-[9px] text-slate-500">Press Run Scan to analyze this chart visual</span>
                          </div>
                        </div>
                      ) : (
                        <label 
                          htmlFor="screenshot-file-upload"
                          className="flex flex-col items-center justify-center gap-2 cursor-pointer w-full h-full"
                        >
                          <UploadCloud className="w-8 h-8 text-slate-500 animate-pulse" />
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-300">Drag & drop your screenshot here</span>
                            <span className="text-[10px] text-slate-500">or click to browse files</span>
                            <span className="text-[9px] text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full mt-1.5 inline-block mx-auto font-mono">
                              💡 Tip: Simply press Ctrl+V to paste screenshot!
                            </span>
                          </div>
                        </label>
                      )}
                    </div>

                    {scanError && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-lg flex items-start gap-2 text-[11px]">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                        <span>{scanError}</span>
                      </div>
                    )}

                    {/* Trigger Scan Button */}
                    <button
                      onClick={handleAnalyzeImage}
                      disabled={!selectedImage || isScanningImage}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 font-bold p-2.5 rounded-lg text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs uppercase tracking-wider"
                    >
                      {isScanningImage ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Vision Scan Processing...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 fill-current text-white animate-pulse" />
                          <span>Run AI Visual Scan</span>
                        </>
                      )}
                    </button>

                    <div className="border-t border-slate-900 pt-3 text-[10px] text-slate-500 flex flex-col gap-1.5 leading-relaxed font-sans">
                      <span className="font-bold text-slate-400 uppercase tracking-wide">How to use:</span>
                      <ol className="list-decimal pl-4 flex flex-col gap-1">
                        <li>Browse any broker (Quotex, Pocket Option, Binance, TradingView).</li>
                        <li>Take a screenshot of the active chart (Win+Shift+S / Cmd+Shift+4).</li>
                        <li>Click here and press <strong className="text-slate-400 font-mono">Ctrl+V</strong> to paste, or drag-and-drop the file.</li>
                        <li>Click "Run AI Visual Scan" to let Gemini extract live patterns, moving averages, and SMC structures automatically!</li>
                      </ol>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'SETTINGS' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-4 text-xs"
                  >
                    <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                      <Sliders className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-xs text-amber-400">EXTENSION CONFIGURATION</span>
                    </div>

                    {/* Opacity Control slider */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 font-medium">Panel Opacity</span>
                        <span className="font-mono text-amber-400 font-bold">{Math.round(settings.opacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.3"
                        max="1.0"
                        step="0.05"
                        value={settings.opacity}
                        onChange={(e) => updateSettings({ opacity: parseFloat(e.target.value) })}
                        className="w-full accent-amber-500 bg-slate-950 h-1.5 rounded cursor-pointer"
                      />
                    </div>

                    {/* Confidence Threshold */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 font-medium">Confidence Filter Threshold</span>
                        <span className="font-mono text-amber-400 font-bold">{settings.confidenceThreshold}%</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="90"
                        step="5"
                        value={settings.confidenceThreshold}
                        onChange={(e) => updateSettings({ confidenceThreshold: parseInt(e.target.value) })}
                        className="w-full accent-amber-500 bg-slate-950 h-1.5 rounded cursor-pointer"
                      />
                      <span className="text-[9px] text-slate-500 italic">
                        Setups below this confidence are forced to "NO TRADE" state to safeguard capital.
                      </span>
                    </div>

                    {/* Toggle Buttons */}
                    <div className="flex flex-col gap-2.5">
                      <div className="flex justify-between items-center border-b border-slate-900 py-1">
                        <span className="text-slate-400">Theme Selector</span>
                        <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800">
                          <button
                            onClick={() => updateSettings({ theme: 'DARK' })}
                            className={`px-2.5 py-1 text-[10px] rounded font-bold cursor-pointer transition-colors ${settings.theme === 'DARK' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                          >
                            DARK
                          </button>
                          <button
                            onClick={() => updateSettings({ theme: 'LIGHT' })}
                            className={`px-2.5 py-1 text-[10px] rounded font-bold cursor-pointer transition-colors ${settings.theme === 'LIGHT' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                          >
                            LIGHT
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-b border-slate-900 py-1">
                        <span className="text-slate-400">Sound Alerts</span>
                        <button
                          onClick={() => updateSettings({ notifications: { ...settings.notifications, sound: !settings.notifications.sound } })}
                          className={`px-3 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                            settings.notifications.sound ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-950 text-slate-500 border border-slate-900'
                          }`}
                        >
                          {settings.notifications.sound ? 'ENABLED' : 'MUTED'}
                        </button>
                      </div>

                      <div className="flex justify-between items-center border-b border-slate-900 py-1">
                        <span className="text-slate-400">Chrome Toast Popups</span>
                        <button
                          onClick={() => updateSettings({ notifications: { ...settings.notifications, browser: !settings.notifications.browser } })}
                          className={`px-3 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                            settings.notifications.browser ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-950 text-slate-500 border border-slate-900'
                          }`}
                        >
                          {settings.notifications.browser ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </div>

                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400">Filter Weak Alerts</span>
                        <button
                          onClick={() => updateSettings({ notifications: { ...settings.notifications, highConfidenceOnly: !settings.notifications.highConfidenceOnly } })}
                          className={`px-3 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                            settings.notifications.highConfidenceOnly ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-950 text-slate-500 border border-slate-900'
                          }`}
                        >
                          {settings.notifications.highConfidenceOnly ? 'HIGH CONFIDENCE' : 'ALL ALERTS'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* 3. FOOTER TRIGGER */}
          <div className={`p-3 border-t flex justify-between items-center ${
            isDark ? 'bg-[#121418] border-gray-750' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[8px] font-mono text-gray-500 tracking-widest flex items-center gap-1">
              <Lock className="w-2.5 h-2.5 text-blue-500/80" /> DECISION ASSISTANCE ONLY
            </span>
            
            <button
              onClick={onAnalyze}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-500 text-white disabled:bg-gray-800 disabled:text-gray-500 font-bold text-xs p-1.5 px-3.5 rounded flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>RE-ANALYZE</span>
            </button>
          </div>
        </>
      )}

      {/* Resize Handle corner */}
      {!isCollapsed && (
        <div
          ref={resizeRef}
          onMouseDown={onResizeStart}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 group z-[1001]"
        >
          <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-slate-500 group-hover:border-amber-400 transition-colors" />
        </div>
      )}
    </div>
  );
}
