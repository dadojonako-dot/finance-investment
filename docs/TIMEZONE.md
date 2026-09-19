# Time conventions

Persist instants as Prisma DateTime values normalized to UTC. Pilot calendar inputs and inclusive from/to filters use Asia/Dushanbe (UTC+05:00, no current daylight saving). The API accepts explicit ISO offsets; naive datetime-local and date-only inputs mean Dushanbe. Date displays in journal and audit explicitly use Asia/Dushanbe.

A filter for 2026-09-18 is [2026-09-17T19:00:00Z, 2026-09-18T19:00:00Z). The exclusive upper boundary avoids losing subsecond entries. This changes the earlier Pilot UTC-calendar filter convention. Existing timestamp values are not migrated.

Tests cover both sides of midnight and the final millisecond via actual HTTP reports. The fixed +05:00 interpretation targets contemporary Pilot operations; historical timezone rule changes are not supported. Extend to an IANA-aware conversion library if historical or multi-zone accounting is introduced.
