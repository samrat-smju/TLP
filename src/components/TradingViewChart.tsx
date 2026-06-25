interface TradingViewChartProps {
  symbol: string;
}

export default function TradingViewChart({ symbol }: TradingViewChartProps) {
  // Map internal symbols to TradingView symbols
  const mapSymbol = (sym: string) => {
    switch (sym) {
      case 'EUR/USD': return 'FX:EURUSD';
      case 'GBP/USD': return 'FX:GBPUSD';
      case 'AUD/USD': return 'FX:AUDUSD';
      case 'USD/JPY': return 'FX:USDJPY';
      case 'BTC/USD': return 'BINANCE:BTCUSDT';
      case 'ETH/USD': return 'BINANCE:ETHUSDT';
      case 'GOLD (XAU/USD)': return 'OANDA:XAUUSD';
      case 'US30': return 'FOREXCOM:DJI';
      case 'EUR/USD (OTC)': return 'FX:EURUSD';
      case 'GBP/JPY (OTC)': return 'FX:GBPJPY';
      default: return 'FX:EURUSD';
    }
  };

  const tvSymbol = mapSymbol(symbol);
  
  // Construct a secure, sandboxed widget iframe URL
  const iframeUrl = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=1&theme=dark&style=1&timezone=Etc%2FUTC&locale=en&allow_symbol_change=true`;

  return (
    <div className="w-full h-full bg-[#121418] rounded-xl overflow-hidden flex flex-col" id="tradingview-chart-container">
      <iframe
        title="TradingView Real-time Chart"
        src={iframeUrl}
        className="w-full h-full min-h-[350px] border-none"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}
