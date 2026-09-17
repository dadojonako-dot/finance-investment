'use client';
import { useMemo,useState } from 'react';

type Op='INCOME'|'EXPENSE'|'TRANSFER'|'FX_EXCHANGE';
const projects=['Проект ДАДО','Производство воды','Инвестиционный проект A','Общие / вне проекта'];
const ledgers=['Основной','Трейдинг','Инвестиции','Резерв'];
const accounts=['Касса USD','Касса TJS','Банк USD','Банк TJS','USDT TRC20','Binance Spot'];
const assets=['USD','TJS','EUR','RUB','CNY','AED','USDT','BTC','ETH'];

export default function OperationsPage(){
 const [type,setType]=useState<Op>('INCOME'); const [project,setProject]=useState(''); const [amount,setAmount]=useState(''); const needsProject=type==='INCOME'||type==='EXPENSE';
 const canSave=useMemo(()=>Number(amount)>0&&(!needsProject||!!project),[amount,needsProject,project]);
 return <main style={{minHeight:'100vh',background:'#090d14',color:'#e8edf5',padding:24,fontFamily:'Inter,Arial'}}><div style={{maxWidth:1180,margin:'0 auto'}}><header style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><div><div style={{fontSize:13,color:'#7f8b9c'}}>Финансы и инвестиция</div><h1 style={{margin:'5px 0'}}>Операции</h1></div><a href="/" style={{color:'#7aa7ff'}}>← Торговая панель</a></header>
 <section style={{background:'#0f1622',border:'1px solid #202938',borderRadius:12,padding:18}}><div style={{display:'flex',gap:8,marginBottom:18}}>{([['INCOME','Доход'],['EXPENSE','Расход'],['TRANSFER','Перевод'],['FX_EXCHANGE','Обмен валют']] as [Op,string][]).map(([v,l])=><button key={v} onClick={()=>setType(v)} style={{padding:'10px 16px',border:0,borderRadius:8,color:'white',background:type===v?'#2b67f6':'#17202e'}}>{l}</button>)}</div>
 <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}><Field label="Ledger"><select><>{ledgers.map(x=><option key={x}>{x}</option>)}</></select></Field><Field label="Счет / кошелек"><select>{accounts.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Валюта / актив"><select>{assets.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Сумма"><input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder="0.00"/></Field>
 {type==='FX_EXCHANGE'&&<><Field label="Получаемая валюта"><select>{assets.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Курс обмена"><input type="number" placeholder="Фактический курс"/></Field></>}
 {needsProject&&<Field label="Проект *"><select value={project} onChange={e=>setProject(e.target.value)}><option value="">Выберите проект</option>{projects.map(x=><option key={x}>{x}</option>)}</select></Field>}
 {type==='EXPENSE'&&<Field label="Категория расхода *"><select><option>Оборудование</option><option>Аренда</option><option>Зарплата</option><option>Логистика</option><option>Маркетинг</option><option>Закупки</option><option>Комиссии</option><option>Налоги</option><option>Прочее</option></select></Field>}
 <Field label="Контрагент"><input placeholder="Название / ФИО"/></Field><Field label="Дата операции"><input type="datetime-local"/></Field><Field label="Курс к USD"><input type="number" placeholder="Для USD = 1"/></Field><Field label="Документ / основание"><input placeholder="Номер документа"/></Field></div>
 <Field label="Комментарий"><input placeholder="Описание операции"/></Field>{needsProject&&!project&&<div style={{color:'#ef6673',fontSize:13,marginTop:12}}>Для дохода и расхода необходимо обязательно выбрать проект.</div>}<button disabled={!canSave} style={{marginTop:18,width:'100%',padding:13,border:0,borderRadius:8,fontWeight:700,color:'white',background:canSave?'#12a66a':'#334050',cursor:canSave?'pointer':'not-allowed'}}>Сохранить операцию</button><div style={{fontSize:12,color:'#7f8b9c',marginTop:10}}>Все движения создаются вручную. Система автоматически рассчитывает остатки и USD-эквивалент после сохранения.</div></section></div></main>;
}
function Field({label,children}:{label:string,children:React.ReactNode}){return <label style={{display:'block',color:'#8d99aa',fontSize:12,marginBottom:10}}>{label}<div style={{marginTop:6}}>{children}</div><style jsx>{`input,select{width:100%;background:#0a1019;color:#fff;border:1px solid #2a3546;border-radius:7px;padding:10px}`}</style></label>}
