# Vortex timing audit

Printed Vortex previously exposed a Main-phase attack flag without scheduling
its required optional EndOfYourTurn attack. Compiled Digimon now receive a
conditional end-turn Vortex effect, including recipients that gain the keyword
from other cards. Explicit authored Vortex attacks suppress duplicate synthesis;
Overclock, Engage and Execute remain independently eligible for granted Vortex.
Options and Tamers do not receive this synthesized Digimon trigger.

The Attack IR passes its Vortex mode through to attacker and target legality,
allowing same-turn play and unsuspended opposing Digimon while retaining the
existing EX11-062 player-target exception. Forged public Main-phase Vortex
intents are rejected.

Proofs include printed ST18-08/ST18-12 activation, acceptance/refusal, a neutral
ST9-12 receiving Vortex from BT26-045 and declaring the exact observed attack,
grant loss, and Shoto's two actual end-turn resolution orders. Shoto before
Vortex enables Piercing and leaves the attacker suspended; Shoto after Vortex
leaves security untouched and unsuspends the attacker.

Serial verification used `--pool=forks --maxWorkers=1 --no-file-parallelism`:

- Affected Vortex/mechanism plus Tsunomon: 10 files, 79 tests passed.
- Conformance + ST18 + ST21: 60 files, 523 tests passed.
- Subsequent Shoto ordering proof: 1 file, 8 tests passed.
- Shared/web type checks passed; API type check passed after removing duplicate
  imports introduced during worktree integration.

The ST18 collection and overall starter audit remain separately tracked.
