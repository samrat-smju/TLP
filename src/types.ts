export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type MarketBias = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL' | 'NO_TRADE';

export interface OrderBlock {
  type: 'BULLISH' | 'BEARISH';
  priceStart: number;
  priceEnd: number;
  isMitigated: boolean;
  candleIndex: number;
}

export interface FairValueGap {
  type: 'BULLISH' | 'BEARISH';
  top: number;
  bottom: number;
  isFilled: boolean;
  candleIndex: number;
}

export interface LiquiditySweep {
  type: 'BUY_SIDE' | 'SELL_SIDE';
  price: number;
  candleIndex: number;
  description: string;
}

export interface MarketStructureShift {
  type: 'BOS' | 'CHOCH'; // Break of Structure or Change of Character
  direction: 'BULLISH' | 'BEARISH';
  price: number;
  candleIndex: number;
}

export interface SMCData {
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  liquiditySweeps: LiquiditySweep[];
  structureShifts: MarketStructureShift[];
  equilibrium: {
    premiumZone: [number, number];
    discountZone: [number, number];
    equilibriumPrice: number;
  };
}

export interface TechnicalIndicators {
  trend: {
    ema20: number;
    sma50: number;
    vwap: number;
    adx: number;
    superTrend: 'BULLISH' | 'BEARISH';
    strength: string; // 'Strong', 'Weak', 'Exhausted'
  };
  momentum: {
    rsi: number;
    macd: { macdLine: number; signalLine: number; histogram: number };
    stochastic: { k: number; d: number };
    cci: number;
    strength: string;
  };
  volatility: {
    atr: number;
    bollingerBands: { upper: number; middle: number; lower: number };
    state: 'COMPRESSION' | 'EXPANSION' | 'NORMAL';
  };
  priceAction: string[]; // Patterns detected e.g. ["Bullish Engulfing", "Hammer"]
}

export interface TradeSetup {
  entryZone: [number, number];
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskRewardRatio: number;
  invalidationLevel: number;
}

export interface BinaryPrediction {
  candleColor: 'GREEN' | 'RED' | 'GRAY';
  candleSize: 'SMALL' | 'MEDIUM' | 'LARGE';
  direction: 'CALL (UP)' | 'PUT (DOWN)' | 'NEUTRAL / WAIT';
  expirationTime: string;
}

export interface FuturePredictionItem {
  macroDirection: 'LONG' | 'SHORT' | 'NEUTRAL';
  reasoning: string;
  entryZone: [number, number];
  stopLoss: number;
  takeProfit: number;
}

export interface FuturePrediction {
  macroDirection: 'LONG' | 'SHORT' | 'NEUTRAL';
  reasoning: string;
  entryZone: [number, number];
  stopLoss: number;
  takeProfit: number;
  horizon: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  fiveMin?: FuturePredictionItem;
  fifteenMin?: FuturePredictionItem;
}

export interface AIAnalysisResult {
  symbol: string;
  timeframe: string;
  price: number;
  spread: number;
  session: string;
  bias: MarketBias;
  confidence: number;
  institutionalScore: number;
  riskScore: number;
  tradeQualityScore: number;
  nextCandleOutlook: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  smc: SMCData;
  indicators: TechnicalIndicators;
  setup?: TradeSetup;
  binaryPrediction?: BinaryPrediction;
  futurePrediction?: FuturePrediction;
  reasonings: string[];
  timestamp: number;
}

export interface ScannerItem {
  symbol: string;
  type: 'FOREX' | 'CRYPTO' | 'INDICES' | 'METALS' | 'OTC';
  bias: MarketBias;
  confidence: number;
  change24h: number;
  price: number;
}

export interface ScannerData {
  topBuy: ScannerItem[];
  topSell: ScannerItem[];
  topReversal: ScannerItem[];
  topBreakout: ScannerItem[];
  topScalping: ScannerItem[];
  topTrending: ScannerItem[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  symbol: string;
  timeframe: string;
  price: number;
  bias: MarketBias;
  confidence: number;
  setup?: TradeSetup;
  outcome?: 'WIN' | 'LOSS' | 'UNRESOLVED';
  userNotes?: string;
}

export interface AppSettings {
  theme: 'DARK' | 'LIGHT';
  language: 'en' | 'es' | 'pt' | 'de' | 'ru';
  opacity: number; // 0.1 to 1.0
  position: { x: number; y: number };
  confidenceThreshold: number; // 0 to 100
  notifications: {
    sound: boolean;
    browser: boolean;
    highConfidenceOnly: boolean;
  };
  risk: {
    riskPerTrade: number; // e.g. 1% to 5%
    maxSpreadAllowed: number; // in pips/points
  };
}
