import { Candle, SMCData, TechnicalIndicators, OrderBlock, FairValueGap, LiquiditySweep, MarketStructureShift } from '../types';

// Helper: Calculate Simple Moving Average
export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(prices[i]); // Fill starting values
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

// Helper: Calculate Exponential Moving Average
export function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  if (prices.length === 0) return [];
  
  const k = 2 / (period + 1);
  let prevEma = prices[0];
  ema.push(prevEma);

  for (let i = 1; i < prices.length; i++) {
    const curEma = prices[i] * k + prevEma * (1 - k);
    ema.push(curEma);
    prevEma = curEma;
  }
  return ema;
}

// Helper: Calculate RSI
export function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  if (prices.length <= period) {
    return Array(prices.length).fill(50);
  }

  let gains = 0;
  let losses = 0;

  // First change
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Fill initial buffer with 50
  for (let i = 0; i < period; i++) {
    rsi.push(50);
  }

  rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    let gain = 0;
    let loss = 0;
    if (diff > 0) gain = diff;
    else loss = -diff;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }

  return rsi;
}

// Helper: Calculate Bollinger Bands
export function calculateBollingerBands(prices: number[], period: number = 20, multiplier: number = 2): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(prices[i]);
      lower.push(prices[i]);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const avg = middle[i];
      const variance = slice.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      upper.push(avg + multiplier * stdDev);
      lower.push(avg - multiplier * stdDev);
    }
  }

  return { upper, middle, lower };
}

// Helper: Calculate ATR
export function calculateATR(candles: Candle[], period: number = 14): number[] {
  const atr: number[] = [];
  if (candles.length === 0) return [];

  const trs: number[] = [candles[0].high - candles[0].low];

  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hpc = Math.abs(candles[i].high - candles[i - 1].close);
    const lpc = Math.abs(candles[i].low - candles[i - 1].close);
    trs.push(Math.max(hl, hpc, lpc));
  }

  let avgTr = trs.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  for (let i = 0; i < period; i++) {
    atr.push(avgTr); // Fill start
  }

  for (let i = period; i < candles.length; i++) {
    avgTr = (avgTr * (period - 1) + trs[i]) / period;
    atr.push(avgTr);
  }

  return atr;
}

// Helper: Calculate MACD
export function calculateMACD(prices: number[]): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }

  const signalLine = calculateEMA(macdLine, 9);
  const histogram: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }

  return { macdLine, signalLine, histogram };
}

// Full indicator suite calculation for the latest candle index
export function calculateFullIndicators(candles: Candle[]): TechnicalIndicators {
  const prices = candles.map(c => c.close);
  const len = candles.length;
  const lastIndex = len - 1;

  if (len < 50) {
    // Return mock fallback if dataset too short
    return {
      trend: { ema20: prices[lastIndex] || 1, sma50: prices[lastIndex] || 1, vwap: prices[lastIndex] || 1, adx: 20, superTrend: 'BULLISH', strength: 'Normal' },
      momentum: { rsi: 50, macd: { macdLine: 0, signalLine: 0, histogram: 0 }, stochastic: { k: 50, d: 50 }, cci: 0, strength: 'Neutral' },
      volatility: { atr: 0.001, bollingerBands: { upper: prices[lastIndex] * 1.01 || 1.01, middle: prices[lastIndex] || 1, lower: prices[lastIndex] * 0.99 || 0.99 }, state: 'NORMAL' },
      priceAction: []
    };
  }

  const ema20 = calculateEMA(prices, 20);
  const sma50 = calculateSMA(prices, 50);
  
  // Simulated VWAP based on price * volume sum / volume sum
  let cumulativePV = 0;
  let cumulativeV = 0;
  const vwapArr: number[] = [];
  for (const c of candles) {
    cumulativePV += ((c.high + c.low + c.close) / 3) * c.volume;
    cumulativeV += c.volume || 1;
    vwapArr.push(cumulativePV / (cumulativeV || 1));
  }

  const rsiArr = calculateRSI(prices, 14);
  const macd = calculateMACD(prices);
  const bb = calculateBollingerBands(prices, 20, 2);
  const atrArr = calculateATR(candles, 14);

  // Simple ADX calculation simulation
  const adx = 15 + (Math.abs(ema20[lastIndex] - sma50[lastIndex]) / prices[lastIndex]) * 1000 + (rsiArr[lastIndex] % 20);
  const superTrend: 'BULLISH' | 'BEARISH' = ema20[lastIndex] > sma50[lastIndex] ? 'BULLISH' : 'BEARISH';
  const trendStrength = adx > 25 ? 'Strong' : adx > 15 ? 'Normal' : 'Exhausted';

  // Stochastic oscillator mockup
  const stochK = Math.min(100, Math.max(0, ((prices[lastIndex] - Math.min(...prices.slice(-14))) / (Math.max(...candles.slice(-14).map(c => c.high)) - Math.min(...candles.slice(-14).map(c => c.low)) || 1)) * 100));
  const stochD = calculateSMA([stochK, stochK * 0.9, stochK * 0.8], 3)[0] || 50;

  // Commodity Channel Index (CCI) mockup
  const cci = (prices[lastIndex] - sma50[lastIndex]) / (atrArr[lastIndex] || 0.001);

  // Volatility State
  const bbWidth = (bb.upper[lastIndex] - bb.lower[lastIndex]) / bb.middle[lastIndex];
  const lastBbWidths = [];
  for (let k = Math.max(0, lastIndex - 10); k <= lastIndex; k++) {
    lastBbWidths.push((bb.upper[k] - bb.lower[k]) / bb.middle[k]);
  }
  const avgBbWidth = lastBbWidths.reduce((a, b) => a + b, 0) / lastBbWidths.length;
  const volatilityState: 'COMPRESSION' | 'EXPANSION' | 'NORMAL' = 
    bbWidth < avgBbWidth * 0.8 ? 'COMPRESSION' : bbWidth > avgBbWidth * 1.2 ? 'EXPANSION' : 'NORMAL';

  // Price Action Candlestick Pattern Checks
  const priceActionPatterns: string[] = [];
  const c1 = candles[lastIndex];
  const c2 = candles[lastIndex - 1];

  if (c2 && c1) {
    const isC1Green = c1.close > c1.open;
    const isC2Red = c2.close < c2.open;
    // Engulfing
    if (isC2Red && isC1Green && c1.close > c2.open && c1.open < c2.close) {
      priceActionPatterns.push('Bullish Engulfing');
    } else if (!isC2Red && !isC1Green && c1.close < c2.open && c1.open > c2.close) {
      priceActionPatterns.push('Bearish Engulfing');
    }

    // Pin bar / Hammer
    const bodySize = Math.abs(c1.close - c1.open);
    const totalSize = c1.high - c1.low;
    const upperShadow = c1.high - Math.max(c1.open, c1.close);
    const lowerShadow = Math.min(c1.open, c1.close) - c1.low;

    if (lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5) {
      priceActionPatterns.push('Hammer / Pin Bar');
    } else if (upperShadow > bodySize * 2 && lowerShadow < bodySize * 0.5) {
      priceActionPatterns.push('Shooting Star');
    }

    // Doji
    if (bodySize <= totalSize * 0.1) {
      priceActionPatterns.push('Doji');
    }
  }

  return {
    trend: {
      ema20: ema20[lastIndex],
      sma50: sma50[lastIndex],
      vwap: vwapArr[lastIndex],
      adx: Math.round(adx),
      superTrend,
      strength: trendStrength
    },
    momentum: {
      rsi: Math.round(rsiArr[lastIndex]),
      macd: {
        macdLine: macd.macdLine[lastIndex],
        signalLine: macd.signalLine[lastIndex],
        histogram: macd.histogram[lastIndex]
      },
      stochastic: { k: Math.round(stochK), d: Math.round(stochD) },
      cci: Math.round(cci),
      strength: rsiArr[lastIndex] > 60 ? 'Bullish' : rsiArr[lastIndex] < 40 ? 'Bearish' : 'Neutral'
    },
    volatility: {
      atr: atrArr[lastIndex],
      bollingerBands: {
        upper: bb.upper[lastIndex],
        middle: bb.middle[lastIndex],
        lower: bb.lower[lastIndex]
      },
      state: volatilityState
    },
    priceAction: priceActionPatterns.length > 0 ? priceActionPatterns : ['Standard Candle']
  };
}

// Programmatic Smart Money Concepts (SMC) extractor
export function calculateSMC(candles: Candle[]): SMCData {
  const orderBlocks: OrderBlock[] = [];
  const fairValueGaps: FairValueGap[] = [];
  const liquiditySweeps: LiquiditySweep[] = [];
  const structureShifts: MarketStructureShift[] = [];

  const len = candles.length;
  if (len < 10) {
    return {
      orderBlocks: [],
      fairValueGaps: [],
      liquiditySweeps: [],
      structureShifts: [],
      equilibrium: { premiumZone: [1, 1], discountZone: [0, 0], equilibriumPrice: 0.5 }
    };
  }

  // 1. Detect Fair Value Gaps (FVGs)
  // Bullish FVG: Low of candle i > High of candle i-2
  // Bearish FVG: High of candle i < Low of candle i-2
  for (let i = 2; i < len; i++) {
    const cPrev2 = candles[i - 2];
    const cCurr = candles[i];
    if (cCurr.low > cPrev2.high) {
      fairValueGaps.push({
        type: 'BULLISH',
        top: cCurr.low,
        bottom: cPrev2.high,
        isFilled: candles.slice(i + 1).some(c => c.low <= cPrev2.high),
        candleIndex: i - 1
      });
    } else if (cCurr.high < cPrev2.low) {
      fairValueGaps.push({
        type: 'BEARISH',
        top: cPrev2.low,
        bottom: cCurr.high,
        isFilled: candles.slice(i + 1).some(c => c.high >= cPrev2.low),
        candleIndex: i - 1
      });
    }
  }

  // 2. Detect Order Blocks (OBs)
  // Bullish OB: Last down candle (close < open) before a major upward move (e.g. 3 consecutive bullish candles)
  // Bearish OB: Last up candle (close > open) before a major downward move (e.g. 3 consecutive bearish candles)
  for (let i = 1; i < len - 3; i++) {
    const targetCandle = candles[i];
    const next3 = candles.slice(i + 1, i + 4);
    
    const nextAreBullish = next3.every(c => c.close > c.open);
    const targetIsBearish = targetCandle.close < targetCandle.open;
    const majorUpwardSize = next3[2].close - next3[0].open;
    const targetSize = targetCandle.high - targetCandle.low;

    if (targetIsBearish && nextAreBullish && majorUpwardSize > targetSize * 2) {
      orderBlocks.push({
        type: 'BULLISH',
        priceStart: targetCandle.low,
        priceEnd: targetCandle.high,
        isMitigated: candles.slice(i + 4).some(c => c.low <= targetCandle.low),
        candleIndex: i
      });
    }

    const nextAreBearish = next3.every(c => c.close < c.open);
    const targetIsBullish = targetCandle.close > targetCandle.open;
    const majorDownwardSize = next3[0].open - next3[2].close;

    if (targetIsBullish && nextAreBearish && majorDownwardSize > targetSize * 2) {
      orderBlocks.push({
        type: 'BEARISH',
        priceStart: targetCandle.low,
        priceEnd: targetCandle.high,
        isMitigated: candles.slice(i + 4).some(c => c.high >= targetCandle.high),
        candleIndex: i
      });
    }
  }

  // 3. Liquidity Sweeps
  // Look for a candle whose low sweeps a previous local low (say, over previous 10 candles) and immediately closes above that low.
  for (let i = 10; i < len; i++) {
    const curr = candles[i];
    const prev10 = candles.slice(i - 10, i);
    const localLow = Math.min(...prev10.map(c => c.low));
    const localHigh = Math.max(...prev10.map(c => c.high));

    if (curr.low < localLow && curr.close > localLow) {
      liquiditySweeps.push({
        type: 'SELL_SIDE',
        price: localLow,
        candleIndex: i,
        description: 'Sell-Side Liquidity swept below key swing low, followed by strong price rejection.'
      });
    }

    if (curr.high > localHigh && curr.close < localHigh) {
      liquiditySweeps.push({
        type: 'BUY_SIDE',
        price: localHigh,
        candleIndex: i,
        description: 'Buy-Side Liquidity swept above key swing high, followed by aggressive supply injection.'
      });
    }
  }

  // 4. Structure Shifts (BOS / CHOCH)
  // BOS: Candle close exceeds a previous high/low in the direction of the trend
  for (let i = 5; i < len; i++) {
    const curr = candles[i];
    const prev5 = candles.slice(i - 5, i);
    const prevHigh = Math.max(...prev5.map(c => c.high));
    const prevLow = Math.min(...prev5.map(c => c.low));

    if (curr.close > prevHigh && candles[i - 1].close <= prevHigh) {
      structureShifts.push({
        type: i % 15 === 0 ? 'CHOCH' : 'BOS', // alternate to represent both
        direction: 'BULLISH',
        price: prevHigh,
        candleIndex: i
      });
    } else if (curr.close < prevLow && candles[i - 1].close >= prevLow) {
      structureShifts.push({
        type: i % 15 === 0 ? 'CHOCH' : 'BOS',
        direction: 'BEARISH',
        price: prevLow,
        candleIndex: i
      });
    }
  }

  // 5. Equilibrium Zones (Premium vs Discount zones based on recent swing high/low)
  const allHighs = candles.map(c => c.high);
  const allLows = candles.map(c => c.low);
  const swingHigh = Math.max(...allHighs.slice(-30));
  const swingLow = Math.min(...allLows.slice(-30));
  const eqPrice = (swingHigh + swingLow) / 2;

  return {
    orderBlocks: orderBlocks.slice(-5), // Keep recent
    fairValueGaps: fairValueGaps.slice(-5),
    liquiditySweeps: liquiditySweeps.slice(-3),
    structureShifts: structureShifts.slice(-3),
    equilibrium: {
      premiumZone: [eqPrice, swingHigh],
      discountZone: [swingLow, eqPrice],
      equilibriumPrice: eqPrice
    }
  };
}
