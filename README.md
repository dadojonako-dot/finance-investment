# Финансы и инвестиция — Pilot v0.1

Продолжение существующего Next.js 16 / React 19 приложения. PostgreSQL, Prisma 6,
TypeScript, bcryptjs, jose JWT и lightweight-charts сохранены.

## Локальный запуск

Требуются Node.js 22.12+ (проверено на 24) и Docker Compose v2.

```sh
npm ci
docker compose up -d --wait
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Установите полученную строку как `AUTH_SECRET` в `.env`. Затем:

```sh
npm run pilot:setup
npm run dev
```

Откройте `http://localhost:3000/setup` и создайте первого OWNER. Seed не создаёт
пользователей или пароли. Далее доступны вход и выход, Ledger, счета, операции,
переводы, FX, проекты, ручные Spot/Futures, журнал, отчёты и аудит.

PowerShell: вместо `cp .env.example .env` можно использовать
`Copy-Item .env.example .env`.

База: `finance_investment`, пользователь `finance_user`, локальный пароль
`finance_password`, порт `5432`. Compose публикует PostgreSQL только на loopback.

## Проверки

```sh
npm run pilot:check
```

Команда проверяет окружение и Prisma schema, генерирует клиент, выполняет
TypeScript, тесты бухгалтерских функций и production build. На Windows перед
генерацией Prisma остановите запущенный Next.js: процесс удерживает DLL клиента.

Полный HTTP acceptance запускается **только на отдельной тестовой базе**:

```sh
npm run pilot:setup
npm run db:seed
npm run pilot:check
npm run start -- --hostname 127.0.0.1 --port 3100
```

В другом терминале:

```sh
PILOT_TEST_ALLOW_WRITE=1 npm run test:acceptance
```

PowerShell: `$env:PILOT_TEST_ALLOW_WRITE='1'; npm run test:acceptance`.
Тест создаёт OWNER, пользователей разных ролей и финансовые записи. Он не удаляет
данные. Созданные тестовые учётные данные хранятся в игнорируемой папке
`test-results/`; не используйте их в рабочей базе. Результаты —
`test-results/acceptance.json`. GitHub Actions запускает этот сценарий на Docker.

## Миграции и seed

- `db:generate`: Prisma Client.
- `db:migrate`: применение сохранённых миграций через `migrate deploy`.
- `db:migrate:dev`: создание новой миграции разработчиком.
- `db:seed`: 27 активов, общий проект, основной Ledger и шесть счетов.
- `pilot:setup`: проверка окружения, generate, migrate deploy, seed.

Seed сериализуется блокировкой PostgreSQL, повторное выполнение не создаёт
дубликаты. Существующие русские названия кассовых и банковских счетов сохранены.

Если база ранее создана через `db push`, не запускайте initial migration поверх
неё вслепую. Сделайте резервную копию, сравните фактическую схему с
`prisma/schema.prisma` и только при полном совпадении выполните:

```sh
npx prisma migrate resolve --applied 202609170001_initial
npm run pilot:setup
```

Это отмечает исходную схему как уже применённую; данные не пересоздаются.

## Правила учёта

Суммы хранятся со знаком. Баланс = openingBalance + сумма проводок. Расходы,
инвестиции и комиссии отрицательны; доходы и возвраты положительны. Переводы и FX
создают две проводки и отдельную COMMISSION в одной транзакции БД.

Расчёты выполняются через Prisma Decimal; API возвращает денежные значения
строками. USD без явного курса использует 1. Другие активы, включая USDT, требуют
ручной USD-оценки; отсутствующие оценки отмечаются в отчётах. Dashboard показывает
USD-остаток по сохранённым курсам, а не текущую рыночную стоимость.

Доходы и расходы требуют проект. Результат проекта = доход − расход − комиссии;
денежный поток дополнительно учитывает инвестиции и возвраты. Фильтры дат —
включительные календарные дни Asia/Dushanbe. Реализованный Futures P&L относится к дате
закрытия. Funding со знаком плюс — расход; отрицательный funding — поступление.

Spot/Futures вводятся вручную. Рыночные данные не создают бухгалтерские проводки.
Futures P&L = разница цен с учётом LONG/SHORT × quantity − fees − funding.

## Ограничения пилота

- Приватные API бирж пока не подключаются; форма сохранения отключена явно.
- Spot realized P&L вводится вручную; FIFO/средняя себестоимость не реализованы.
- Остатки в разных активах не оцениваются автоматически по текущему рынку.
- Нет автоматического резервного копирования, экспорта и постраничного журнала.
- Публичный запуск требует HTTPS, защиты от перебора паролей и ограничения
  запросов. Действующая сессия не отзывается автоматически при смене пароля.
- `npm audit` выявил четыре high предупреждения в цепочке Prisma CLI
  (`@prisma/config`, `effect`, `deepmerge-ts`, `prisma`); нужна отдельная проверка
  совместимого обновления зависимостей перед публичным запуском.

Следующий этап: закрыть dependency advisories, настроить backup/restore,
нагрузочные проверки, пагинацию и политику отзыва сессий; затем интеграции бирж.

## Hardening release

See [pre-merge evidence](outputs/PRE_MERGE_REPORT.md), [security assessment](outputs/SECURITY_REPORT.md), [backup/restore](docs/BACKUP_AND_RESTORE.md), [timezone](docs/TIMEZONE.md), and [immutability](docs/ACCOUNTING_IMMUTABILITY.md). App version is defined in `src/config/version.ts`. Configure HTTPS and trusted proxy IP handling before deployment.
