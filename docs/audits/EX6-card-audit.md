# EX6 card audit ledger

Audit order: EX6-074 down through EX6-001. The committed catalog source is
`packages/shared/src/cards/data/cards.json`; the local knowledge-base command
was run for every ID; compiled IR is in
`packages/shared/src/effects/effects.json`; direct modules and behavioral tests
are under `apps/api/src/cards/EX6/`.

The hashes below are the first 12 hex characters of SHA-256 for the module and
co-located test at ledger generation time. `full` means the module exposes
compiled IR coverage; `direct` means the card uses a hand-written
`EffectModule`. “NR” means no score was assigned: the runtime was not
available, so the rubric's 10/10 condition was not met and no score was
invented.

## Verification status

- Catalog: all 74 committed EX6 IDs found, including printed effect, inherited,
  security, colors, costs, levels, traits, and evolution requirements.
- KB: `node tools/kb/query.mjs card EX6-074` through `EX6-001` completed for
  all 74 cards and returned the matching card record.
- Module/test: all 74 module paths and all 74 co-located test paths exist.
- IR: all 74 IDs have an entry in the committed effects registry; direct
  modules are the runtime authority for their listed cards.
- Runtime blocker: `pnpm` is not installed (`pnpm: command not found`), no
  local Vitest or TypeScript binaries were present, so Vitest, typecheck, and
  runtime execution remain unverified.
- `git diff --check`: passed after the EX6-001 correction.

## Per-card inventory

| ID | Name | Module mode | Residual markers | Module SHA-256 | Test SHA-256 | Score |
|---|---|---:|---|---|---|---|
| EX6-074 | Mirei Mikagura | full | none found | 094103f03a1f | ecb723d809b3 | NR |
| EX6-073 | Ogudomon | direct | none found | 29595eb28e0c | c199dadaece2 | NR |
| EX6-072 | Mega Digimon Assembly! | full | none found | 6605805a1d31 | fe49ab4d14f2 | NR |
| EX6-071 | Pandemonium Lost | direct | none found | cbcb5677c382 | fe4612f9ea60 | NR |
| EX6-070 | Phantom Pain | direct | none found | 6e962facdc98 | 40e52bf07340 | NR |
| EX6-069 | Rise of the Seven Great Demon Lords | direct | none found | a8d8e2f41eb | 91c82aa8915c | NR |
| EX6-068 | Descent of the Three Great Angels | direct | none found | 8e7d47addfc2 | 8a014aac50c0 | NR |
| EX6-067 | Final Excalibur | full | none found | 0ee4729f1245 | a31d35372b47 | NR |
| EX6-066 | Sea of Destruction | full | none found | 0faa1205b112 | c03215f52ce5 | NR |
| EX6-065 | Mythical Arms of Salvation! | full | none found | bedf266d804c | 685a860a2b7b | NR |
| EX6-064 | Shu-Chong Wong | full | none found | a71f2df8b6b8 | 07b1833e7f83 | NR |
| EX6-063 | T.K. Takaishi & Kari Kamiya | direct | none found | fae905e93751 | 2e326381d249 | NR |
| EX6-062 | UltimateChaosmon | full | none found | 5514d293c458 | c426d38dd7af | NR |
| EX6-061 | Leviamon | direct | none found | 218399d94a6f | 38b353c650d7 | NR |
| EX6-060 | Belphemon: Rage Mode | full | none found | f2fd8c7d5cc7 | 60347f09f283 | NR |
| EX6-059 | Barbamon | direct | none found | b3eede08f23c | 7ccc758911b9 | NR |
| EX6-058 | Creepymon | full | none found | 6803c73097c7 | 68dd9b29f77b | NR |
| EX6-057 | Lilithmon | direct | none found | 1e2cf3bacd8e | 27d45da94e76 | NR |
| EX6-056 | Beelzemon | full | none found | f8c7f6af9797 | a12f5534c674 | NR |
| EX6-055 | DanDevimon | full | none found | 4ba833cef5a7 | 2a51ab5472fb | NR |
| EX6-054 | Lucemon: Chaos Mode | full | none found | fae00b798c9f | 7ccc60d9761f | NR |
| EX6-053 | LadyDevimon | full | none found | 00925227b2d7 | bcbbf00c3bb4 | NR |
| EX6-052 | Bastemon | full | none found | 8051a12a70f7 | 6e6b7bab7fd2 | NR |
| EX6-051 | NeoDevimon | full | none found | 9a4ee04d3aec | 5c179707898d | NR |
| EX6-050 | Feresmon | full | none found | 90b89ff376d2 | 55dac5f4da31 | NR |
| EX6-049 | Devimon | full | none found | 89216c03f31b | 234bc1963d51 | NR |
| EX6-048 | Witchmon | full | none found | 3714f3551968 | 1a1dcc40c6a7 | NR |
| EX6-047 | Boogiemon | full | none found | c54fa81830f4 | 843b4701b365 | NR |
| EX6-046 | DemiDevimon | full | none found | 5f2b0d210d46 | 0a516077d52d | NR |
| EX6-045 | Tsukaimon | full | none found | f80618b41eab | 5e59568a371e | NR |
| EX6-044 | BryweLudramon | full | none found | 3df7a92ecd7f | 8fee10af74e2 | NR |
| EX6-043 | Diaboromon | full | none found | bed1251b801a | 987eb52936fa | NR |
| EX6-042 | RaijiLudomon | full | none found | 05fde9b95b49 | 3e56d14471ed | NR |
| EX6-041 | Infermon | full | none found | 986c06de64a9 | afaa3d79f472 | NR |
| EX6-040 | TiaLudomon | full | none found | 942fe645c119 | a7c9a760b684 | NR |
| EX6-039 | Kurisarimon | full | none found | 1ed2d9f6c45f | 02666e5ceb38 | NR |
| EX6-038 | Ludomon | full | none found | af0b1c711f40 | 254feaecfefc | NR |
| EX6-037 | Spadamon | full | none found | 6c044bcd5bea | 27190eb4dbc0 | NR |
| EX6-036 | Keramon | full | none found | eebcc4521e16 | 250332b5a15e | NR |
| EX6-035 | Cherubimon | full | none found | 3f368ebfcf1c | 30dc5426c293 | NR |
| EX6-034 | Antylamon | full | none found | 7fbd7739f4de | 60e7d9088446 | NR |
| EX6-033 | Turuiemon | full | none found | 0ae83cd632c1 | 3813d611d5cb | NR |
| EX6-032 | Lopmon | full | none found | 962ccd468076 | cf0a35505da1 | NR |
| EX6-031 | Shakamon | full | none found | 9a0be36188b3 | 3e0f7fff4b2c | NR |
| EX6-030 | Dominimon | direct | none found | ebe67f195b65 | bbeaf9a3c86c | NR |
| EX6-029 | Mastemon | full | none found | f7023190ac8f | 988af2e17e78 | NR |
| EX6-028 | Seraphimon | full | none found | a97921b6b20b | a7b996b20989 | NR |
| EX6-027 | Ophanimon | full | none found | d3bc5320adcf | 534778d3712a | NR |
| EX6-026 | Cho-Hakkaimon | full | none found | 7d2f2af94cd7 | ee3e7d2c0f06 | NR |
| EX6-025 | Sanzomon | full | none found | d36ea37101b6 | b018078000d9 | NR |
| EX6-024 | Sagomon | full | none found | 7434d249ffe3 | 675186d725fb | NR |
| EX6-023 | Gokuumon | full | none found | 44cef7601956 | bc4da66da593 | NR |
| EX6-022 | Angewomon | full | none found | 73eb5691ac0c | 9043e16edc75 | NR |
| EX6-021 | ArkhaiAngemon | full | none found | 04de9c75d492 | b6491b7e9277 | NR |
| EX6-020 | Gatomon | full | none found | 40962dc37ae8 | 65a3cb254ec6 | NR |
| EX6-019 | Angemon | full | none found | 1017a01be004 | 0fa1a45aad0a | NR |
| EX6-018 | Lucemon | full | none found | a691b8cb1fed | 18cb30cbdf0f | NR |
| EX6-017 | Luxmon | full | none found | 97ab5e8ee3aa | 7db4bb5234ee | NR |
| EX6-016 | Salamon | full | none found | 2fd720c15c61 | 9fd6b4a35246 | NR |
| EX6-015 | Xiangpengmon | full | none found | b0a11ae801b9 | 1412814a1e2a | NR |
| EX6-014 | Huankunmon | full | none found | 105abb78d481 | 2643c58abb7d | NR |
| EX6-013 | Xiquemon | full | none found | ae18e9a249dc | d12284d8aa8f | NR |
| EX6-012 | Biyomon | full | none found | 0c809eaa69eb | 0c4dfe7c3b3e | NR |
| EX6-011 | RagnaLoardmon | full | none found | 84c94de1251b | 365664ea2d10 | NR |
| EX6-010 | Durandamon | direct | none found | 76ffb2964316 | f9ab018d11a3 | NR |
| EX6-009 | Duramon | full | none found | 7f04440ebd8 | 315e3ed371e5 | NR |
| EX6-008 | ZubaEagermon | full | none found | 02fef374f15b | 4dc5a77dfda7 | NR |
| EX6-007 | Zubamon | full | none found | a5fccf1da91c | 7972b60002a3 | NR |
| EX6-006 | Gate of Deadly Sins | full | review residual markers | cd6b8edfceaa | 709fde40bd90 | NR |
| EX6-005 | Kakkinmon | full | none found | 22f4829d8bf8 | 0f5a4513bc1d | NR |
| EX6-004 | Kokomon | full | none found | 92f150ad2a3e | 2b88e6a0eac3 | NR |
| EX6-003 | Cupimon | full | none found | 752d5d2439ae | 7dd58f26567b | NR |
| EX6-002 | Yokomon | full | none found | 811013b64494 | 17da366f8407 | NR |
| EX6-001 | Sakuttomon | direct | corrected + behavioral test | 12f896c11755 | 3a973819a7c0 | NR |

## Corrected evidence-backed issue

EX6-001 now checks `addedDigivolutionCardInstanceIds` from the
`onAddDigivolutionCards` event instead of searching the entire existing stack.
The co-located test proves that adding a non-Legend-Arms card does not grant
memory, while adding EX6-007 does. The test name was also corrected from the
catalog-inconsistent “Kokuwamon” to “Sakuttomon”.

## Remaining blockers

The focused serial Vitest command could not start because `pnpm` is absent.
No runtime, Vitest, or typecheck result is claimed. The ledger therefore
intentionally leaves every score as NR, including cards whose static module
reports `coverage: "full"`. Re-run the serial focused suite, affected engine
suite, `pnpm typecheck`, and `git diff --check` in an environment with the
workspace toolchain before assigning numeric scores.
