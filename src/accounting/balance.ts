export type PostedMovement={type:'INCOME'|'EXPENSE'|'TRANSFER'|'FX_EXCHANGE'|'INVESTMENT'|'INVESTMENT_RETURN'|'COMMISSION'|'ADJUSTMENT';amount:number;direction:'DEBIT'|'CREDIT';assetCode:string;usdAmount?:number|null;projectId?:string|null};

export function calculateBalance(openingBalance:number,movements:PostedMovement[]){return movements.reduce((balance,m)=>balance+(m.direction==='CREDIT'?m.amount:-m.amount),openingBalance)}

export function calculateProjectTotals(projectId:string,movements:PostedMovement[]){
 const rows=movements.filter(m=>m.projectId===projectId); let income=0,expense=0,invested=0,returned=0,commissions=0;
 for(const m of rows){const value=m.usdAmount??0;if(m.type==='INCOME')income+=value;if(m.type==='EXPENSE')expense+=value;if(m.type==='INVESTMENT')invested+=value;if(m.type==='INVESTMENT_RETURN')returned+=value;if(m.type==='COMMISSION')commissions+=value;}
 return {income,expense,invested,returned,commissions,netCashFlow:income+returned-expense-invested-commissions,operatingResult:income-expense-commissions};
}
