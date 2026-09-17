# Архитектура — «Финансы и инвестиция»

## 1. Ledger
Ledger является верхним уровнем финансового учета. Количество Ledger не ограничено.

Поля:
- id
- name
- description
- baseCurrency (USD по умолчанию)
- status
- createdAt
- createdBy

## 2. Account
Счет принадлежит одному Ledger.

Типы:
- CASH
- BANK
- CRYPTO_WALLET
- EXCHANGE_SPOT
- EXCHANGE_FUTURES
- OTHER

Поля:
- id
- ledgerId
- name
- type
- currency/asset
- openingBalance
- status

## 3. Manual Transaction
Все движения создаются вручную.

Типы:
- INCOME
- EXPENSE
- TRANSFER
- INVESTMENT
- INVESTMENT_RETURN
- COMMISSION
- ADJUSTMENT

Поля:
- id
- ledgerId
- accountId
- transactionType
- asset
- amount
- usdRate
- usdAmount
- operationDate
- counterparty
- projectId (optional)
- categoryId (optional)
- description
- attachment
- createdBy
- createdAt

## 4. Transfer
Перевод может выполняться между счетами одного Ledger или между разными Ledger.

Хранятся sourceLedger/sourceAccount и destinationLedger/destinationAccount, сумма, актив, комиссия, дата и комментарий.

## 5. Spot Trade
- ledgerId
- exchangeAccountId
- symbol
- side BUY/SELL
- quantity
- price
- fee
- tradeDate
- realizedPnl
- notes

## 6. Futures Trade
- ledgerId
- exchangeAccountId
- symbol
- side LONG/SHORT
- marginMode CROSS/ISOLATED
- leverage
- quantity
- entryPrice
- exitPrice
- markPrice
- liquidationPrice
- margin
- funding
- fees
- realizedPnl
- status OPEN/CLOSED
- openedAt
- closedAt

## 7. Investment Project
- name
- description
- status
- startDate
- endDate
- targetAmount
- investedAmount
- returnedAmount
- income
- expenses
- pnl

Проект может финансироваться из нескольких Ledger.

## 8. Project Expenses
Каждый расход привязан к проекту и при необходимости к Ledger/Account.

Категории: оборудование, аренда, зарплата, логистика, маркетинг, закупки, комиссии, налоги, прочее.

## 9. Dashboard
Фильтр: Все Ledger / конкретный Ledger / период.

Показатели:
- Total Equity
- Fiat Balance
- Crypto Balance (USD equivalent)
- Spot P&L
- Futures P&L
- Investments
- Project P&L
- Expenses
- Income

## 10. Access Control
Роли:
- OWNER
- ADMIN
- FINANCE
- TRADER
- ACCOUNTANT
- VIEWER

Доступ можно ограничивать по Ledger.

## 11. Audit Log
Создание, изменение и удаление финансовых данных фиксируются с пользователем, временем, старым и новым значением.
