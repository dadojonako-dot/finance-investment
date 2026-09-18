export async function readJson(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

let pending=0;
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  window.dispatchEvent(new CustomEvent('pilot:pending',{detail:++pending}));
  try {
    const response=await globalThis.fetch(input,init);
    if(!response.ok){
      const body=await response.clone().json().catch(()=>({}));
      window.dispatchEvent(new CustomEvent('pilot:error',{detail:body.error||`HTTP ${response.status}`}));
    }
    return response;
  }catch(error){
    window.dispatchEvent(new CustomEvent('pilot:error',{detail:'Нет соединения с сервером. Повторите загрузку.'}));
    throw error;
  }finally{window.dispatchEvent(new CustomEvent('pilot:pending',{detail:--pending}))}
}
