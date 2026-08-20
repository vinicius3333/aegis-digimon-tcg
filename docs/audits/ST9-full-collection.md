# ST9 full-collection audit ledger

Scope: `ST9-15` down through `ST9-01`, audited individually on 2026-08-20
with Luna medium. The committed catalog is
`packages/shared/src/cards/data/cards.json`; the local card KB query was run
for every ID. Direct modules and colocated tests are under
`apps/api/src/cards/ST9/`. The compiled IR is the `CompiledCard` registered by
each module, or the absence of a module for an evidence-backed vanilla card.

## Rubric and verification gates

For each card, the static review checked catalog identity and printed fields,
KB rulings/errata/banlist, clause-to-IR mapping, requirements and traits,
costs and failure paths, controller/target scope, zones/order/face, timing and
OPT/duration, and the decision surface. Relevant local rule queries covered
DNA Digivolution, Security effects, Blocker, Once Per Turn, suspension, and
end-of-turn timing. The card-specific tests cover the observable positive and
negative paths listed below, including evolution stacks where applicable.

The final runtime gate is **NOT VERIFIED**: the requested Vitest command could
not start because the checkout has no installed `vitest`; shared compilation
and typecheck are likewise unavailable. No card is scored 10/10. Static
evidence is recorded as 9/10 with the runtime gate explicitly unverified.

`module` and `test` hashes are abbreviated `git hash-object` values. `-` means
the catalog has no effect text and no behavior module is applicable.

| Source | SHA-1 |
|---|---|
| Catalog `packages/shared/src/cards/data/cards.json` | `5073d48182ac` |
| KB manifest `data/kb/manifest.json` | `e667df86bdb8` |
| Comprehensive rules `data/kb/rules/comprehensive.md` | `b56d66a950b2` |
| Set index `apps/api/src/cards/ST9/index.ts` | `b88584c86be1` |

## Per-card results

| Card | Module / hash | Test / hash | Static clause and interaction evidence | Score |
|---|---|---|---|---|
| ST9-15 Hell Masquerade | `ST9/ST9-15.ts` / `38430e1b56f0` | `ST9/ST9-15.test.ts` / `affb1aa3b7af` | KB Q722; Main +2000 and conditional Piercing are separate choices with exact own-Digimon scope, turn duration, blue gate, and Security add-to-hand; test proves different targets. | 9/10, runtime not verified |
| ST9-14 Megadeath | `ST9/ST9-14.ts` / `987237321e69` | `ST9/ST9-14.test.ts` / `e9c6172a973d` | KB Q721; Main suspends first, then returns any opponent suspended Digimon to owner hand, so the second target may differ; Security activates Main. | 9/10, runtime not verified |
| ST9-13 GranKuwagamon | `ST9/ST9-13.ts` / `012541d47709` | `ST9/ST9-13.test.ts` / `c9f9ce285238` | Catalog Security Attack +1 and When Digivolving +4000 for the turn map to static keyword and bounded DP effect; test covers the evolution transition and keyword. | 9/10, runtime not verified |
| ST9-12 JewelBeemon | `-` | `ST9/ST9-12.test.ts` / `727fdd10ae52` | Vanilla catalog card; test covers green Lv.4 evolution, cost 2, 7000 DP, final stack/top face, and absence of an effect module. | 9/10, runtime not verified |
| ST9-11 Dinobeemon | `ST9/ST9-11.ts` / `e5a39e57dba9` | `ST9/ST9-11.test.ts` / `a885c205dde7` | KB Q719 makes only the suspend unconditional on ordinary evolution and the unsuspend lock DNA-only; Q720 counts only host top-card colors. SelectBind preserves the exact suspended target; DNA requirement and two-color inherited DP are covered. | 9/10, runtime not verified |
| ST9-10 Snimon | `ST9/ST9-10.ts` / `74b17948fc70` | `ST9/ST9-10.test.ts` / `0900b3ebe2d1` | KB Q716–Q718; Security play occurs after battle and before the next check, invokes On Play, and suspends one opponent Digimon. Test covers security loss, ordering, and target suspension. | 9/10, runtime not verified |
| ST9-09 Stingmon | `ST9/ST9-09.ts` / `58e3fe9413f3` | `ST9/ST9-09.test.ts` / `ea6ed1068a95` | KB Q715; current banlist restriction to 1 is catalog/runtime metadata, while the module maps blue-gated self play reduction and inherited draw, including host-self color interpretation. | 9/10, runtime not verified |
| ST9-08 Wormmon | `ST9/ST9-08.ts` / `7358855b4659` | `ST9/ST9-08.test.ts` / `3b5624e98b8b` | KB Q712–Q714; inherited End of Your Turn effect is optional, uses this host plus one other own Digimon, pays DNA cost, and requires a DNA Digivolve card. Tests cover the legal stack and reject an ordinary Lv.5 result. | 9/10, runtime not verified |
| ST9-07 KoKabuterimon | `ST9/ST9-07.ts` / `fa37fa3b58a6` | `ST9/ST9-07.test.ts` / `d1271920c152` | KB Q711; opponent-turn blue-presence Aura grants Blocker and is re-evaluated before reaction timing. Test covers loss of the only blue Digimon during the attack. | 9/10, runtime not verified |
| ST9-06 Imperialdramon: Dragon Mode | `ST9/ST9-06.ts` / `967d18363868` | `ST9/ST9-06.test.ts` / `f6057bca8c60` | KB Q710; one optional decision controls both mandatory source plays, with separate blue/green Lv.4-or-lower filters, source zone, free play, and DNA evolution context. Tests cover accept, decline, full line, and source replay. | 9/10, runtime not verified |
| ST9-05 Paildramon | `ST9/ST9-05.ts` / `7b6d25fa2ba3` | `ST9/ST9-05.test.ts` / `f63714843ce4` | KB Q709; bottom-deck is DNA-only, with opponent DP <=6000 and owner deck-bottom destination; When Attacking Once Per Turn unsuspends self. Tests cover ordinary evolution negative path, DNA removal, attacks, and OPT. | 9/10, runtime not verified |
| ST9-04 ExVeemon | `ST9/ST9-04.ts` / `9c7fa17f7c67` | `ST9/ST9-04.test.ts` / `0107a1450dc0` | KB Q708; green Digimon in play reduces only this card's hand play cost by 1, while inherited attack DP is gated by green presence and lasts the turn. Tests cover both cost branches and host-self color behavior. | 9/10, runtime not verified |
| ST9-03 Betamon | `-` | `ST9/ST9-03.test.ts` / `94360a3a7f86` | Vanilla catalog card; test covers play cost 3, 4000 DP, final zone/face, and absence of an effect module. | 9/10, runtime not verified |
| ST9-02 Veemon | `ST9/ST9-02.ts` / `adbee29aaf36` | `ST9/ST9-02.test.ts` / `fde2e8c9cf37` | KB Q706–Q707; On Play reveals up to the required top 3, must add one matching Free trait card, and bottoms the remainder. Test covers add and bottom-deck order path. | 9/10, runtime not verified |
| ST9-01 Minomon | `ST9/ST9-01.ts` / `1d117bb7c03d` | `ST9/ST9-01.test.ts` / `975a62688684` | KB Q705; inherited Your Turn +1000 is an Aura on the host and checks blue presence, including the host itself. Test covers the evolution stack and DP result. | 9/10, runtime not verified |

## Commands and blockers

The requested pnpm entry point was checked at
`/home/vinicius/.local/bin/pnpm` and uses Corepack. Corepack had pnpm
`10.30.1` available. `corepack pnpm install --offline --frozen-lockfile`
could not complete because the local store lacks `concurrently@10.0.0`; the
network install could not reach the npm registry. The wrapper itself invokes
`corepack pnpm ""`, so commands through that wrapper receive an empty command
argument.

The attempted low-memory serial command was:

```text
corepack pnpm --dir apps/api exec vitest run src/cards/ST9 --pool=forks --poolOptions.forks.maxForks=1 --no-file-parallelism
```

It failed before test collection with `Command "vitest" not found`. Therefore
the requested `@aegis/shared` build, Vitest suite, API typecheck, and final
runtime proof remain blockers. `git diff --check` passed, but the requested
plumbing commit could not be created because the sandbox rejected writes to the
repository object database with `Read-only file system` during `git add`.
There is consequently no commit hash to report; the three workspace changes
remain uncommitted and no reset, rebase, force-push, or discard was performed.
