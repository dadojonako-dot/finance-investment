import { KlineInterval, MarketType } from './types';
import { BinanceMarketDataProvider } from './binance.provider';

export type RealtimeKline = {
  symbol: string; interval: string; openTime: number; closeTime: number;
  open: number; high: number; low: number; close: number; volume: number; closed: boolean;
};

export class RealtimeMarketClient {
  private socket?: WebSocket;
  private provider = new BinanceMarketDataProvider();

  subscribeKlines(market: MarketType, symbol: string, interval: KlineInterval, onData: (kline: RealtimeKline) => void) {
    this.disconnect();
    this.socket = new WebSocket(this.provider.getKlineStreamUrl(market, symbol, interval));
    this.socket.onmessage = (event) => {
      const payload = JSON.parse(String(event.data));
      const k = payload.k;
      if (!k) return;
      onData({ symbol: payload.s, interval: k.i, openTime: k.t, closeTime: k.T, open: Number(k.o), high: Number(k.h), low: Number(k.l), close: Number(k.c), volume: Number(k.v), closed: Boolean(k.x) });
    };
    return () => this.disconnect();
  }

  disconnect() {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) this.socket.close();
    this.socket = undefined;
  }
}
