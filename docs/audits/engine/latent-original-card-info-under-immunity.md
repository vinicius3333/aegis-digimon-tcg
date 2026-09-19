# Latent original-card-information changes under immunity

## Incident evidence

Read-only Oracle VPS logs for anonymized match `89a903c1-08ac-4aab-9a26-86421ac7c867`
showed EX11-074 Vortexdramon gain immunity from opposing Digimon effects through its
`[When Attacking]` effect. During the following opponent turn, EX13-031 KingSukamon
selected that Vortexdramon for its base-name, color and DP change. The immunity ended
at that opponent turn's end while KingSukamon's change still had the Vortexdramon
controller's full turn remaining.

## Engine contract

An unaffected Digimon remains a legal target. A duration-scoped original-card-information
change is retained with its source seat and source kinds while immunity suppresses it.
When the matching immunity ends before the change's duration, the stored name, color and
base-DP override applies immediately. Each part still expires at its printed boundary.

`EX13-031.test.ts` reproduces the interaction with EX11-074, proves the printed identity
while immunity is active, the Sukamon/white/3000 identity after immunity ends, and the
name/color expiry at the end of the affected Digimon controller's turn. Focused engine
regressions cover existing DP affectation, continuous DP, continuous-ledger and modifier
behavior.
