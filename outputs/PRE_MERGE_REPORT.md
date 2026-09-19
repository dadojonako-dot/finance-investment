# Pre-merge report — Pilot v0.1.1

Дата: 2026-09-19. Опубликованная ветка: `codex/pilot-v0.1.1-hardening`.
База: `047a31ff4c395b0ac7596f53c1bbd9187f2c19f2` (`codex/pilot-v0.1`).
Проверенный в CI commit: `a105d681608857bb928b3e40dfd9db5b2a265fba`. Последующий commit обновляет только отчёты. Все опубликованные Git trees совпали с локальными проверенными trees.

## Результат

Ветка [codex/pilot-v0.1.1-hardening](https://github.com/dadojonako-dot/finance-investment/tree/codex/pilot-v0.1.1-hardening) опубликована. [GitHub Actions](https://github.com/dadojonako-dot/finance-investment/actions/runs/35439297761) — SUCCESS. `main` не изменён, merge не выполнялся.

Рекомендация: готово к review и merge для контролируемого однопроцессного Pilot с учётом документированных рисков ниже. Это не разрешение на публичный production deployment без настройки окружения.

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
| HTTP acceptance | 23/23 локально; 24/24 в CI на чистой БД, включая дополнительную группу bootstrap race |
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
| Backup/restore | PASS локально и в CI: новая БД, точная исходная сумма, поздней записи нет, source unchanged |
| Browser | Login загружается, console errors/warnings не обнаружены; остальные страницы проверены HTTP |
| Новый GitHub Actions | SUCCESS, run [35439297761](https://github.com/dadojonako-dot/finance-investment/actions/runs/35439297761) |

## Опубликованные коммиты

```
e900d18d4fc75bfc58047a2ff8bb4c3cfdbe6d81 Harden authentication, revocable sessions and user audit
c66267f819845a71cf5682eb5df690c8b4e4c36a Add health, version, security headers and Dushanbe date boundaries
b9e9353bf16c92cd8c23ae43def6a6af4ec18644 Add isolated backup restore, hardening acceptance and operational documentation
982997093e6169bcc0b48ccca0ec899235f02f1a Verify isolated restore and tighten date, CSP and regression coverage
a105d681608857bb928b3e40dfd9db5b2a265fba Record local hardening evidence and pending GitHub CI gate
```

SHA отличаются от локальных из-за metadata GitHub API; содержимое trees проверено на полное совпадение. Следующий commit содержит только финальные отчёты.

## Риски и следующий шаг

Подробности: SECURITY_REPORT.md. Остаётся одна high advisory DeepmergeTS, отражённая в 4 пакетах npm audit; совместимого исправления нет. Limiter хранит состояние одного процесса и сбрасывается после рестарта. CSP допускает inline scripts/styles. Immutable API не защищает от DBA. Полный reversal и принудительная ротация временного пароля не реализованы.

До тестового deployment: провести review и отдельно решить merge. Затем HTTPS, уникальные AUTH_SECRET/DB credentials, один instance, доверенный перезаписываемый IP header, закрытый прямой доступ к приложению, защищённые backup и bootstrap OWNER до внешнего доступа.

Для воспроизведения: `npm run pilot:setup`, `npm run db:seed`, `npm run pilot:check`, production server на localhost:3100, `PILOT_TEST_ALLOW_WRITE=1 npm run test:acceptance`; затем `npm run test:backup` с тем же opt-in и PG_BIN либо PILOT_DB_TOOLS=compose. Только disposable test database.
