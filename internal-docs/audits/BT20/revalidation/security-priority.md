# Security reveal priority correction

BT20-005/Q4284 and CR 15-16-10-2 require immediate Security activation before other check triggers. `005-security-priority.log` reproduces Jamming already present while BT18-086 Security optional choice is pending.

`securityCheck.ts` now snapshots eligible reveal watchers before Security and activates them afterward. GameEngine arms existing subscriptions with live source checks; newly installed watchers cannot join the old event and sources removed by Security cannot activate. Both previously face-up checks and newly revealed face-down cards use this order.

Validation: card005 and security unit suite pass; `security-mechanism-1.log` records 4 files/59 tests including live public attacks and synthetic watcher lifecycle controls. `security-affected-1.log` records 10 files/69 tests across security, announcements, strike count, conformance and continuous watcher accumulation. `typecheck-integration-2.log` records API typecheck exit0. Scoped lint, formatter and diff checks pass.

Luna A independently reviewed the production diff and identified a separate unresolved issue: reveal watchers and OnSecurityCheck/OnLoseSecurity effects cannot yet share one turn-player-first ordering pool. This correction does not establish complete Q4284 conformance or 10/10 for BT20-005. A separate simultaneousCheckTriggers regression is being prepared; collection remains incomplete.
