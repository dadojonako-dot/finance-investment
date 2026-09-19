# Pilot v0.1.1 hardening report

Application version is sourced from src/config/version.ts and shown in health and navigation. Branch codex/pilot-v0.1.1-hardening.

This release preserves signed Decimal accounting, manual Spot/Futures and the existing Next.js/PostgreSQL architecture. It adds login throttling, common password policy, revocable sessions, user password reset and granular audit events; public safe health; security headers; Dushanbe calendar filters; backup/isolated restore tools; and expanded unit/HTTP/CI checks.

Read PRE_MERGE_REPORT.md for verified commits/CI and SECURITY_REPORT.md for remaining risks. Operational instructions: ../docs/BACKUP_AND_RESTORE.md, ../docs/TIMEZONE.md, ../docs/ACCOUNTING_IMMUTABILITY.md and the root README.

Deployment remains controlled Pilot only: one app instance behind HTTPS with a trusted overwritten IP header, unique secrets, restricted database access, tested protected backups, and OWNER bootstrap before public access. No private exchange API, withdrawals or automated trade-to-ledger postings are enabled. Full reversal workflow remains deferred.

Local validation: 9 unit tests, 23 HTTP groups and isolated backup/restore pass. Health failure returns safe 503. Published branch passes GitHub Actions: https://github.com/dadojonako-dot/finance-investment/actions/runs/35439297761. CI passes 24 HTTP groups on a fresh database, including concurrent bootstrap, plus isolated backup/restore and safe DB-down health. Ready for review and controlled Pilot merge with documented risks; main remains unchanged. See PRE_MERGE_REPORT.md for exact tested code SHA.
