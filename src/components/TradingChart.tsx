'use client';
import { useEffect,useRef } from 'react';
import { CandlestickSeries,createChart } from 'lightweight-charts';

type Props={market:'spot'|'futures';symbol:string;interval:'1m'|'5m'|'15m'|'1h'|'4h'|'1d'};
export default function TradingChart({market,symbol,interval}:Props){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!host.current)return; const chart=createChart(host.current,{autoSize:true,layout:{background:{color:'#0f1622'},textColor:'#8d99aa'},grid:{vertLines:{color:'#182130'},horzLines:{color:'#182130'}},timeScale:{timeVisible:true,secondsVisible:false}}); const series=chart.addSeries(CandlestickSeries);
 const rest=market==='spot'?'https://api.binance.com/api/v3/klines':'https://fapi.binance.com/fapi/v1/klines';
 fetch(`${rest}?symbol=${symbol}&interval=${interval}&limit=300`).then(r=>r.json()).then(rows=>series.setData(rows.map((r:any[])=>({time:Math.floor(Number(r[0])/1000) as any,open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4])}))));
 const wsBase=market==='spot'?'wss://stream.binance.com:9443/ws':'wss://fstream.binance.com/ws'; const ws=new WebSocket(`${wsBase}/${symbol.toLowerCase()}@kline_${interval}`); ws.onmessage=e=>{const d=JSON.parse(e.data);const k=d.k;if(k)series.update({time:Math.floor(k.t/1000) as any,open:Number(k.o),high:Number(k.h),low:Number(k.l),close:Number(k.c)});};
 const ticker=new WebSocket(`${wsBase}/${symbol.toLowerCase()}@ticker`); ticker.onmessage=e=>{const d=JSON.parse(e.data); const price=document.getElementById('last-price'),change=document.getElementById('change-24'),hl=document.getElementById('high-low'); if(price)price.textContent=Number(d.c).toLocaleString();if(change){change.textContent=`${Number(d.P).toFixed(2)}%`;change.className=Number(d.P)>=0?'green':'red';}if(hl)hl.textContent=`${Number(d.h).toLocaleString()} / ${Number(d.l).toLocaleString()}`;};
 return()=>{ws.close();ticker.close();chart.remove()};
 },[market,symbol,interval]); return <div className="chart" ref={host}/>;
}
