# Local match diagnostics

The API writes structured JSONL records to `apps/api/logs` (or `AEGIS_LOG_DIR`). Every room receives a UUID in `GameState.matchLogId`, stable through reconnection and independent of reusable private room codes. The battle bug-report modal displays a selectable ID with a copy button.

Daily file segments preserve today and the previous six UTC calendar days; cleanup runs at startup, rotation and every minute. Size rotation starts a unique segment after 64 MiB and never renames a file with pending writes. Graceful shutdown waits for all streams to close. Tests do not write production logs.

Diagnostics include the initial seed, deck card IDs, player connection lifecycle, human and bot intents, results, duration, sequenced engine events, decisions and errors. Async context propagates the match ID to engine logs. Credentials and join authorization objects are not logged. Files contain private game information and remain server-local.

Retrieve retained records with `pnpm logs:match <UUID> [directory]`; redirect stdout to save the result. Records include timestamps and sequence/state revisions for ordering. In a multi-server deployment run retrieval on the server holding the files, or collect the directories centrally. Persist/mount the log directory when containers are replaced. Legacy `api.log` generations are removed once their modification time is more than seven days old.

Validation covers retention boundaries, preservation of unrelated files, lossless writes through rotation, room regression tests, frontend regression tests and TypeScript checks.
