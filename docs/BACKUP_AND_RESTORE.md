# PostgreSQL backup and restore

Requirements: PostgreSQL client tools matching the server major version, or the supplied Docker Compose PostgreSQL container. Configure DATABASE_URL through the environment or the ignored .env. Never put credentials in command arguments.

For Docker Compose, set PILOT_DB_TOOLS=compose. Otherwise put pg_dump, pg_restore and createdb in PATH or set PG_BIN to their directory. The helper supplies connection credentials as process environment variables and does not print them.

```
npm run db:backup
npm run db:restore -- --file backups/pilot-<timestamp>.dump --database pilot_restore_check
```

Backup writes a timestamped custom-format dump in ignored backups/. Restore always creates a NEW separate database. It rejects the source name and refuses existing targets; it never drops/cleans a database. A restore failure can leave an empty target database for administrator inspection. Verify row counts, representative Decimal values, users, migrations and health before choosing a restored database for deployment.

`PILOT_TEST_ALLOW_WRITE=1 npm run test:backup` is for a disposable seeded test database with an OWNER only. It creates a transaction, dumps, creates another transaction, restores into a unique separate database and verifies the original exact amount exists and the later row does not. It also confirms the source remains intact. CI runs this on disposable Docker PostgreSQL; restored test databases disappear with the disposable runner. No restore is performed over the source.

Backups contain personal/financial data and password hashes. Keep encrypted copies off-host with access limited to operators. Suggested Pilot retention: 7 daily and 4 weekly backups; verify a restore weekly and before upgrades. Git ignore is not encryption. On Windows apply an operator-only ACL to backups/. Record backup/restore timestamps and perform database cutover separately under an approved maintenance procedure.
