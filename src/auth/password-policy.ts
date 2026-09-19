import {InputError} from '../accounting/money';
const weak=new Set(['password123','password1234','password12345','qwerty12345','qwerty123456','admin12345','admin123456','welcome123','welcome1234','letmein1234','changeme123','finance123','finance1234']);
export function passwordError(password:unknown):string|null{
 if(typeof password!=='string'||[...password].length<10)return 'Пароль должен содержать минимум 10 символов';
 if(new TextEncoder().encode(password).length>72)return 'Пароль должен занимать не более 72 байт';
 if(!/\p{L}/u.test(password)||!/\p{N}/u.test(password))return 'Пароль должен содержать букву и цифру';
 const normalized=password.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 if(weak.has(normalized)||/^(password|qwerty|admin|welcome|changeme|пароль|йцукен)\d*$/u.test(normalized)||/^(.{1,3})\1{3,}$/u.test(normalized))return 'Выберите менее очевидный пароль';
 return null;
}
export function requirePassword(password:unknown):asserts password is string{const error=passwordError(password);if(error)throw new InputError(error)}
