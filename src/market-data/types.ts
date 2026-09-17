export type MarketType = 'spot' | 'futures';
export type KlineInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface Ticker24h {
  symbol: string;
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
}

export interface FuturesMarketInfo {
  symbol: string;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTime: number;
}

export interface MarketDataProvider {
  getCandles(market: MarketType, symbol: string, interval: KlineInterval, limit?: number): Promise<Candle[]>;
  getTicker24h(market: MarketType, symbol: string): Promise<Ticker24h>;
  getFuturesMarketInfo(symbol: string): Promise<FuturesMarketInfo>;
  getKlineStreamUrl(market: MarketType, symbol: string, interval: KlineInterval): string;
  getTickerStreamUrl(market: MarketType, symbol: string): string;
}
