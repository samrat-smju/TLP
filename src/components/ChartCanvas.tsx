import { useEffect, useRef, useState, MouseEvent } from 'react';
import { Candle, AIAnalysisResult } from '../types';
import { calculateEMA, calculateSMA, calculateBollingerBands } from '../utils/indicators';

interface ChartCanvasProps {
  candles: Candle[];
  analysis?: AIAnalysisResult;
  showIndicators: {
    ema20: boolean;
    sma50: boolean;
    bb: boolean;
    smc: boolean;
  };
}

export default function ChartCanvas({ candles, analysis, showIndicators }: ChartCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Handle resizing using ResizeObserver as instructed
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({
        width: Math.max(width, 200),
        height: Math.max(height, 200),
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Set high DPI canvas resolution
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);
    
    drawChart(ctx);
  }, [dimensions, candles, analysis, showIndicators, hoveredIndex, mousePos]);

  const drawChart = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = dimensions;
    ctx.clearRect(0, 0, width, height);

    if (candles.length === 0) return;

    // Subdivide canvas: main chart occupies top 80%, volume bottom 20%
    const chartHeight = height * 0.82;
    const volHeight = height * 0.15;
    const volTop = height * 0.85;

    // Identify visible candles range
    const visibleCount = Math.min(candles.length, 50); // Show last 50 candles
    const startIndex = candles.length - visibleCount;
    const visibleCandles = candles.slice(startIndex);

    // Compute price scale
    const prices = visibleCandles.flatMap(c => [c.high, c.low]);
    let maxPrice = Math.max(...prices);
    let minPrice = Math.min(...prices);
    
    // Add 10% padding to top & bottom of chart
    const priceRange = maxPrice - minPrice || 1;
    maxPrice += priceRange * 0.10;
    minPrice -= priceRange * 0.10;

    // Helper: Map Price to Y coordinate
    const getYScaling = (price: number) => {
      return chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
    };

    // Helper: Map Candle Index to X coordinate
    const candleWidth = width / visibleCount;
    const getXScaling = (idx: number) => {
      return idx * candleWidth + candleWidth / 2;
    };

    // Draw Gridlines
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#718096';
    ctx.font = '10px JetBrains Mono, monospace';

    // Horizontal grid lines
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const yVal = minPrice + (priceRange * 1.2 * i) / gridCount;
      const y = getYScaling(yVal);
      if (y >= 0 && y <= chartHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        // Label
        ctx.fillText(yVal.toFixed(5), width - 65, y - 4);
      }
    }

    // Vertical grid lines
    const verticalGridCount = 6;
    for (let i = 0; i < verticalGridCount; i++) {
      const idx = Math.floor((visibleCount * i) / verticalGridCount);
      const x = getXScaling(idx);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, chartHeight);
      ctx.stroke();
    }

    // 1. Draw Bollinger Bands Fill and Outline (underneath candles)
    if (showIndicators.bb) {
      const allPrices = candles.map(c => c.close);
      const bbs = calculateBollingerBands(allPrices, 20, 2);
      
      ctx.beginPath();
      for (let i = 0; i < visibleCount; i++) {
        const fullIdx = startIndex + i;
        const x = getXScaling(i);
        const yUpper = getYScaling(bbs.upper[fullIdx] || candles[fullIdx].close);
        if (i === 0) ctx.moveTo(x, yUpper);
        else ctx.lineTo(x, yUpper);
      }
      for (let i = visibleCount - 1; i >= 0; i--) {
        const fullIdx = startIndex + i;
        const x = getXScaling(i);
        const yLower = getYScaling(bbs.lower[fullIdx] || candles[fullIdx].close);
        ctx.lineTo(x, yLower);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(66, 153, 225, 0.05)';
      ctx.fill();

      // Draw BB lines
      ctx.strokeStyle = 'rgba(66, 153, 225, 0.25)';
      ctx.lineWidth = 1;
      
      // Upper Band
      ctx.beginPath();
      for (let i = 0; i < visibleCount; i++) {
        const fullIdx = startIndex + i;
        const x = getXScaling(i);
        const y = getYScaling(bbs.upper[fullIdx] || candles[fullIdx].close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Lower Band
      ctx.beginPath();
      for (let i = 0; i < visibleCount; i++) {
        const fullIdx = startIndex + i;
        const x = getXScaling(i);
        const y = getYScaling(bbs.lower[fullIdx] || candles[fullIdx].close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 2. Draw Smart Money Concepts (SMC) visual tags
    if (showIndicators.smc && analysis?.smc) {
      const { orderBlocks, fairValueGaps, liquiditySweeps, structureShifts } = analysis.smc;

      // Draw Fair Value Gaps (FVG)
      fairValueGaps.forEach(fvg => {
        const localIdx = fvg.candleIndex - startIndex;
        if (localIdx >= 0 && localIdx < visibleCount) {
          const x = getXScaling(localIdx);
          const w = candleWidth * 2; // Span adjacent candles
          const yTop = getYScaling(fvg.top);
          const yBottom = getYScaling(fvg.bottom);
          
          ctx.fillStyle = fvg.type === 'BULLISH' 
            ? 'rgba(49, 151, 149, 0.08)'  // teal
            : 'rgba(221, 107, 32, 0.08)'; // orange
          ctx.fillRect(x - candleWidth, yTop, w, yBottom - yTop);
          
          ctx.strokeStyle = fvg.type === 'BULLISH' ? 'rgba(49, 151, 149, 0.3)' : 'rgba(221, 107, 32, 0.3)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x - candleWidth, yTop, w, yBottom - yTop);

          // Tag text
          ctx.fillStyle = fvg.type === 'BULLISH' ? '#319795' : '#dd6b20';
          ctx.font = '8px sans-serif';
          ctx.fillText(`FVG (${fvg.type === 'BULLISH' ? '+' : '-'})`, x - candleWidth + 2, yTop + 10);
        }
      });

      // Draw Order Blocks (OB)
      orderBlocks.forEach(ob => {
        const localIdx = ob.candleIndex - startIndex;
        if (localIdx >= 0 && localIdx < visibleCount) {
          const x = getXScaling(localIdx);
          const yStart = getYScaling(ob.priceStart);
          const yEnd = getYScaling(ob.priceEnd);
          const blockWidth = (visibleCount - localIdx) * candleWidth; // extend to right edge
          
          ctx.fillStyle = ob.type === 'BULLISH'
            ? 'rgba(72, 187, 120, 0.08)' // Green
            : 'rgba(245, 101, 101, 0.08)'; // Red
          ctx.fillRect(x, yStart, blockWidth, yEnd - yStart);

          ctx.strokeStyle = ob.type === 'BULLISH' ? 'rgba(72, 187, 120, 0.3)' : 'rgba(245, 101, 101, 0.3)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(x, yStart); ctx.lineTo(x + blockWidth, yStart);
          ctx.moveTo(x, yEnd); ctx.lineTo(x + blockWidth, yEnd);
          ctx.stroke();
          ctx.setLineDash([]); // clear dash

          // Tag text
          ctx.fillStyle = ob.type === 'BULLISH' ? '#48bb78' : '#f56565';
          ctx.font = '8px JetBrains Mono, monospace';
          ctx.fillText(`OB (${ob.type === 'BULLISH' ? 'BULL' : 'BEAR'})`, x + 4, yStart + 10);
        }
      });

      // Draw Market Structure Shifts (BOS / CHOCH)
      structureShifts.forEach(shift => {
        const localIdx = shift.candleIndex - startIndex;
        if (localIdx >= 0 && localIdx < visibleCount) {
          const x = getXScaling(localIdx);
          const y = getYScaling(shift.price);
          const endX = Math.min(width, x + candleWidth * 5);

          ctx.strokeStyle = '#ecc94b'; // yellow
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(endX, y);
          ctx.stroke();

          // Text
          ctx.fillStyle = '#ecc94b';
          ctx.font = '9px sans-serif';
          ctx.fillText(`${shift.type} (${shift.direction === 'BULLISH' ? '▲' : '▼'})`, x + 2, y - 3);
        }
      });

      // Draw Liquidity Sweeps
      liquiditySweeps.forEach(sweep => {
        const localIdx = sweep.candleIndex - startIndex;
        if (localIdx >= 0 && localIdx < visibleCount) {
          const x = getXScaling(localIdx);
          const y = getYScaling(sweep.price);

          ctx.strokeStyle = sweep.type === 'BUY_SIDE' ? '#fc8181' : '#63b3ed';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(x - candleWidth * 3, y);
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.setLineDash([]);

          // X Marker on chart
          ctx.fillStyle = sweep.type === 'BUY_SIDE' ? '#fc8181' : '#63b3ed';
          ctx.font = '10px sans-serif';
          ctx.fillText('✗ Sweep', x - 15, sweep.type === 'BUY_SIDE' ? y - 8 : y + 12);
        }
      });
    }

    // 3. Draw EMA 20 (Purple)
    if (showIndicators.ema20) {
      const allPrices = candles.map(c => c.close);
      const ema20 = calculateEMA(allPrices, 20);
      ctx.strokeStyle = '#b7791f'; // gold
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < visibleCount; i++) {
        const fullIdx = startIndex + i;
        const x = getXScaling(i);
        const y = getYScaling(ema20[fullIdx] || candles[fullIdx].close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 4. Draw SMA 50 (Teal/Cyan)
    if (showIndicators.sma50) {
      const allPrices = candles.map(c => c.close);
      const sma50 = calculateSMA(allPrices, 50);
      ctx.strokeStyle = '#319795'; // teal
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < visibleCount; i++) {
        const fullIdx = startIndex + i;
        const x = getXScaling(i);
        const y = getYScaling(sma50[fullIdx] || candles[fullIdx].close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 5. Draw Entry & Target Zone Overlays from Active Setup
    if (analysis?.setup && analysis.bias !== 'NO_TRADE') {
      const { entryZone, stopLoss, takeProfit1, takeProfit2, takeProfit3 } = analysis.setup;
      const entryY0 = getYScaling(entryZone[0]);
      const entryY1 = getYScaling(entryZone[1]);
      const slY = getYScaling(stopLoss);
      const tp1Y = getYScaling(takeProfit1);
      const tp2Y = getYScaling(takeProfit2);
      const tp3Y = getYScaling(takeProfit3);

      const isBuy = analysis.bias.includes('BUY');

      // Draw Entry Band
      ctx.fillStyle = 'rgba(236, 201, 75, 0.05)'; // yellow transparent
      ctx.fillRect(0, Math.min(entryY0, entryY1), width, Math.abs(entryY1 - entryY0) || 2);
      ctx.strokeStyle = 'rgba(236, 201, 75, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, entryY0); ctx.lineTo(width, entryY0);
      ctx.moveTo(0, entryY1); ctx.lineTo(width, entryY1);
      ctx.stroke();
      ctx.fillStyle = '#ecc94b';
      ctx.fillText('ENTRY ZONE', 10, Math.min(entryY0, entryY1) - 4);

      // Draw Stop Loss Line (Red)
      ctx.strokeStyle = 'rgba(245, 101, 101, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, slY);
      ctx.lineTo(width, slY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fc8181';
      ctx.fillText(`SL: ${stopLoss.toFixed(5)}`, 10, slY - 4);

      // Draw Take Profits (Green)
      const tps = [
        { label: 'TP1', price: takeProfit1, y: tp1Y },
        { label: 'TP2', price: takeProfit2, y: tp2Y },
        { label: 'TP3', price: takeProfit3, y: tp3Y }
      ];

      tps.forEach(tp => {
        ctx.strokeStyle = 'rgba(72, 187, 120, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, tp.y);
        ctx.lineTo(width, tp.y);
        ctx.stroke();
        ctx.fillStyle = '#48bb78';
        ctx.fillText(`${tp.label}: ${tp.price.toFixed(5)}`, 10, tp.y - 4);
      });
    }

    // 6. Draw Candlesticks (the main attraction)
    visibleCandles.forEach((candle, i) => {
      const x = getXScaling(i);
      const openY = getYScaling(candle.open);
      const closeY = getYScaling(candle.close);
      const highY = getYScaling(candle.high);
      const lowY = getYScaling(candle.low);

      const isGreen = candle.close >= candle.open;
      const barColor = isGreen ? '#48bb78' : '#f56565';
      const wickColor = isGreen ? '#38a169' : '#e53e3e';

      // Draw Wick
      ctx.strokeStyle = wickColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw Body
      ctx.fillStyle = barColor;
      const bodyWidth = Math.max(candleWidth - 3, 2);
      ctx.fillRect(x - bodyWidth / 2, Math.min(openY, closeY), bodyWidth, Math.max(Math.abs(closeY - openY), 1));

      // 7. Draw Volume Bars in bottom zone
      const maxVol = Math.max(...visibleCandles.map(c => c.volume || 1));
      const volH = ((candle.volume || 0) / maxVol) * volHeight;
      ctx.fillStyle = isGreen ? 'rgba(72, 187, 120, 0.3)' : 'rgba(245, 101, 101, 0.3)';
      ctx.fillRect(x - bodyWidth / 2, volTop + volHeight - volH, bodyWidth, volH);
    });

    // 8. Draw Live Crosshair, Price Tag and Tooltip on Hover
    if (hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < visibleCount) {
      const activeCandle = visibleCandles[hoveredIndex];
      const x = getXScaling(hoveredIndex);

      // Draw vertical alignment line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Draw horizontal tracking line matching mouse Y
      const mouseY = mousePos.y;
      if (mouseY >= 0 && mouseY <= chartHeight) {
        ctx.beginPath();
        ctx.moveTo(0, mouseY);
        ctx.lineTo(width, mouseY);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Draw tooltip values in upper left corner
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(10, 10, 205, 75);
      ctx.strokeStyle = '#4a5568';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, 205, 75);

      ctx.fillStyle = '#f7fafc';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`O: ${activeCandle.open.toFixed(5)}`, 20, 25);
      ctx.fillText(`H: ${activeCandle.high.toFixed(5)}`, 115, 25);
      ctx.fillText(`L: ${activeCandle.low.toFixed(5)}`, 20, 42);
      ctx.fillText(`C: ${activeCandle.close.toFixed(5)}`, 115, 42);
      ctx.fillText(`V: ${Math.round(activeCandle.volume)}`, 20, 59);

      const change = activeCandle.close - activeCandle.open;
      const changePercent = (change / activeCandle.open) * 100;
      ctx.fillStyle = change >= 0 ? '#48bb78' : '#f56565';
      ctx.fillText(`Chg: ${change >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`, 20, 74);
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const visibleCount = Math.min(candles.length, 50);
    const candleWidth = dimensions.width / visibleCount;
    const hoverIdx = Math.floor(x / candleWidth);

    if (hoverIdx >= 0 && hoverIdx < visibleCount) {
      setHoveredIndex(hoverIdx);
    } else {
      setHoveredIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative select-none">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="absolute top-0 left-0 w-full h-full cursor-crosshair bg-slate-950 rounded-lg shadow-inner"
      />
    </div>
  );
}
