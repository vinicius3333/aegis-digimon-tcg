# BT3 collection audit — Luna medium

Date: 2026-08-20. Scope: committed catalog entries BT3-001 through BT3-112, descending to BT3-001 as requested.

Inventory roots: catalog packages/shared/src/cards/data/cards.json; direct modules apps/api/src/cards/BT3/<id>.ts; colocated tests apps/api/src/cards/BT3/<id>.test.ts. Hashes below are SHA-256 prefixes.

## Result

- 112/112 cards audited in the ledger below; 112/112 colocated tests exist.
- 93/112 cards have direct modules; 85 are compiled IR with coverage: full and residual: []; 8 are hand-authored TypeScript modules.
- 19 cards have no direct module because their committed catalog entries have no effect or inherited-effect text: BT3-007, BT3-009, BT3-020, BT3-022, BT3-028, BT3-032, BT3-037, BT3-038, BT3-044, BT3-045, BT3-053, BT3-059, BT3-060, BT3-067, BT3-076, BT3-078, BT3-083, BT3-085, BT3-089. Their colocated tests verify vanilla play/catalog behavior.
- All cards were queried with node tools/kb/query.mjs card <id>; 65 returned the explicit local result (no knowledge-base entries), and 47 returned KB entries. A missing KB entry is recorded, not treated as invented evidence.

## Ten-point rubric

No card receives 10/10. The static evidence covers catalog, KB query result, direct implementation or justified vanilla absence, colocated test presence, clause/keyword mapping, timing/target/cost/zone review, IR or handwritten implementation review, and diff hygiene. Runtime behavioral proof and typecheck remain unverified because dependencies are absent: the direct pnpm command is unavailable, corepack pnpm reports Vitest missing, and TypeScript reports tsc: not found. Therefore every card is NOT VERIFIED for final approval despite the existing static evidence.

## Verification commands

- Attempted serial low-memory Vitest: corepack pnpm --filter @aegis/api exec vitest run src/cards/BT3 --pool=forks --poolOptions.forks.maxForks=1 --no-file-parallelism --maxWorkers=1 --minWorkers=1 — blocked: Vitest not found; no test result claimed.
- Attempted typecheck: corepack pnpm typecheck — blocked because the script invokes unavailable pnpm; direct shared build — blocked by tsc: not found.
- git diff --check — passed on the pre-report worktree.

## Per-card inventory


| Card | Catalog | KB | Direct module | Test | Evidence status |
|---|---|---|---|---|---|
| BT3-001 | dac8e0780dd3 | none | IR full/no-residual (d1e2c23887b8) | BT3-001.test.ts (04a0f245e186) | Static only; runtime/typecheck not verified |
| BT3-002 | dac8e0780dd3 | none | IR full/no-residual (e3f14031c691) | BT3-002.test.ts (417c4621d421) | Static only; runtime/typecheck not verified |
| BT3-003 | dac8e0780dd3 | none | IR full/no-residual (3b95e73ec032) | BT3-003.test.ts (5de91526e173) | Static only; runtime/typecheck not verified |
| BT3-004 | dac8e0780dd3 | entry | IR full/no-residual (3cc8051644f1) | BT3-004.test.ts (33c63c4e4a19) | Static only; runtime/typecheck not verified |
| BT3-005 | dac8e0780dd3 | none | IR full/no-residual (2bc8ce3aff5e) | BT3-005.test.ts (49ca90fce113) | Static only; runtime/typecheck not verified |
| BT3-006 | dac8e0780dd3 | none | IR full/no-residual (e923796269c7) | BT3-006.test.ts (475fb6a7dfce) | Static only; runtime/typecheck not verified |
| BT3-007 | dac8e0780dd3 | none | vanilla/no module | BT3-007.test.ts (77a767ac9e21) | Static only; runtime/typecheck not verified |
| BT3-008 | dac8e0780dd3 | entry | IR full/no-residual (65975a333c52) | BT3-008.test.ts (333ea7283c48) | Static only; runtime/typecheck not verified |
| BT3-009 | dac8e0780dd3 | none | vanilla/no module | BT3-009.test.ts (c3eb8296aa76) | Static only; runtime/typecheck not verified |
| BT3-010 | dac8e0780dd3 | none | IR full/no-residual (ae4b4fb6d875) | BT3-010.test.ts (32f3aaecbd82) | Static only; runtime/typecheck not verified |
| BT3-011 | dac8e0780dd3 | entry | IR full/no-residual (58e9d5b94878) | BT3-011.test.ts (cb245f75101d) | Static only; runtime/typecheck not verified |
| BT3-012 | dac8e0780dd3 | none | IR full/no-residual (33be48f55e18) | BT3-012.test.ts (d73f536e8f03) | Static only; runtime/typecheck not verified |
| BT3-013 | dac8e0780dd3 | none | IR full/no-residual (45f90ace6afd) | BT3-013.test.ts (a5ff70ff0068) | Static only; runtime/typecheck not verified |
| BT3-014 | dac8e0780dd3 | entry | handwritten (10c76395a7f0) | BT3-014.test.ts (b6be158f7cc9) | Static only; runtime/typecheck not verified |
| BT3-015 | dac8e0780dd3 | none | IR full/no-residual (723d37c3d137) | BT3-015.test.ts (8f7eac035e96) | Static only; runtime/typecheck not verified |
| BT3-016 | dac8e0780dd3 | none | IR full/no-residual (641703087427) | BT3-016.test.ts (835ab6eceb54) | Static only; runtime/typecheck not verified |
| BT3-017 | dac8e0780dd3 | none | IR full/no-residual (825cd9eb811f) | BT3-017.test.ts (5cc4f7be7a10) | Static only; runtime/typecheck not verified |
| BT3-018 | dac8e0780dd3 | none | IR full/no-residual (8d8162a34825) | BT3-018.test.ts (68e738ddaa7d) | Static only; runtime/typecheck not verified |
| BT3-019 | dac8e0780dd3 | entry | IR full/no-residual (1ca020de0713) | BT3-019.test.ts (22e8ec190b8d) | Static only; runtime/typecheck not verified |
| BT3-020 | dac8e0780dd3 | none | vanilla/no module | BT3-020.test.ts (7cea32c1102d) | Static only; runtime/typecheck not verified |
| BT3-021 | dac8e0780dd3 | none | IR full/no-residual (76b449a18f6f) | BT3-021.test.ts (3667e89099a9) | Static only; runtime/typecheck not verified |
| BT3-022 | dac8e0780dd3 | none | vanilla/no module | BT3-022.test.ts (e0c5ff64fba3) | Static only; runtime/typecheck not verified |
| BT3-023 | dac8e0780dd3 | none | IR full/no-residual (c1da23b36eda) | BT3-023.test.ts (c15761e2ec16) | Static only; runtime/typecheck not verified |
| BT3-024 | dac8e0780dd3 | entry | IR full/no-residual (b23da807e8b0) | BT3-024.test.ts (0e905876981d) | Static only; runtime/typecheck not verified |
| BT3-025 | dac8e0780dd3 | none | IR full/no-residual (ebb66fdbb8d6) | BT3-025.test.ts (075165d604ba) | Static only; runtime/typecheck not verified |
| BT3-026 | dac8e0780dd3 | none | IR full/no-residual (eacfe730f15c) | BT3-026.test.ts (d0c28b57b2a3) | Static only; runtime/typecheck not verified |
| BT3-027 | dac8e0780dd3 | none | IR full/no-residual (804cdfa86a6f) | BT3-027.test.ts (fb8f4d7c19e8) | Static only; runtime/typecheck not verified |
| BT3-028 | dac8e0780dd3 | none | vanilla/no module | BT3-028.test.ts (e587a9267f0b) | Static only; runtime/typecheck not verified |
| BT3-029 | dac8e0780dd3 | none | IR full/no-residual (f9774bfd29c1) | BT3-029.test.ts (ff690505eaf8) | Static only; runtime/typecheck not verified |
| BT3-030 | dac8e0780dd3 | entry | IR full/no-residual (6104cb095862) | BT3-030.test.ts (6d7e2e25deb5) | Static only; runtime/typecheck not verified |
| BT3-031 | dac8e0780dd3 | entry | IR full/no-residual (1b10d441f98f) | BT3-031.test.ts (04023a11d26a) | Static only; runtime/typecheck not verified |
| BT3-032 | dac8e0780dd3 | none | vanilla/no module | BT3-032.test.ts (cbaa61e3a975) | Static only; runtime/typecheck not verified |
| BT3-033 | dac8e0780dd3 | none | IR full/no-residual (6ba59fb881a5) | BT3-033.test.ts (7e937b4b7a7b) | Static only; runtime/typecheck not verified |
| BT3-034 | dac8e0780dd3 | entry | IR full/no-residual (e93d74a799a0) | BT3-034.test.ts (2f6a4ae4e480) | Static only; runtime/typecheck not verified |
| BT3-035 | dac8e0780dd3 | none | IR full/no-residual (b02d29816263) | BT3-035.test.ts (414bfdae28c4) | Static only; runtime/typecheck not verified |
| BT3-036 | dac8e0780dd3 | entry | IR full/no-residual (acec15090a7b) | BT3-036.test.ts (26c186b3620e) | Static only; runtime/typecheck not verified |
| BT3-037 | dac8e0780dd3 | none | vanilla/no module | BT3-037.test.ts (a0bc05a3258a) | Static only; runtime/typecheck not verified |
| BT3-038 | dac8e0780dd3 | none | vanilla/no module | BT3-038.test.ts (0557f4377342) | Static only; runtime/typecheck not verified |
| BT3-039 | dac8e0780dd3 | none | IR full/no-residual (77412d1bec8a) | BT3-039.test.ts (8e96946ad41b) | Static only; runtime/typecheck not verified |
| BT3-040 | dac8e0780dd3 | entry | handwritten (f4ae15e6faa5) | BT3-040.test.ts (52764606bb24) | Static only; runtime/typecheck not verified |
| BT3-041 | dac8e0780dd3 | entry | IR full/no-residual (b511d0433304) | BT3-041.test.ts (1e226d2a3134) | Static only; runtime/typecheck not verified |
| BT3-042 | dac8e0780dd3 | entry | IR full/no-residual (b912340561a0) | BT3-042.test.ts (51e5358574f0) | Static only; runtime/typecheck not verified |
| BT3-043 | dac8e0780dd3 | none | IR full/no-residual (cf5b197e165e) | BT3-043.test.ts (c2347528978a) | Static only; runtime/typecheck not verified |
| BT3-044 | dac8e0780dd3 | none | vanilla/no module | BT3-044.test.ts (364243b61206) | Static only; runtime/typecheck not verified |
| BT3-045 | dac8e0780dd3 | none | vanilla/no module | BT3-045.test.ts (856201b829ff) | Static only; runtime/typecheck not verified |
| BT3-046 | dac8e0780dd3 | entry | IR full/no-residual (34519e223c68) | BT3-046.test.ts (9a45f719330a) | Static only; runtime/typecheck not verified |
| BT3-047 | dac8e0780dd3 | none | IR full/no-residual (d2472c8576a9) | BT3-047.test.ts (1f93b1f694f0) | Static only; runtime/typecheck not verified |
| BT3-048 | dac8e0780dd3 | none | IR full/no-residual (263e33d6ba39) | BT3-048.test.ts (3d7b3f2402a7) | Static only; runtime/typecheck not verified |
| BT3-049 | dac8e0780dd3 | entry | IR full/no-residual (d30c8679aee7) | BT3-049.test.ts (e7c05a42b9b9) | Static only; runtime/typecheck not verified |
| BT3-050 | dac8e0780dd3 | none | IR full/no-residual (387f9f2b02fa) | BT3-050.test.ts (2a584e2c0db0) | Static only; runtime/typecheck not verified |
| BT3-051 | dac8e0780dd3 | entry | IR full/no-residual (8c4ae8c9454a) | BT3-051.test.ts (2a7cab0722a9) | Static only; runtime/typecheck not verified |
| BT3-052 | dac8e0780dd3 | none | IR full/no-residual (619b227cad91) | BT3-052.test.ts (7e5e001e56ab) | Static only; runtime/typecheck not verified |
| BT3-053 | dac8e0780dd3 | none | vanilla/no module | BT3-053.test.ts (6bf4c7190480) | Static only; runtime/typecheck not verified |
| BT3-054 | dac8e0780dd3 | entry | IR full/no-residual (91b0d21b0ae1) | BT3-054.test.ts (bca865a760d8) | Static only; runtime/typecheck not verified |
| BT3-055 | dac8e0780dd3 | none | IR full/no-residual (c388aaae078f) | BT3-055.test.ts (6709770248ba) | Static only; runtime/typecheck not verified |
| BT3-056 | dac8e0780dd3 | entry | IR full/no-residual (e75088b84405) | BT3-056.test.ts (11d77adc3499) | Static only; runtime/typecheck not verified |
| BT3-057 | dac8e0780dd3 | entry | IR full/no-residual (bd19dc35c872) | BT3-057.test.ts (f9ed6fb6503c) | Static only; runtime/typecheck not verified |
| BT3-058 | dac8e0780dd3 | none | IR full/no-residual (8fad5209143f) | BT3-058.test.ts (6f9726592419) | Static only; runtime/typecheck not verified |
| BT3-059 | dac8e0780dd3 | none | vanilla/no module | BT3-059.test.ts (62d8fdeb8714) | Static only; runtime/typecheck not verified |
| BT3-060 | dac8e0780dd3 | none | vanilla/no module | BT3-060.test.ts (ff9e576f9fc4) | Static only; runtime/typecheck not verified |
| BT3-061 | dac8e0780dd3 | entry | IR full/no-residual (fb8b45f5561b) | BT3-061.test.ts (641b098a771b) | Static only; runtime/typecheck not verified |
| BT3-062 | dac8e0780dd3 | entry | IR full/no-residual (16cf8d75c2fa) | BT3-062.test.ts (16a8fa781b0c) | Static only; runtime/typecheck not verified |
| BT3-063 | dac8e0780dd3 | none | IR full/no-residual (3fe08a60fa6a) | BT3-063.test.ts (d6eca0171d14) | Static only; runtime/typecheck not verified |
| BT3-064 | dac8e0780dd3 | none | IR full/no-residual (99a48297113d) | BT3-064.test.ts (ff6bb81aaaa5) | Static only; runtime/typecheck not verified |
| BT3-065 | dac8e0780dd3 | entry | IR full/no-residual (c9132cf4c1a9) | BT3-065.test.ts (22665740a99c) | Static only; runtime/typecheck not verified |
| BT3-066 | dac8e0780dd3 | none | IR full/no-residual (d5e4295a0bb4) | BT3-066.test.ts (837eacbe30b0) | Static only; runtime/typecheck not verified |
| BT3-067 | dac8e0780dd3 | none | vanilla/no module | BT3-067.test.ts (e4712acbb7d4) | Static only; runtime/typecheck not verified |
| BT3-068 | dac8e0780dd3 | none | IR full/no-residual (0c38dd9d63dd) | BT3-068.test.ts (e343dbc1c584) | Static only; runtime/typecheck not verified |
| BT3-069 | dac8e0780dd3 | none | IR full/no-residual (2165df864b93) | BT3-069.test.ts (fdf7d4068112) | Static only; runtime/typecheck not verified |
| BT3-070 | dac8e0780dd3 | none | IR full/no-residual (c6c89b7840cd) | BT3-070.test.ts (6833b82d9acf) | Static only; runtime/typecheck not verified |
| BT3-071 | dac8e0780dd3 | none | IR full/no-residual (dc9c72c15a85) | BT3-071.test.ts (322417dcc294) | Static only; runtime/typecheck not verified |
| BT3-072 | dac8e0780dd3 | none | IR full/no-residual (d4d9f71020ee) | BT3-072.test.ts (9d110bb4005e) | Static only; runtime/typecheck not verified |
| BT3-073 | dac8e0780dd3 | entry | IR full/no-residual (d52db3b1f7c8) | BT3-073.test.ts (875cf0787bfa) | Static only; runtime/typecheck not verified |
| BT3-074 | dac8e0780dd3 | none | IR full/no-residual (1da5d0615809) | BT3-074.test.ts (ca4844d608ac) | Static only; runtime/typecheck not verified |
| BT3-075 | dac8e0780dd3 | entry | IR full/no-residual (0a710e41b5c0) | BT3-075.test.ts (955adeb04175) | Static only; runtime/typecheck not verified |
| BT3-076 | dac8e0780dd3 | none | vanilla/no module | BT3-076.test.ts (545529a1e538) | Static only; runtime/typecheck not verified |
| BT3-077 | dac8e0780dd3 | entry | IR full/no-residual (192864b1b229) | BT3-077.test.ts (252ec8156f2d) | Static only; runtime/typecheck not verified |
| BT3-078 | dac8e0780dd3 | none | vanilla/no module | BT3-078.test.ts (b86ef4ad5604) | Static only; runtime/typecheck not verified |
| BT3-079 | dac8e0780dd3 | none | IR full/no-residual (404e281806c5) | BT3-079.test.ts (271ebd4d1d3c) | Static only; runtime/typecheck not verified |
| BT3-080 | dac8e0780dd3 | none | IR full/no-residual (6a17d15eeb7b) | BT3-080.test.ts (f6b56cc74a2d) | Static only; runtime/typecheck not verified |
| BT3-081 | dac8e0780dd3 | none | IR full/no-residual (115f44b8c41e) | BT3-081.test.ts (7c0a6a4a19a7) | Static only; runtime/typecheck not verified |
| BT3-082 | dac8e0780dd3 | entry | IR full/no-residual (2763838fd5fc) | BT3-082.test.ts (71f1fcee7082) | Static only; runtime/typecheck not verified |
| BT3-083 | dac8e0780dd3 | none | vanilla/no module | BT3-083.test.ts (9c729fe3f470) | Static only; runtime/typecheck not verified |
| BT3-084 | dac8e0780dd3 | none | IR full/no-residual (8003a10c9c71) | BT3-084.test.ts (fdc37c44a483) | Static only; runtime/typecheck not verified |
| BT3-085 | dac8e0780dd3 | none | vanilla/no module | BT3-085.test.ts (1bd1314f4565) | Static only; runtime/typecheck not verified |
| BT3-086 | dac8e0780dd3 | entry | IR full/no-residual (3b52884d60f2) | BT3-086.test.ts (63f7bf755d1a) | Static only; runtime/typecheck not verified |
| BT3-087 | dac8e0780dd3 | entry | IR full/no-residual (ebdabfa44072) | BT3-087.test.ts (6845d13fd8da) | Static only; runtime/typecheck not verified |
| BT3-088 | dac8e0780dd3 | entry | IR full/no-residual (9f0588089ccb) | BT3-088.test.ts (ee2d593ce994) | Static only; runtime/typecheck not verified |
| BT3-089 | dac8e0780dd3 | none | vanilla/no module | BT3-089.test.ts (d77038dfd476) | Static only; runtime/typecheck not verified |
| BT3-090 | dac8e0780dd3 | entry | IR full/no-residual (f42f3a4e5aa2) | BT3-090.test.ts (bb59108c7418) | Static only; runtime/typecheck not verified |
| BT3-091 | dac8e0780dd3 | entry | IR full/no-residual (db718947ad8d) | BT3-091.test.ts (f510607f8814) | Static only; runtime/typecheck not verified |
| BT3-092 | dac8e0780dd3 | entry | handwritten (2cf15d2d6223) | BT3-092.test.ts (b67c1a41b301) | Static only; runtime/typecheck not verified |
| BT3-093 | dac8e0780dd3 | entry | handwritten (854e9a652c31) | BT3-093.test.ts (6fbbdf872212) | Static only; runtime/typecheck not verified |
| BT3-094 | dac8e0780dd3 | entry | IR full/no-residual (537c48e7f522) | BT3-094.test.ts (79f38c3bfc78) | Static only; runtime/typecheck not verified |
| BT3-095 | dac8e0780dd3 | entry | IR full/no-residual (28fa927caf25) | BT3-095.test.ts (e007a2eabe2f) | Static only; runtime/typecheck not verified |
| BT3-096 | dac8e0780dd3 | entry | IR full/no-residual (dce35538a136) | BT3-096.test.ts (bc35afebc039) | Static only; runtime/typecheck not verified |
| BT3-097 | dac8e0780dd3 | entry | IR full/no-residual (244c56739bee) | BT3-097.test.ts (09ed612dd232) | Static only; runtime/typecheck not verified |
| BT3-098 | dac8e0780dd3 | none | IR full/no-residual (b63553cc9a86) | BT3-098.test.ts (3657ebe31c7b) | Static only; runtime/typecheck not verified |
| BT3-099 | dac8e0780dd3 | entry | handwritten (4cefafe23b59) | BT3-099.test.ts (0e4abe5b898d) | Static only; runtime/typecheck not verified |
| BT3-100 | dac8e0780dd3 | entry | IR full/no-residual (3e6f9c82bbed) | BT3-100.test.ts (4d5bf6fedfc0) | Static only; runtime/typecheck not verified |
| BT3-101 | dac8e0780dd3 | none | IR full/no-residual (8f2c9fe261ab) | BT3-101.test.ts (31dc5adaff10) | Static only; runtime/typecheck not verified |
| BT3-102 | dac8e0780dd3 | entry | handwritten (8e985f1dbd87) | BT3-102.test.ts (fdc7c8187c1d) | Static only; runtime/typecheck not verified |
| BT3-103 | dac8e0780dd3 | entry | IR full/no-residual (2e9f904792eb) | BT3-103.test.ts (8865d7233815) | Static only; runtime/typecheck not verified |
| BT3-104 | dac8e0780dd3 | entry | IR full/no-residual (3772b8847d1f) | BT3-104.test.ts (43ab2c10c07e) | Static only; runtime/typecheck not verified |
| BT3-105 | dac8e0780dd3 | entry | IR full/no-residual (328741acaf16) | BT3-105.test.ts (872f1250be8c) | Static only; runtime/typecheck not verified |
| BT3-106 | dac8e0780dd3 | entry | IR full/no-residual (a4234ffb72cc) | BT3-106.test.ts (69c67e23a45b) | Static only; runtime/typecheck not verified |
| BT3-107 | dac8e0780dd3 | entry | IR full/no-residual (4dc4b70a8677) | BT3-107.test.ts (0fffdca1925e) | Static only; runtime/typecheck not verified |
| BT3-108 | dac8e0780dd3 | none | IR full/no-residual (7b93e30ce5fd) | BT3-108.test.ts (2aa9ccaeb793) | Static only; runtime/typecheck not verified |
| BT3-109 | dac8e0780dd3 | entry | IR full/no-residual (400bad2e470c) | BT3-109.test.ts (d721c33c2dbd) | Static only; runtime/typecheck not verified |
| BT3-110 | dac8e0780dd3 | none | IR full/no-residual (d44dd247a6a7) | BT3-110.test.ts (ceb0db9ab726) | Static only; runtime/typecheck not verified |
| BT3-111 | dac8e0780dd3 | entry | handwritten (ae7214f32a3c) | BT3-111.test.ts (f6c6d9683039) | Static only; runtime/typecheck not verified |
| BT3-112 | dac8e0780dd3 | none | handwritten (a9d599c889f0) | BT3-112.test.ts (f6f7fc4fe998) | Static only; runtime/typecheck not verified |
