import { loadEnvFile } from 'node:process';
try { loadEnvFile('.env'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
if (!process.env.DATABASE_URL?.startsWith('postgresql://')) throw new Error('Set DATABASE_URL in .env');
const secret = process.env.AUTH_SECRET || '';
if (secret.length < 32 || secret.startsWith('replace-with')) throw new Error('Set a random AUTH_SECRET of at least 32 characters in .env');
console.log('Environment configured');
