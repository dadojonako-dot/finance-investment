# Immutable posted accounting

Posted Transaction, Transfer, FX, Spot and Futures entries are immutable through the Pilot API. No DELETE, PATCH or PUT handlers exist for them; authenticated attempts receive 405. Audit has GET only. Users are disabled rather than deleted.

Corrections must preserve the original entry and use an explicitly linked reversal/correction. The complete reversal workflow is deferred to v0.2; do not modify posted rows directly as an operational shortcut. Database administrators remain technically capable of writes: use restricted production database access and review emergency changes. This is application-level immutability, not a database tamper-proof ledger.
