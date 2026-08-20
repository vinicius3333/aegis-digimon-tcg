# EX5 card-by-card audit

Audit order: EX5-074 down to EX5-001. NR means no numeric score: Vitest and typecheck were unavailable, so runtime behavior is not verified and no card is claimed as 10/10.

Evidence paths:

Catalog: packages/shared/src/cards/data/cards.json (committed catalog SHA-256 prefix: dac8e0780dd3).
KB: node tools/kb/query.mjs card <CARD-ID>; the KB column is the SHA-256 prefix of that exact local command output.
Direct module: apps/api/src/cards/EX5/<CARD-ID>.ts; test: apps/api/src/cards/EX5/<CARD-ID>.test.ts. Module/test columns are SHA-256 prefixes.
IR mode is static: IR-full means compiled/registerIrCard/coverage full/residual empty; hand-authored means registerCard (or an explicit runtime override) and is not presented as declarative IR proof.
Clause count covers populated catalog fields among main, inherited, security, evolution requirements, and evolution costs. Exact text remains in the committed catalog.

| Card | Name | Clauses | KB | Module | Test | Tests | IR mode | Score |
|---|---|---:|---|---|---|---:|---|---:|
| EX5-074 | Fanglongmon | 1 | 95840497753e | 08f86a25ae36 | a080b0b3411c | 2 | hand-authored | NR |
| EX5-073 | GraceNovamon | 1 | 9e5f6b110563 | ee83d7d42b46 | 31d40351e7ef | 2 | IR-full | NR |
| EX5-072 | Holy Beasts Great Cardinal Positions | 1 | 8b2c81543eea | 64bb5b9eaafd | c5cba676520b | 2 | IR-full | NR |
| EX5-071 | Loyalty Deeper than the Sea | 1 | af3c924c8821 | 3c6827e826ab | 54beef1fab26 | 2 | IR-full | NR |
| EX5-070 | X Antibody Proto Form | 1 | 48b85f580a55 | 7e21cb8db61b | da7c060b324f | 2 | hand-authored | NR |
| EX5-069 | Biting Crush | 1 | d6e168ed4abf | f88b0044e6ae | 3fb5c8a2acda | 2 | IR-full | NR |
| EX5-068 | Flashy Boss Punch | 1 | 5705376b7bb7 | 732a6863a1f3 | 8508119c9cf7 | 2 | IR-full | NR |
| EX5-067 | Good Night Moon | 1 | c402ebe68533 | dee52b1e3717 | 201940edae83 | 2 | IR-full | NR |
| EX5-066 | Phoebus Blow | 1 | d67dcf34633b | 8d723f168bd7 | 2972f36d0a00 | 2 | IR-full | NR |
| EX5-065 | Sayo & Koh | 1 | 28200ef2dd66 | 8e313609732f | b9c4773cd7c9 | 2 | hand-authored | NR |
| EX5-064 | Koh &amp; Sayo | 1 | 65e9185945b1 | 22492bdcae66 | fff827fe01f6 | 2 | IR-full | NR |
| EX5-063 | Leviamon | 1 | a9e66e43e834 | 8f65739666eb | a24a58779e10 | 3 | hand-authored | NR |
| EX5-062 | Anubismon | 1 | 7de3b68c152e | 58eec1d9ddfb | 08994d6ca818 | 2 | hand-authored | NR |
| EX5-061 | Cerberusmon (X Antibody) | 2 | d5474ddf3fb3 | 3452845680d4 | f9ddcf59fc83 | 2 | IR-full | NR |
| EX5-060 | Dragomon | 2 | f9e142176bbf | 8a259ab8b2ba | 2545f662ac66 | 2 | IR-full | NR |
| EX5-059 | Dobermon (X Antibody) | 2 | 1ccff8b35c9c | 36688f1ecb9d | 8690297e8775 | 2 | IR-full | NR |
| EX5-058 | Octomon | 2 | efe43478df43 | d90b1bb4adab | 723030f387b6 | 2 | IR-full | NR |
| EX5-057 | Labramon | 2 | 081f1eb03878 | f174bf53f9e3 | 4b65f7a44cb8 | 2 | IR-full | NR |
| EX5-056 | Syakomon | 2 | f0a037ed85f0 | 2e25fa958d20 | 8aa8efe34ff1 | 2 | IR-full | NR |
| EX5-055 | HeavyLeomon | 1 | 1850dbfe9cbb | 6c8bd9192365 | 7bb0a10ae332 | 2 | IR-full | NR |
| EX5-054 | MetalEtemon | 1 | de49beeae7ce | 6d7fc880ec88 | bcba72a4343b | 2 | IR-full | NR |
| EX5-053 | Baihumon | 1 | ccead36d65ee | b9cb10125a36 | fa4f2eadbb5d | 1 | hand-authored | NR |
| EX5-052 | Makuramon | 1 | 62fc2ce6ee28 | 56618745f956 | e50f725e738b | 2 | IR-full | NR |
| EX5-051 | Caturamon | 1 | 725d0513c1ab | 91d268f80e11 | 07f8b8e0028f | 2 | IR-full | NR |
| EX5-050 | Sinduramon | 1 | 10ed08f2cb91 | dfe71d8d6784 | 7c6180e62e57 | 2 | IR-full | NR |
| EX5-049 | GrapLeomon | 2 | 6bcdb656d0fe | d818e04df188 | 99677052f6be | 2 | IR-full | NR |
| EX5-048 | Etemon | 2 | b69defbe095a | 13f8b996f017 | fbd5f546d9b6 | 2 | IR-full | NR |
| EX5-047 | Leomon | 2 | b8c093845241 | 4910be41afb5 | f4425d94dc81 | 2 | IR-full | NR |
| EX5-046 | Targetmon | 2 | 316f155c9ddd | e74480278241 | bf458c3ff5f6 | 2 | IR-full | NR |
| EX5-045 | Chuumon | 2 | ac4e191a59ca | 3ce9bc1a86a5 | aca79249d6d0 | 2 | IR-full | NR |
| EX5-044 | Elecmon | 2 | c8e27d3cd50c | 89d1bc3d94a9 | 979fb9fade99 | 2 | IR-full | NR |
| EX5-043 | Leopardmon (X Antibody) | 1 | b6c7134097f2 | 5d6ef8a712c4 | 6314b7729630 | 1 | hand-authored | NR |
| EX5-042 | Merukimon | 1 | c375073e4542 | 10532f84068d | 31ecea709958 | 2 | IR-full | NR |
| EX5-041 | Ebonwumon | 1 | e8cbdb25d1fc | ff08e80f72c5 | 55886d8262d5 | 2 | IR-full | NR |
| EX5-040 | Kumbhiramon | 1 | 59bafe9d7b48 | 358c880181ad | 854f1923e4b3 | 1 | IR-full | NR |
| EX5-039 | Garudamon | 2 | d14e9e06c09d | 6f5a947622d2 | a79d4f51d3c3 | 2 | IR-full | NR |
| EX5-038 | Vikaralamon | 1 | 427c7a877636 | 01f975f52b16 | eebed76f0fd3 | 2 | IR-full | NR |
| EX5-037 | Vajramon | 1 | d65c992ac9ec | 64bab6837e2a | a81f71257660 | 2 | hand-authored | NR |
| EX5-036 | Aquilamon | 2 | 8a01b1ca1087 | aed673682a48 | 38713c7974b4 | 1 | IR-full | NR |
| EX5-035 | Hawkmon | 2 | 39b27d83b919 | 76439ed3e8bf | e4d14aa45fdd | 2 | IR-full | NR |
| EX5-034 | BanchoLeomon | 1 | b7b45395cfe0 | e2f43ad85a25 | 1545fde32077 | 2 | IR-full | NR |
| EX5-033 | Mitamamon | 1 | 717f07466660 | b0b4b50247c2 | 5ba1558f6e27 | 2 | IR-full | NR |
| EX5-032 | LoaderLeomon | 2 | 0cb6d15cd74e | 5761f7898390 | 328f88758f7d | 2 | IR-full | NR |
| EX5-031 | Chirinmon | 2 | 0246e1db4bd4 | ddd3174e825f | 8cf836dbd381 | 2 | IR-full | NR |
| EX5-030 | Liamon | 2 | 8716b4c04edd | 4c81db68beac | 8fc29488f869 | 2 | IR-full | NR |
| EX5-029 | Reppamon | 2 | 9c28eed93551 | 3ad82d59387c | e21f69650c1d | 2 | IR-full | NR |
| EX5-028 | Kudamon | 2 | afcedaa6031a | 602173d71af3 | 6f3b3021d526 | 2 | IR-full | NR |
| EX5-027 | Liollmon | 2 | 70deeb4c0905 | a40d5f3bc9e7 | aa3010002edf | 1 | hand-authored | NR |
| EX5-026 | MetalGarurumon (X Antibody) | 1 | 6eef43ab5dd8 | 821a7756da92 | 71fb056f98e4 | 2 | IR-full | NR |
| EX5-025 | Dianamon | 1 | 9cb155dafe5a | 4d2cb0ca718c | dd3e9bed4d9e | 1 | IR-full | NR |
| EX5-024 | Azulongmon | 1 | 5bc223334e3a | c13848caf0dd | 373e1169f4c2 | 2 | IR-full | NR |
| EX5-023 | WereGarurumon (X Antibody) | 2 | a6915d6336ec | 7b1a2c0ff5cf | b8f051cac73e | 2 | IR-full | NR |
| EX5-022 | Mihiramon | 1 | eaf4814e931b | d4f3601429a7 | c6eb6d9369b9 | 2 | IR-full | NR |
| EX5-021 | Majiramon | 1 | 65b90ab062d6 | d76fe7e71eae | 99d6d17ded1c | 2 | IR-full | NR |
| EX5-020 | Crescemon | 2 | 7041710fd21f | 728e64ea3041 | 3eaf432db118 | 2 | IR-full | NR |
| EX5-019 | Antylamon | 1 | 5a67dde0d7f5 | 863885dfb034 | f66284a3f383 | 2 | IR-full | NR |
| EX5-018 | Garurumon (X Antibody) | 2 | 8c40f7465cd7 | c06bf3cd18a9 | 8ab587b5dcfc | 2 | IR-full | NR |
| EX5-017 | Lekismon | 2 | 3dbd95869d3a | 4d527ad53aab | fd178dcf3738 | 1 | IR-full | NR |
| EX5-016 | Lunamon | 2 | 6c67066b848d | 0b7cbab82574 | 04fff35a9c9d | 2 | IR-full | NR |
| EX5-015 | Gabumon (X Antibody) | 2 | 6175bc2a2953 | 4d2897ae2e66 | f85563d4f079 | 2 | IR-full | NR |
| EX5-014 | Apollomon | 1 | ed63f5e01c8f | ee38e01b67ba | 61a54869b704 | 2 | IR-full | NR |
| EX5-013 | Zhuqiaomon | 1 | 18ec9ecb503c | aeab4cd0724a | d714741e4b2f | 2 | IR-full | NR |
| EX5-012 | Flaremon | 2 | 9173213422ea | b33e9ef26546 | a12f14031722 | 2 | IR-full | NR |
| EX5-011 | Pajiramon | 1 | 0284f8efbe6f | 6b6557508f11 | 370707292f02 | 2 | IR-full | NR |
| EX5-010 | Sandiramon | 1 | c7318be572e7 | a1ac2235686a | 33cc7e7a7bdc | 2 | IR-full | NR |
| EX5-009 | Indramon | 1 | ad0390023e84 | cd31453851da | 8439ac39b1ea | 2 | IR-full | NR |
| EX5-008 | Firamon | 2 | 599534f7d4a6 | 4c3795aa7fca | bf1d7592d0cf | 1 | IR-full | NR |
| EX5-007 | Coronamon | 2 | e662cb1a70ea | d9ee9388c951 | 468798e93fb4 | 2 | IR-full | NR |
| EX5-006 | Xiaomon | 1 | 978f160d30c8 | bd35914b4936 | 4a3be126519c | 1 | IR-full | NR |
| EX5-005 | Tokomon | 1 | a0dc756444f1 | 43bb6c284425 | e54291133dc4 | 1 | IR-full | NR |
| EX5-004 | Frimon | 1 | 737c921274a0 | cd84366357a2 | c4b6161797b9 | 1 | IR-full | NR |
| EX5-003 | Nyaromon | 1 | 6c9335496495 | 891e9c414cee | fa168b9a1312 | 1 | IR-full | NR |
| EX5-002 | Moonmon | 1 | 2fb50001cdb7 | 5645a6f1e9e9 | 100c6519df46 | 1 | IR-full | NR |
| EX5-001 | Sunmon | 1 | abc63204db60 | 6258321bc182 | 7476d0ed4a8a | 1 | IR-full | NR |

## Execution and blockers

Attempted serial low-memory Vitest with one fork and no file parallelism; blocked because vitest is absent from local dependencies (ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL).
pnpm is not installed as a shell command; Corepack resolves pnpm 10.30.1 but does not provide the missing dependency.
Typecheck was not run for the same dependency/runtime blocker.
No implementation or test corrections were made: without executable runtime proof, changing behavior would violate the evidence-only requirement.
No linked metadata was edited; no temporary GIT_INDEX_FILE write-tree/commit-tree/update-ref flow was needed.

## Per-card conclusion

All 74 cards have committed catalog entries, local KB query output, direct modules, and colocated tests. Static evidence is recorded per card above. Behavioral clauses, timing, cost, target, zone, face, order, OPT, evolution-stack behavior, and regression status remain uncertified because runtime and typecheck were unavailable; none receives 10/10.
