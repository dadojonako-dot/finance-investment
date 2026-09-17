import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const assets = [
  ['USD','US Dollar','FIAT',2],['TJS','Tajikistani Somoni','FIAT',2],['EUR','Euro','FIAT',2],
  ['RUB','Russian Ruble','FIAT',2],['CNY','Chinese Yuan','FIAT',2],['AED','UAE Dirham','FIAT',2],
  ['USDT','Tether','CRYPTO',6],['BTC','Bitcoin','CRYPTO',8],['ETH','Ethereum','CRYPTO',8],
  ['BNB','BNB','CRYPTO',8],['XRP','XRP','CRYPTO',6],['SOL','Solana','CRYPTO',8],
  ['TRX','TRON','CRYPTO',6],['DOGE','Dogecoin','CRYPTO',8],['ADA','Cardano','CRYPTO',8],
  ['BCH','Bitcoin Cash','CRYPTO',8],['XMR','Monero','CRYPTO',8],['LINK','Chainlink','CRYPTO',8],
  ['XLM','Stellar','CRYPTO',8],['LTC','Litecoin','CRYPTO',8],['HBAR','Hedera','CRYPTO',8],
  ['AVAX','Avalanche','CRYPTO',8],['SHIB','Shiba Inu','CRYPTO',8],['SUI','Sui','CRYPTO',8],
  ['TON','Toncoin','CRYPTO',8],['DOT','Polkadot','CRYPTO',8],['UNI','Uniswap','CRYPTO',8]
];

async function ensureAccount(ledgerId, name, type, assetCode) {
  const asset = await prisma.asset.findUnique({ where: { code: assetCode } });
  if (!asset) throw new Error(`Asset ${assetCode} not found`);
  const existing = await prisma.account.findFirst({ where: { ledgerId, name } });
  if (existing) return existing;
  return prisma.account.create({ data: { ledgerId, name, type, assetId: asset.id, openingBalance: 0 } });
}

async function main() {
  for (const [code,name,type,decimals] of assets) {
    await prisma.asset.upsert({
      where: { code },
      update: { name, type, decimals, isActive: true },
      create: { code, name, type, decimals, isActive: true }
    });
  }

  let generalProject = await prisma.project.findFirst({ where: { isGeneral: true } });
  if (!generalProject) {
    generalProject = await prisma.project.create({
      data: { name: 'Общие / вне проекта', description: 'Системный проект для общих доходов и расходов', status: 'ACTIVE', isGeneral: true }
    });
  }

  let ledger = await prisma.ledger.findFirst({ where: { name: 'Основной', status: 'ACTIVE' } });
  if (!ledger) {
    ledger = await prisma.ledger.create({
      data: { name: 'Основной', description: 'Основной Ledger для Pilot v0.1', baseCurrency: 'USD', status: 'ACTIVE' }
    });
  }

  await ensureAccount(ledger.id, 'Касса USD', 'CASH', 'USD');
  await ensureAccount(ledger.id, 'Банк USD', 'BANK', 'USD');
  await ensureAccount(ledger.id, 'Касса TJS', 'CASH', 'TJS');
  await ensureAccount(ledger.id, 'USDT Wallet', 'CRYPTO_WALLET', 'USDT');
  await ensureAccount(ledger.id, 'Binance Spot', 'EXCHANGE_SPOT', 'USDT');
  await ensureAccount(ledger.id, 'Binance Futures', 'EXCHANGE_FUTURES', 'USDT');

  console.log('Pilot seed completed:', { assets: assets.length, project: generalProject.name, ledger: ledger.name });
}

main().catch(error => { console.error(error); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
