# Pre-merge validation

Branch: codex/pilot-v0.1.1-hardening, based on 047a31ff4c395b0ac7596f53c1bbd9187f2c19f2. Commit evidence and CI result will be filled after publishing.

App version source: src/config/version.ts. Prisma/client 6.19.3; Next.js 16.3.3; Node 24.21.0 locally, Node 24 in CI.

Baseline: reviewed all six Pilot commits and original PILOT_REPORT/START, schema and CI. Re-ran production build and original 16-group acceptance before hardening; original CI run 35297226447 passed.

Local: migrations applied, seed twice idempotent, TypeScript and production build pass, 9 unit regressions pass. HTTP acceptance includes all six roles, concurrent bootstrap, password/limiter/session security, immutable endpoints, exact accounting and Dushanbe boundaries. Backup restore and DB-down health will be validated in CI. See SECURITY_REPORT for remaining dependency and single-instance limitations.

No merge performed. Final recommendation pending CI.
