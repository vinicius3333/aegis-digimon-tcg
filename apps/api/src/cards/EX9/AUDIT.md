# EX9 Card Audit Ledger

Static audit completion: **74/74 cards reviewed**.

This ledger records the sequential card-by-card review performed on branch
`audit-ex9` with three Luna subagents. Every card was reconciled against the committed
catalog, local knowledge base, direct TypeScript IR module, relevant engine primitives,
peer implementations, and existing colocated tests.

The user explicitly waived further test, typecheck, lint, and diff-check execution after
the audit was already underway. Tests added or strengthened after that instruction are
specifications only and were not executed. Consequently, this ledger records static
fidelity rather than claiming a fresh green collection gate.

All executable card modules continue to register exclusively through `registerIrCard`.

## Corrected cards

Corrections were committed for EX9-001–006, EX9-012–014, EX9-018, EX9-026–027,
EX9-030–031, EX9-033, EX9-038–041, EX9-043, EX9-050, EX9-054–057, EX9-063–064,
EX9-067, EX9-069–070, EX9-073, and EX9-074. Cards not listed here were found faithful
and were intentionally left unchanged.

## Card-by-card evidence

| Card | Name | Result | Evidence |
| --- | --- | --- | --- |
| EX9-001 | Koromon | Corrected | [`EX9-001.ts`](./EX9-001.ts) · [`EX9-001.test.ts`](./EX9-001.test.ts) |
| EX9-002 | Tsunomon | Corrected | [`EX9-002.ts`](./EX9-002.ts) · [`EX9-002.test.ts`](./EX9-002.test.ts) |
| EX9-003 | Tokomon | Corrected | [`EX9-003.ts`](./EX9-003.ts) · [`EX9-003.test.ts`](./EX9-003.test.ts) |
| EX9-004 | Tanemon | Corrected | [`EX9-004.ts`](./EX9-004.ts) · [`EX9-004.test.ts`](./EX9-004.test.ts) |
| EX9-005 | Negamon | Corrected | [`EX9-005.ts`](./EX9-005.ts) · [`EX9-005.test.ts`](./EX9-005.test.ts) |
| EX9-006 | Pagumon | Corrected | [`EX9-006.ts`](./EX9-006.ts) · [`EX9-006.test.ts`](./EX9-006.test.ts) |
| EX9-007 | Agumon | Faithful | [`EX9-007.ts`](./EX9-007.ts) · [`EX9-007.test.ts`](./EX9-007.test.ts) |
| EX9-008 | Biyomon | Faithful | [`EX9-008.ts`](./EX9-008.ts) · [`EX9-008.test.ts`](./EX9-008.test.ts) |
| EX9-009 | Greymon | Faithful | [`EX9-009.ts`](./EX9-009.ts) · [`EX9-009.test.ts`](./EX9-009.test.ts) |
| EX9-010 | Tuskmon | Faithful | [`EX9-010.ts`](./EX9-010.ts) · [`EX9-010.test.ts`](./EX9-010.test.ts) |
| EX9-011 | MetalGreymon | Faithful | [`EX9-011.ts`](./EX9-011.ts) · [`EX9-011.test.ts`](./EX9-011.test.ts) |
| EX9-012 | MetalGreymon: Alterous Mode | Corrected | [`EX9-012.ts`](./EX9-012.ts) · [`EX9-012.test.ts`](./EX9-012.test.ts) |
| EX9-013 | BlitzGreymon | Corrected | [`EX9-013.ts`](./EX9-013.ts) · [`EX9-013.test.ts`](./EX9-013.test.ts) |
| EX9-014 | Gabumon | Corrected | [`EX9-014.ts`](./EX9-014.ts) · [`EX9-014.test.ts`](./EX9-014.test.ts) |
| EX9-015 | Gizamon | Faithful | [`EX9-015.ts`](./EX9-015.ts) · [`EX9-015.test.ts`](./EX9-015.test.ts) |
| EX9-016 | Betamon | Faithful | [`EX9-016.ts`](./EX9-016.ts) · [`EX9-016.test.ts`](./EX9-016.test.ts) |
| EX9-017 | Garurumon | Faithful | [`EX9-017.ts`](./EX9-017.ts) · [`EX9-017.test.ts`](./EX9-017.test.ts) |
| EX9-018 | MetalMamemon | Corrected | [`EX9-018.ts`](./EX9-018.ts) · [`EX9-018.test.ts`](./EX9-018.test.ts) |
| EX9-019 | WereGarurumon: Sagittarius Mode | Faithful | [`EX9-019.ts`](./EX9-019.ts) · [`EX9-019.test.ts`](./EX9-019.test.ts) |
| EX9-020 | CresGarurumon | Faithful | [`EX9-020.ts`](./EX9-020.ts) · [`EX9-020.test.ts`](./EX9-020.test.ts) |
| EX9-021 | Omnimon Alter-S | Faithful | [`EX9-021.ts`](./EX9-021.ts) · [`EX9-021.test.ts`](./EX9-021.test.ts) |
| EX9-022 | Elecmon | Faithful | [`EX9-022.ts`](./EX9-022.ts) · [`EX9-022.test.ts`](./EX9-022.test.ts) |
| EX9-023 | Patamon | Faithful | [`EX9-023.ts`](./EX9-023.ts) · [`EX9-023.test.ts`](./EX9-023.test.ts) |
| EX9-024 | Hanimon | Faithful | [`EX9-024.ts`](./EX9-024.ts) · [`EX9-024.test.ts`](./EX9-024.test.ts) |
| EX9-025 | Airdramon | Faithful | [`EX9-025.ts`](./EX9-025.ts) · [`EX9-025.test.ts`](./EX9-025.test.ts) |
| EX9-026 | Angemon | Corrected | [`EX9-026.ts`](./EX9-026.ts) · [`EX9-026.test.ts`](./EX9-026.test.ts) |
| EX9-027 | Kokeshimon | Corrected | [`EX9-027.ts`](./EX9-027.ts) · [`EX9-027.test.ts`](./EX9-027.test.ts) |
| EX9-028 | Nanimon | Faithful | [`EX9-028.ts`](./EX9-028.ts) · [`EX9-028.test.ts`](./EX9-028.test.ts) |
| EX9-029 | Unimon | Faithful | [`EX9-029.ts`](./EX9-029.ts) · [`EX9-029.test.ts`](./EX9-029.test.ts) |
| EX9-030 | Andromon | Corrected | [`EX9-030.ts`](./EX9-030.ts) · [`EX9-030.test.ts`](./EX9-030.test.ts) |
| EX9-031 | Etemon | Corrected | [`EX9-031.ts`](./EX9-031.ts) · [`EX9-031.test.ts`](./EX9-031.test.ts) |
| EX9-032 | Karakurumon | Faithful | [`EX9-032.ts`](./EX9-032.ts) · [`EX9-032.test.ts`](./EX9-032.test.ts) |
| EX9-033 | Kaguyamon | Corrected | [`EX9-033.ts`](./EX9-033.ts) · [`EX9-033.test.ts`](./EX9-033.test.ts) |
| EX9-034 | Kunemon | Faithful | [`EX9-034.ts`](./EX9-034.ts) · [`EX9-034.test.ts`](./EX9-034.test.ts) |
| EX9-035 | Palmon | Faithful | [`EX9-035.ts`](./EX9-035.ts) · [`EX9-035.test.ts`](./EX9-035.test.ts) |
| EX9-036 | Pomumon | Faithful | [`EX9-036.ts`](./EX9-036.ts) · [`EX9-036.test.ts`](./EX9-036.test.ts) |
| EX9-037 | Kabuterimon | Faithful | [`EX9-037.ts`](./EX9-037.ts) · [`EX9-037.test.ts`](./EX9-037.test.ts) |
| EX9-038 | Kuwagamon | Corrected | [`EX9-038.ts`](./EX9-038.ts) · [`EX9-038.test.ts`](./EX9-038.test.ts) |
| EX9-039 | DarkTyrannomon | Corrected | [`EX9-039.ts`](./EX9-039.ts) · [`EX9-039.test.ts`](./EX9-039.test.ts) |
| EX9-040 | Parasaurmon | Corrected | [`EX9-040.ts`](./EX9-040.ts) · [`EX9-040.test.ts`](./EX9-040.test.ts) |
| EX9-041 | ExTyrannomon | Corrected | [`EX9-041.ts`](./EX9-041.ts) · [`EX9-041.test.ts`](./EX9-041.test.ts) |
| EX9-042 | Toropiamon | Faithful | [`EX9-042.ts`](./EX9-042.ts) · [`EX9-042.test.ts`](./EX9-042.test.ts) |
| EX9-043 | MetalTyrannomon | Corrected | [`EX9-043.ts`](./EX9-043.ts) · [`EX9-043.test.ts`](./EX9-043.test.ts) |
| EX9-044 | Hydramon | Faithful | [`EX9-044.ts`](./EX9-044.ts) · [`EX9-044.test.ts`](./EX9-044.test.ts) |
| EX9-045 | Cernumon | Faithful | [`EX9-045.ts`](./EX9-045.ts) · [`EX9-045.test.ts`](./EX9-045.test.ts) |
| EX9-046 | Soundbirdmon | Faithful | [`EX9-046.ts`](./EX9-046.ts) · [`EX9-046.test.ts`](./EX9-046.test.ts) |
| EX9-047 | Eyesmon | Faithful | [`EX9-047.ts`](./EX9-047.ts) · [`EX9-047.test.ts`](./EX9-047.test.ts) |
| EX9-048 | Eyesmon: Scatter Mode | Faithful | [`EX9-048.ts`](./EX9-048.ts) · [`EX9-048.test.ts`](./EX9-048.test.ts) |
| EX9-049 | Sukamon | Faithful | [`EX9-049.ts`](./EX9-049.ts) · [`EX9-049.test.ts`](./EX9-049.test.ts) |
| EX9-050 | Numemon | Corrected | [`EX9-050.ts`](./EX9-050.ts) · [`EX9-050.test.ts`](./EX9-050.test.ts) |
| EX9-051 | Monochromon | Faithful | [`EX9-051.ts`](./EX9-051.ts) · [`EX9-051.test.ts`](./EX9-051.test.ts) |
| EX9-052 | Raremon | Faithful | [`EX9-052.ts`](./EX9-052.ts) · [`EX9-052.test.ts`](./EX9-052.test.ts) |
| EX9-053 | Mamemon | Faithful | [`EX9-053.ts`](./EX9-053.ts) · [`EX9-053.test.ts`](./EX9-053.test.ts) |
| EX9-054 | RareRaremon | Corrected | [`EX9-054.ts`](./EX9-054.ts) · [`EX9-054.test.ts`](./EX9-054.test.ts) |
| EX9-055 | Abbadomon | Corrected | [`EX9-055.ts`](./EX9-055.ts) · [`EX9-055.test.ts`](./EX9-055.test.ts) |
| EX9-056 | HiAndromon | Corrected | [`EX9-056.ts`](./EX9-056.ts) · [`EX9-056.test.ts`](./EX9-056.test.ts) |
| EX9-057 | Abbadomon Core | Corrected | [`EX9-057.ts`](./EX9-057.ts) · [`EX9-057.test.ts`](./EX9-057.test.ts) |
| EX9-058 | Gazimon | Faithful | [`EX9-058.ts`](./EX9-058.ts) · [`EX9-058.test.ts`](./EX9-058.test.ts) |
| EX9-059 | Ogremon | Faithful | [`EX9-059.ts`](./EX9-059.ts) · [`EX9-059.test.ts`](./EX9-059.test.ts) |
| EX9-060 | Devidramon | Faithful | [`EX9-060.ts`](./EX9-060.ts) · [`EX9-060.test.ts`](./EX9-060.test.ts) |
| EX9-061 | Devimon | Faithful | [`EX9-061.ts`](./EX9-061.ts) · [`EX9-061.test.ts`](./EX9-061.test.ts) |
| EX9-062 | SkullGreymon | Faithful | [`EX9-062.ts`](./EX9-062.ts) · [`EX9-062.test.ts`](./EX9-062.test.ts) |
| EX9-063 | Digitamamon | Corrected | [`EX9-063.ts`](./EX9-063.ts) · [`EX9-063.test.ts`](./EX9-063.test.ts) |
| EX9-064 | Megadramon | Corrected | [`EX9-064.ts`](./EX9-064.ts) · [`EX9-064.test.ts`](./EX9-064.test.ts) |
| EX9-065 | Titamon | Faithful | [`EX9-065.ts`](./EX9-065.ts) · [`EX9-065.test.ts`](./EX9-065.test.ts) |
| EX9-066 | Tai Kamiya & Matt Ishida | Faithful | [`EX9-066.ts`](./EX9-066.ts) · [`EX9-066.test.ts`](./EX9-066.test.ts) |
| EX9-067 | Mirai Kinosaki | Corrected | [`EX9-067.ts`](./EX9-067.ts) · [`EX9-067.test.ts`](./EX9-067.test.ts) |
| EX9-068 | Analogman | Faithful | [`EX9-068.ts`](./EX9-068.ts) · [`EX9-068.test.ts`](./EX9-068.test.ts) |
| EX9-069 | Analog Youth | Corrected | [`EX9-069.ts`](./EX9-069.ts) · [`EX9-069.test.ts`](./EX9-069.test.ts) |
| EX9-070 | Meat | Corrected | [`EX9-070.ts`](./EX9-070.ts) · [`EX9-070.test.ts`](./EX9-070.test.ts) |
| EX9-071 | Protein | Faithful | [`EX9-071.ts`](./EX9-071.ts) · [`EX9-071.test.ts`](./EX9-071.test.ts) |
| EX9-072 | File Island | Faithful | [`EX9-072.ts`](./EX9-072.ts) · [`EX9-072.test.ts`](./EX9-072.test.ts) |
| EX9-073 | Machinedramon | Corrected | [`EX9-073.ts`](./EX9-073.ts) · [`EX9-073.test.ts`](./EX9-073.test.ts) |
| EX9-074 | Kimeramon | Corrected | [`EX9-074.ts`](./EX9-074.ts) · [`EX9-074.test.ts`](./EX9-074.test.ts) |
