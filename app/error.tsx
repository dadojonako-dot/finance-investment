'use client';
export default function ErrorPage({reset}:{error:Error;reset:()=>void}){return <main style={{padding:24}}><h1>Не удалось загрузить раздел</h1><p role="alert">Проверьте соединение и повторите попытку.</p><button onClick={reset}>Повторить</button></main>}
