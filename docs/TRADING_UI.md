# Spot / Futures Trading Workspace

## Цель
Торговые окна используют рыночные данные в реальном времени только для отображения и расчетов. Любая учетная операция и сделка записывается в Ledger вручную пользователем.

## Общий экран

### Верхняя панель
- выбор Spot / Futures
- торговая пара
- текущая цена
- изменение 24h
- High / Low 24h
- объем 24h
- статус WebSocket: LIVE / RECONNECTING / OFFLINE

### Левая колонка
Watchlist криптовалют с поиском. Начальный набор: BTCUSDT, ETHUSDT, BNBUSDT, XRPUSDT, SOLUSDT, TRXUSDT, DOGEUSDT, ADAUSDT, BCHUSDT, XMRUSDT, LINKUSDT, XLMUSDT, LTCUSDT, HBARUSDT, AVAXUSDT, SHIBUSDT, SUIUSDT, TONUSDT, DOTUSDT, UNIUSDT.

### Центральная область
Свечной OHLCV график. Таймфреймы: 1m, 5m, 15m, 1h, 4h, 1d. Исторические свечи загружаются REST, текущая свеча обновляется WebSocket.

### Spot правая панель
Форма ручной записи сделки:
- Ledger
- Exchange account
- BUY / SELL
- Symbol
- Quantity
- Price (кнопка «Текущая цена» может подставить рыночную цену)
- Fee
- Date/time
- Notes

Нажатие «Сохранить сделку» создает учетную запись только после явного действия пользователя.

### Futures правая панель
Показывать Mark Price, Index Price, Funding Rate и Next Funding. Ручная форма: Ledger, Futures account, LONG/SHORT, Cross/Isolated, leverage, quantity, entry price, margin, TP, SL, fees, notes.

## Важное правило учета
Рыночный WebSocket никогда не создает Transaction, SpotTrade или FuturesTrade. Он только обновляет интерфейс и расчетные значения. Запись в базе появляется только после ручного подтверждения пользователем.

## Архитектура Market Data
Интерфейс MarketDataProvider отделяет UI от конкретной биржи. Первый provider — Binance. В дальнейшем можно реализовать BybitMarketDataProvider и OKXMarketDataProvider без изменения торговых экранов.

## Следующие технические задачи
1. Next.js shell и темная панель навигации.
2. CandlestickChart component.
3. Watchlist component.
4. MarketHeader component.
5. SpotManualTradeForm.
6. FuturesManualTradeForm.
7. Backend endpoints для сохранения ручных сделок.
8. P&L calculation service.
