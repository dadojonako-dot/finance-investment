'use client';
import {useEffect,useRef,useState} from 'react';
import {CandlestickSeries,createChart,UTCTimestamp} from 'lightweight-charts';
type Props={market:'spot'|'futures';symbol:string;interval:'1m'|'5m'|'15m'|'1h'|'4h'|'1d'};
export default function TradingChart({market,symbol,interval}:Props){
 const host=useRef<HTMLDivElement>(null);const [status,setStatus]=useState('Загрузка графика…');
 useEffect(()=>{
  if(!host.current)return;let disposed=false,ready=false;const abort=new AbortController();
  setStatus('Загрузка графика…');
  const chart=createChart(host.current,{autoSize:true,layout:{background:{color:'#0f1622'},textColor:'#8d99aa'},grid:{vertLines:{color:'#182130'},horzLines:{color:'#182130'}},timeScale:{timeVisible:true,secondsVisible:false}});
  const series=chart.addSeries(CandlestickSeries);
  const rest=market==='spot'?'https://api.binance.com/api/v3/klines':'https://fapi.binance.com/fapi/v1/klines';
  fetch(`${rest}?symbol=${symbol}&interval=${interval}&limit=300`,{signal:abort.signal}).then(async r=>{if(!r.ok)throw new Error('Рыночные данные недоступны');return r.json()}).then(rows=>{
   if(disposed)return;if(!Array.isArray(rows))throw new Error('Некорректный ответ рынка');
   series.setData(rows.map((r:unknown[])=>({time:Math.floor(Number(r[0])/1000) as UTCTimestamp,open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4])})));ready=true;setStatus('');
  }).catch(()=>{if(!disposed)setStatus('График недоступен. Ручной ввод сделок продолжает работать.')});
  const wsBase=market==='spot'?'wss://stream.binance.com:9443/ws':'wss://fstream.binance.com/ws';
  const ws=new WebSocket(`${wsBase}/${symbol.toLowerCase()}@kline_${interval}`);
  ws.onmessage=e=>{if(!ready||disposed)return;try{const k=JSON.parse(e.data).k;if(k)series.update({time:Math.floor(k.t/1000) as UTCTimestamp,open:Number(k.o),high:Number(k.h),low:Number(k.l),close:Number(k.c)})}catch{setStatus('Не удалось обновить график')}};
  ws.onerror=()=>{if(!disposed)setStatus('Поток котировок недоступен')};
  const ticker=new WebSocket(`${wsBase}/${symbol.toLowerCase()}@ticker`);
  ticker.onmessage=e=>{if(disposed)return;try{const d=JSON.parse(e.data),price=document.getElementById('last-price'),change=document.getElementById('change-24'),hl=document.getElementById('high-low');if(price)price.textContent=Number(d.c).toLocaleString();if(change){change.textContent=`${Number(d.P).toFixed(2)}%`;change.className=Number(d.P)>=0?'green':'red'}if(hl)hl.textContent=`${Number(d.h).toLocaleString()} / ${Number(d.l).toLocaleString()}`}catch{}};
  return()=>{disposed=true;abort.abort();ws.close();ticker.close();chart.remove()};
 },[market,symbol,interval]);
 return <>{status&&<p role="status" className="notice">{status}</p>}<div className="chart" ref={host}/></>;
}
