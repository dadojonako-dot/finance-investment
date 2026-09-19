# Pilot security assessment

Version is defined in src/config/version.ts. Assessed 2026-09-18.

Prisma CLI and client are pinned together at 6.19.3 (previously 6.19.0). Generate, migration and build complete without critical Prisma warnings. No deprecated package.json Prisma config is used. npm installation script-approval notices belong to npm 11; explicit prisma generate is part of setup and CI. Prisma Accelerate promotional tips are not warnings.

The original audit reported high-severity Effect and Deepmerge findings. The compatible Prisma patch upgrade removed the affected Effect dependency path. [Effect advisory](https://github.com/advisories/GHSA-38f7-945m-qr2g).

After the upgrade npm audit reports 4 high package entries, zero critical: deepmerge-ts, @prisma/config, prisma and @prisma/client all trace to ONE remaining [DeepmergeTS recursive-object stack exhaustion advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx). Fixed upstream in major 8. Prisma 6 config uses major 7; no compatible fix is offered. We did not force an unreviewed major override. In this repository Prisma configuration is trusted developer input; untrusted HTTP JSON is not passed to the config merger and cannot encode recursive object graphs. Reduced runtime applicability is an assessment of this call path, not a claim that the advisory is fixed. Track a compatible upstream release; this remains a documented dependency risk.

Sessions: HS256 pinned, issuer/audience checked, 12-hour HttpOnly/SameSite=Lax cookie, Secure in production. DB role/isActive/sessionVersion are checked on every authorization. Disabling or password reset increments sessionVersion. JWT contains no role/email. Logout clears the cookie even when expired; a stolen token remains valid until expiry or session revocation (no per-token logout blacklist).

Login limiting: single-process in-memory, 5 failed/pending attempts per IP/email over 15 minutes; successful login resets that pair, with a separate 30-failure IP ceiling. Concurrent requests reserve slots atomically in-process. Storage interface permits an atomic shared adapter later. Restart clears limits; multiple workers do not share them. Pilot deployment must use ONE application instance or add edge/shared limiting. TRUST_PROXY_IP_HEADER must name an IP header overwritten by a trusted reverse proxy, with direct application access blocked. Without it requests share a conservative untrusted-peer bucket; arbitrary X-Forwarded-For is ignored. This avoids spoofing but can block all users after aggregate failures. IP is HMAC-hashed in audit; no password/hash is logged.

CSP blocks objects/frames and restricts origins. Inline scripts/styles remain allowed for Next.js hydration and current UI; strict nonce/hash CSP is deferred. No HSTS is sent by the app while local HTTP remains supported; configure HTTPS/HSTS at the deployment edge. No private exchange APIs are connected.

Posted data/audit immutability is enforced at the API, not against privileged database administrators. Password reset is administrator-set and does not implement email recovery or mandatory first-login rotation. HTTPS, unique AUTH_SECRET, database credentials and backup protection are deployment prerequisites.

Local backup validation completed 2026-09-19 using official EDB PostgreSQL 18.6 clients against PostgreSQL 18.4: exact Decimal retained, later row absent from restored separate DB, source intact. Client archive source: https://www.enterprisedb.com/download-postgresql-binaries . GitHub Actions run 35439297761 also passes the PostgreSQL 16 backup/restore, authentication, RBAC, financial and health checks: https://github.com/dadojonako-dot/finance-investment/actions/runs/35439297761.
