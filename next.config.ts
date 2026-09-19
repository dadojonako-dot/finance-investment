import type {NextConfig} from 'next';
const config:NextConfig={async headers(){return [{source:'/(.*)',headers:[
 {key:'X-Content-Type-Options',value:'nosniff'},
 {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
 {key:'X-Frame-Options',value:'DENY'},
 {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
 {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'"+(process.env.NODE_ENV==='development'?" 'unsafe-eval'":'')+"; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://api.binance.com https://api.bybit.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"}
]}]}};
export default config;
