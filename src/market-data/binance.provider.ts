import { Candle, FuturesMarketInfo, KlineInterval, MarketDataProvider, MarketType, Ticker24h } from './types';

const SPOT_REST = 'https://api.binance.com';
const FUTURES_REST = 'https://fapi.binance.com';
const SPOT_WS = 'wss://stream.binance.com:9443/ws';
const FUTURES_WS = 'wss://fstream.binance.com/ws';

export class BinanceMarketDataProvider implements MarketDataProvider {
  private restBase(market: MarketType) {
    return market === 'spot' ? SPOT_REST : FUTURES_REST;
  }

  async getCandles(market: MarketType, symbol: string, interval: KlineInterval, limit = 500): Promise<Candle[]> {
    const path = market === 'spot' ? '/api/v3/klines' : '/fapi/v1/klines';
    const url = `${this.restBase(market)}${path}?symbol=${encodeURIComponent(symbol.toUpperCase())}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Binance candles request failed: ${response.status}`);
    const rows = await response.json() as unknown[][];
    return rows.map((row) => ({
      openTime: Number(row[0]), open: Number(row[1]), high: Number(row[2]), low: Number(row[3]),
      close: Number(row[4]), volume: Number(row[5]), closeTime: Number(row[6]),
    }));
  }

  async getTicker24h(market: MarketType, symbol: string): Promise<Ticker24h> {
    const path = market === 'spot' ? '/api/v3/ticker/24hr' : '/fapi/v1/ticker/24hr';
    const response = await fetch(`${this.restBase(market)}${path}?symbol=${encodeURIComponent(symbol.toUpperCase())}`);
    if (!response.ok) throw new Error(`Binance ticker request failed: ${response.status}`);
    const d = await response.json() as Record<string, string>;
    return {
      symbol: d.symbol, lastPrice: Number(d.lastPrice), priceChange: Number(d.priceChange),
      priceChangePercent: Number(d.priceChangePercent), highPrice: Number(d.highPrice),
      lowPrice: Number(d.lowPrice), volume: Number(d.volume), quoteVolume: Number(d.quoteVolume),
    };
  }

  async getFuturesMarketInfo(symbol: string): Promise<FuturesMarketInfo> {
    const response = await fetch(`${FUTURES_REST}/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol.toUpperCase())}`);
    if (!response.ok) throw new Error(`Binance futures market request failed: ${response.status}`);
    const d = await response.json() as Record<string, string>;
    return { symbol: d.symbol, markPrice: Number(d.markPrice), indexPrice: Number(d.indexPrice), fundingRate: Number(d.lastFundingRate), nextFundingTime: Number(d.nextFundingTime) };
  }

  getKlineStreamUrl(market: MarketType, symbol: string, interval: KlineInterval): string {
    const base = market === 'spot' ? SPOT_WS : FUTURES_WS;
    return `${base}/${symbol.toLowerCase()}@kline_${interval}`;
  }

  getTickerStreamUrl(market: MarketType, symbol: string): string {
    const base = market === 'spot' ? SPOT_WS : FUTURES_WS;
    return `${base}/${symbol.toLowerCase()}@ticker`;
  }
}
