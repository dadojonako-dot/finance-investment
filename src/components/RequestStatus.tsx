'use client';
import {useEffect,useState} from 'react';
export default function RequestStatus(){
 const [pending,setPending]=useState(0),[error,setError]=useState('');
 useEffect(()=>{
  const status=(e:Event)=>setPending((e as CustomEvent<number>).detail);
  const fail=(e:Event)=>setError((e as CustomEvent<string>).detail);
  const reject=(e:PromiseRejectionEvent)=>{setError(e.reason?.message||'Не удалось загрузить данные');e.preventDefault()};
  window.addEventListener('pilot:pending',status);window.addEventListener('pilot:error',fail);window.addEventListener('unhandledrejection',reject);
  return()=>{window.removeEventListener('pilot:pending',status);window.removeEventListener('pilot:error',fail);window.removeEventListener('unhandledrejection',reject)};
 },[]);
 if(!pending&&!error)return null;
 return <aside style={{position:'fixed',right:16,bottom:16,zIndex:1300,padding:14,background:'#172537',color:'white',borderRadius:8,maxWidth:420}}>
  {pending>0&&<div role="status">Загрузка данных…</div>}
  {error&&<div role="alert">{error} <button onClick={()=>location.reload()}>Повторить</button> <button onClick={()=>setError('')}>Закрыть</button></div>}
 </aside>;
}
