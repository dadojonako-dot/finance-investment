# Pre-merge report — Pilot v0.1.1

Дата: 2026-09-19. Локальная ветка: `codex/pilot-v0.1.1-hardening`.
База: `047a31ff4c395b0ac7596f53c1bbd9187f2c19f2` (`codex/pilot-v0.1`).
Проверенный commit кода: `ff2cba735e9082e31dd506f23baa4ce5cdf134c5`. Последующий commit обновляет только отчёты.

## Результат

Локальная реализация и проверки завершены. Публикация ветки НЕ выполнена: GitHub-коннектор отсутствует среди доступных инструментов; Git push с разрешённым сетевым доступом завершается таймаутом соединения с github.com:443. Нового GitHub Actions run нет. `main` не изменён.

Не рекомендовано merge до публикации и зелёного CI на текущем коде. Это незавершённый внешний этап Definition of Done, а не подтверждение готовности к merge.

## Версии

Источник версии приложения: `src/config/version.ts`; значение выше извлечено автоматически. Prisma и @prisma/client: 6.19.3. Next.js: 16.3.3. Node: 24.21.0 локально; CI использует Node 24. Локальный PostgreSQL server: 18.4; официальные EDB client tools: 18.6. CI настроен на PostgreSQL 16.

## Проверки

| Проверка | Результат |
|---|---|
| Шесть исходных коммитов, PILOT_REPORT, START, schema и предыдущий CI | Изучены; исходный build и 16 групп acceptance повторно прошли до изменений |
| Prisma validate / generate | PASS, критических warnings нет |
| Миграции | PASS: первоначальная + security; проверено на новой отдельной БД |
| Seed дважды | PASS, 27 активов, один исходный Ledger и общий проект, 6 исходных счетов |
| TypeScript / production build | PASS |
| Unit regression | 9/9 PASS: деньги, Decimal, даты, policy, конкурентный limiter |
| HTTP acceptance | 23/23 группы PASS, финальный прогон 2026-09-19 |
| RBAC | Все 6 ролей: разрешённые/запрещённые accounting, Spot и Futures, users/audit |
| Bootstrap race | Два одновременных запроса: 201 + 409, ровно один OWNER на пустой БД |
| Session / users | PASS: живая роль, disable/re-enable, reset, последнего OWNER нельзя понизить |
| Login | PASS: 5 неудач → 429; успешный вход сбрасывает пару; cookie и expiry проверены |
| Audit | PASS: все финансовые create и отдельные user/auth actions, неизвестный email, без паролей/hash |
| Immutability | DELETE/PATCH/PUT финансовых API и audit → 405; удаление users → 405 |
| Финансы через HTTP | 1200/1050; transfer 700/300; с fee 690; FX -1000/+990 и отдельные -5; проект 680 |
| Decimal | 0.1+0.2, 1e-8, сумма за IEEE-754, fee и rate до 10 знаков |
| Timezone | PASS: обе границы суток Asia/Dushanbe через HTTP reports |
| Health | 200 при рабочей БД; 503 при недоступной БД, без URL/секретов |
| Backup/restore | PASS локально: новая БД, точная исходная сумма, поздней записи нет, source unchanged |
| Browser | Login загружается, console errors/warnings не обнаружены; остальные страницы проверены HTTP |
| Новый GitHub Actions | НЕ ЗАПУЩЕН: публикация заблокирована доступом |

## Коммиты реализации (локальные SHA)

```
80e22adabd85a0fc959be061c5ff6878d7c1880f Harden authentication, revocable sessions and user audit
47c0a5f90c1b63a53f7fa4d121db0c682fc4972e Add health, version, security headers and Dushanbe date boundaries
a76d12e476830f564ba589551ad029debff9d1c5 Add isolated backup restore, hardening acceptance and operational documentation
ff2cba735e9082e31dd506f23baa4ce5cdf134c5 Verify isolated restore and tighten date, CSP and regression coverage
```

## Риски и следующий шаг

Подробности: SECURITY_REPORT.md. Остаётся одна high advisory DeepmergeTS, отражённая в 4 пакетах npm audit; совместимого исправления нет. Limiter хранит состояние одного процесса и сбрасывается после рестарта. CSP допускает inline scripts/styles. Immutable API не защищает от DBA. Полный reversal и принудительная ротация временного пароля не реализованы.

До тестового deployment: восстановить GitHub-доступ, опубликовать эту ветку, дождаться полного CI (включая Compose backup/restore), провести review и отдельно решить merge. Затем HTTPS, уникальные AUTH_SECRET/DB credentials, один instance, доверенный перезаписываемый IP header, закрытый прямой доступ к приложению, защищённые backup и bootstrap OWNER до внешнего доступа.

Для воспроизведения: `npm run pilot:setup`, `npm run db:seed`, `npm run pilot:check`, production server на localhost:3100, `PILOT_TEST_ALLOW_WRITE=1 npm run test:acceptance`; затем `npm run test:backup` с тем же opt-in и PG_BIN либо PILOT_DB_TOOLS=compose. Только disposable test database.
