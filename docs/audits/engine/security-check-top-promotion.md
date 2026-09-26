# Security checks after top-card promotion

EX11-043 Invisimon's Q5888 ruling requires a Digimon with Security Attack +1
to finish its second security check after its first face-up check places the
attacking Digimon's top card into its own security. The promoted EX11-041
Oblivimon then performs that second check and may place itself in security.
Q5887 requires the attack to stop when the promoted card is a Tamer.

The public EX11-043 regression initially failed Q5888: the first check placed
Invisimon correctly, but no second `securityChecked` event occurred. The
top-detachment path called `dropPermanentLedgers` even though the permanent
remained in play. That erased Invisimon's temporary Security Attack grant,
making the live strike count fall from two to one. Other top-promotion paths,
including De-Digivolve, retain the permanent's temporary grants.

The security-placement verb now promotes the next card, keeps the remaining
permanent's temporary ledgers, and recomputes continuous effects for its new
top. The Q5888 test observes both checks and both face-up placements; the
final 3000-DP base loses the second security battle to the 4000-DP security
Digimon. The Q5887 test uses public Mind Link to promote a Tamer and confirms
the attacking permanent leaves play.

Verification with `NODE_OPTIONS='--max-old-space-size=2048'` and one Vitest
worker:

```text
pnpm exec vitest run src/cards/EX11/EX11-043.test.ts src/engine/security src/engine/conformance/keyword-security-attack-lifecycle.test.ts --maxWorkers=1 --no-file-parallelism --silent
Test Files 14 passed (14); Tests 112 passed (112)
```
