# EX7 card audit inventory

Audit direction: `EX7-074` down through `EX7-001`.

The committed catalog contains 74 EX7 cards. Every row below has a direct
module and a colocated test at:

- `apps/api/src/cards/EX7/<ID>.ts`
- `apps/api/src/cards/EX7/<ID>.test.ts`

Catalog evidence was read from `packages/shared/src/cards/data/cards.json`.
The KB column means `node tools/kb/query.mjs card <ID>` returned at least one
entry. `No` is an evidence blocker, not a claim that the card is incorrect.
IR, behavioral runtime, and scores remain `NR` because Vitest and TypeScript
were unavailable in this workspace. No card receives 10/10.

| ID | Name | Catalog | Module/test | KB | IR/runtime | Score |
|---|---|---|---|---|---|---|
| EX7-074 | Vortex Resonance | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-073 | BeelStarmon (X Antibody) | ✓ | ✓ | No | NR / NR | NR |
| EX7-072 | Seventh Fascination | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-071 | Hurricane Screw Shot | ✓ | ✓ | No | NR / NR | NR |
| EX7-070 | Der Blitz | ✓ | ✓ | No | NR / NR | NR |
| EX7-069 | Wind Slicer | ✓ | ✓ | No | NR / NR | NR |
| EX7-068 | Wonder Stomp | ✓ | ✓ | No | NR / NR | NR |
| EX7-067 | Summon Frost | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-066 | Chaos Triangular | ✓ | ✓ | No | NR / NR | NR |
| EX7-065 | Yuuki | ✓ | ✓ | No | NR / NR | NR |
| EX7-064 | Shoto Kazama | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-063 | Arisa Kinosaki | ✓ | ✓ | No | NR / NR | NR |
| EX7-062 | HeavyMetaldramon | ✓ | ✓ | No | NR / NR | NR |
| EX7-061 | Lilithmon (X Antibody) | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-060 | Nidhoggmon | ✓ | ✓ | No | NR / NR | NR |
| EX7-059 | BeelStarmon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-058 | LadyDevimon (X Antibody) | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-057 | Loudmon | ✓ | ✓ | No | NR / NR | NR |
| EX7-056 | Orochimon | ✓ | ✓ | No | NR / NR | NR |
| EX7-055 | Punkmon | ✓ | ✓ | No | NR / NR | NR |
| EX7-054 | BlackGatomon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-053 | Eyesmon: Scatter Mode | ✓ | ✓ | No | NR / NR | NR |
| EX7-052 | Tsukaimon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-051 | Sparrowmon | ✓ | ✓ | No | NR / NR | NR |
| EX7-050 | Impmon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-049 | Metallicdramon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-048 | Gundramon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-047 | Eldradimon | ✓ | ✓ | No | NR / NR | NR |
| EX7-046 | Jazarichmon | ✓ | ✓ | No | NR / NR | NR |
| EX7-045 | Jagamon | ✓ | ✓ | No | NR / NR | NR |
| EX7-044 | Gigadramon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-043 | Tankmon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-042 | Jazardmon | ✓ | ✓ | No | NR / NR | NR |
| EX7-041 | Tortomon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-040 | ToyAgumon | ✓ | ✓ | No | NR / NR | NR |
| EX7-039 | Jazamon | ✓ | ✓ | No | NR / NR | NR |
| EX7-038 | Gotsumon | ✓ | ✓ | No | NR / NR | NR |
| EX7-037 | Tlalocmon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-036 | Zephagamon | ✓ | ✓ | No | NR / NR | NR |
| EX7-035 | Triceramon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-034 | GrandGalemon | ✓ | ✓ | No | NR / NR | NR |
| EX7-033 | Monochromon | ✓ | ✓ | No | NR / NR | NR |
| EX7-032 | Galemon | ✓ | ✓ | No | NR / NR | NR |
| EX7-031 | Pteromon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-030 | Cendrillmon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-029 | SaberLeomon | ✓ | ✓ | No | NR / NR | NR |
| EX7-028 | Piximon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-027 | Chaperomon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-026 | Starmon | ✓ | ✓ | No | NR / NR | NR |
| EX7-025 | ShoeShoemon | ✓ | ✓ | No | NR / NR | NR |
| EX7-024 | Shoemon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-023 | Hexeblaumon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-022 | ShogunGekomon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-021 | CrysPaledramon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-020 | Paledramon | ✓ | ✓ | No | NR / NR | NR |
| EX7-019 | Sorcermon | ✓ | ✓ | No | NR / NR | NR |
| EX7-018 | Gekomon | ✓ | ✓ | No | NR / NR | NR |
| EX7-017 | SnowAgumon | ✓ | ✓ | No | NR / NR | NR |
| EX7-016 | Bulucomon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-015 | Otamamon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-014 | Volcanicdramon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-013 | MagnaKidmon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-012 | Lavogaritamon | ✓ | ✓ | No | NR / NR | NR |
| EX7-011 | Megadramon | ✓ | ✓ | No | NR / NR | NR |
| EX7-010 | Deputymon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-009 | Lavorvomon | ✓ | ✓ | No | NR / NR | NR |
| EX7-008 | ToyAgumon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-007 | Vorvomon | ✓ | ✓ | Yes | NR / NR | NR |
| EX7-006 | Yaamon | ✓ | ✓ | No | NR / NR | NR |
| EX7-005 | Kapurimon | ✓ | ✓ | No | NR / NR | NR |
| EX7-004 | Fluffymon | ✓ | ✓ | No | NR / NR | NR |
| EX7-003 | Kyaromon | ✓ | ✓ | No | NR / NR | NR |
| EX7-002 | Hiyarimon | ✓ | ✓ | No | NR / NR | NR |
| EX7-001 | DemiMeramon | ✓ | ✓ | No | NR / NR | NR |

## Hashes and validation

- Git base: `2110f31fd2a7f67533b626b0c3c192f97df33a7b` (`git rev-parse HEAD`)
- Catalog SHA-256: `dac8e0780dd34b03c3f5083d1f3647b4b864329ea94d19e92e3eebc14ede6144`
- EX7 registry SHA-256: `2a2c2601544ec9b08bb5473ee365d67b6fda74db71e7a6d14bf7c0b6dd1b9fea`
- `git diff --check`: passed
- Working tree before this inventory: clean

## Blockers

1. `pnpm` was not available directly; `corepack pnpm` was available but the
   workspace has no `node_modules`.
2. `vitest` and `tsc` were not installed, so serial Vitest, compiled IR,
   typecheck, and runtime behavior are unverified.
3. The local KB has no entry for 45 of 74 cards. Those cards cannot receive
   full evidence or 10/10 under the requested rubric.
4. No implementation or card-specific test was changed: without compiled IR,
   runtime proof, and complete KB evidence, there was no evidence-based fix to
   apply. No other collection was edited.
