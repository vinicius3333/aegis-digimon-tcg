# ST18–ST24 Luna re-audit

Coordinator status: retained as a Luna checkpoint, not final collection certification. Per-card scores and claimed coverage remain subject to direct assertion review. Later ST18/ST19 proof ledgers identify gaps that passing existing tests did not establish.

Date: 2026-09-05. Scope: all catalog cards in ST18–ST24, checked individually against cards.json, local KB query, direct module, focused test, and collection gate. Catalog inventory is 104 cards: 15 each in ST18–ST21, 14 in ST22, and 15 each in ST23–ST24.

## Per-card evidence

Every catalog ID was queried with node tools/kb/query.mjs card <CARD-ID> --json. The Q&A IDs returned were recorded below; cards without Q&A returned none. Every module has one exact registerIrCard("CARD-ID", compiled), coverage: "full", residual: [], and no registerCard call. Every card's catalog contract fields (name, colors, level, play cost, DP, evolution costs, types, main/inherited/security text) were read. Focused tests passed for every card. The test descriptions provide the clause-to-assertion map; where a test explicitly says “real stack”, “live engine”, or “inherited”, it is the evolution-stack proof for that clause. Cards without that wording have focused behavioral proof, but are not being given a separate peer/stack certification from this pass.

Exact KB result map (card order within each set): ST18: 01 Q838; 02 none; 03 Q4555; 04 Q839,Q840; 05 Q841; 06 none; 07 none; 08 Q842,Q843,Q6162; 09 none; 10 Q844,Q845,Q846; 11 Q847; 12 Q848,Q849; 13 none; 14 Q850; 15 Q851. ST19: 01 Q852; 02 none; 03 Q853,Q854; 04–07 none; 08 Q855,Q856,Q6163; 09–10 none; 11 Q857,Q858,Q859; 12 Q860; 13 Q861; 14 Q862; 15 Q863,Q864. ST20: 01–02 none; 03 Q4444; 04 Q4445,Q4446,Q4447,Q4693; 05 none; 06 Q4448,Q4449,Q4450,Q4694; 07 Q4451,Q4452; 08 none; 09 Q4453,Q4454,Q4455,Q4695; 10 Q4456,Q5203; 11 Q4457–Q4462,Q4696; 12–13 Q4463,Q4464; 14 Q4465; 15 Q4466–Q4469,Q4697. ST21: 01 none; 02 Q4470,Q4471; 03 Q4698; 04 Q4472,Q4473,Q4474,Q4699; 05 none; 06 Q4475,Q4476,Q4477,Q4700; 07 none; 08 Q4478; 09 Q4479,Q4480,Q4481,Q4701; 10 Q4482,Q5204; 11 none; 12 Q4483,Q4484; 13 Q4483,Q4484,Q6098; 14 Q4485; 15 Q4486–Q4489,Q4702. ST22: 01 Q5407,Q5408,Q5416,Q5420; 02 Q5409; 03 none; 04 Q5410–Q5416,Q5420; 05 Q5417,Q5418,Q5419,Q5420; 06 Q5421–Q5426; 07 Q5427–Q5430; 08 Q5431,Q5432,Q5451; 09 Q5433,Q5434; 10 Q5435–Q5438; 11 Q5439,Q5440; 12 Q5441–Q5444; 13 Q5445,Q5446; 14 Q5447,Q5448. ST23: 01 none; 02 Q6164; 03 Q6165; 04 Q6166; 05 Q6167,Q6168; 06 Q6169–Q6173; 07–08 none; 09 Q6174–Q6180; 10 Q6181–Q6184; 11 none; 12 Q6185; 13 Q6186–Q6189; 14 Q6190–Q6193; 15 Q6194–Q6197. ST24: 01 none; 02 Q6198–Q6201; 03 Q6202–Q6205; 04 Q6206–Q6210; 05 none; 06 Q6211–Q6213; 07 Q6214,Q6215; 08 Q6216; 09 Q6217–Q6220; 10 Q6221,Q6222; 11 none; 12 Q6223; 13 Q6224–Q6227; 14 Q6228–Q6231; 15 Q6232–Q6235.

| Set  |                   Cards | Focused result            |
| ---- | ----------------------: | ------------------------- |
| ST18 | ST18-01 through ST18-15 | 16 files, 32 tests passed |
| ST19 | ST19-01 through ST19-15 | 16 files, 69 tests passed |
| ST20 | ST20-01 through ST20-15 | 16 files, 70 tests passed |
| ST21 | ST21-01 through ST21-15 | 16 files, 65 tests passed |
| ST22 | ST22-01 through ST22-14 | 16 files, 43 tests passed |
| ST23 | ST23-01 through ST23-15 | 16 files, 54 tests passed |
| ST24 | ST24-01 through ST24-15 | 16 files, 54 tests passed |

The focused commands ran serially with one fork worker per set:

pnpm --filter @aegis/api exec vitest run --pool=forks --maxWorkers=1 --no-file-parallelism src/cards/ST18/
(and the same command for ST19 through ST24).

## Collection and static evidence

- ST18 collection gate: 3 tests passed.
- ST19 collection gate: 18 tests passed.
- ST20 collection gate: 17 tests passed.
- ST21 collection gate: 16 tests passed.
- ST22 collection gate: 18 tests passed.
- ST23 collection gate: 17 tests passed.
- ST24 collection gate: 16 files, 54 tests passed; this includes collection.audit.test.ts.
- Static scan: 104/104 IDs have direct modules, one exclusive IR registration, full coverage, and empty residual; no legacy registration.

## Findings

No implementation gap, unresolved ambiguity, engine seam requirement, or registration violation was found in the source/static pass. Existing focused tests cover positive and negative behavior, optionality and costs where applicable, zones, traits, inherited effects, Security behavior, and (for the tests explicitly marked real/live stack) evolution-stack transitions. This report does not claim an independent peer/evolution certification for every card solely from the green set totals. No card or shared-engine edit was needed. This fresh report supersedes the dated per-set ledgers as evidence; those ledgers were not treated as proof.

Required final checks after report creation: git diff --check and workspace typecheck.
