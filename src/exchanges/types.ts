export type ExchangeName='BINANCE'|'BYBIT';
export type ExchangeCredentials={apiKey:string;apiSecret:string;passphrase?:string};
export type ExchangeBalance={asset:string;free:number;locked:number;total:number};
export type ExchangePosition={symbol:string;side:'LONG'|'SHORT';quantity:number;entryPrice:number;markPrice:number;unrealizedPnl:number;leverage?:number};
export interface ExchangeProviderClient{name:ExchangeName;testConnection(c:ExchangeCredentials):Promise<{ok:boolean;accountLabel?:string;error?:string}>;getSpotBalances(c:ExchangeCredentials):Promise<ExchangeBalance[]>;getFuturesPositions(c:ExchangeCredentials):Promise<ExchangePosition[]>}
