# English/world booster products

Retrieved live on **2026-11-01** from the [official product catalog](https://world.digimoncard.com/products/), individual product pages and their complete official card-list categories. The newest released English/world booster is [CHIVALROUS XIII (EX13)](https://world.digimoncard.com/products/pack/ex-13/), released 2026-10-02. [TIMELESS BONDS (BT26)](https://world.digimoncard.com/products/pack/ver26/) released 2026-09-04. [IGNITION OF X (BT27)](https://world.digimoncard.com/products/pack/ver27/) releases 2026-12-11 (prerelease 2026-12-04) and is ineligible. Japanese and Asia-English products are not mixed into this catalog. Dates are world-site retail dates; older regional delays are documented in the official pages.

## Product identity and coverage

The shared `packOpening/boosterProducts.ts` manifest owns IDs, names, art, region, dates, official type counts, pool identities and per-product rarities, source fingerprints and catalog/collation versions. Both sealed creation paths and solo opening derive their choices from it. Gameplay makes no network requests for product data. Eligibility checks the retail cutoff, known deckable definitions, valid printings, distinct identities, usable rarity pools and at least 40 available main-card identities. The API additionally requires registered executable modules and complete normalized compiled-effect coverage. This is registry/coverage validation, not a new clause-by-clause rules audit of every card.

All 37 supported products use six twelve-card packs. Products are listed latest first. A published type count can include special treatments of existing identities, so it is not compared blindly with a unique-card-ID count. For example EX13 is 81 published types including four special treatments of its 77 identities; BT26 is 108 including four treatments of 104 identities. The manifests were checked against complete card lists, retaining errata entries and omitting only explicitly separate auxiliary products.

| Product ID   | Retail date | Published types | Eligible identities | Rarity counts                        |
| ------------ | ----------- | --------------: | ------------------: | ------------------------------------ |
| EX13         | 2026-10-02  |              81 |                  77 | U 20, R 18, C 22, UR 3, SR 12, SEC 2 |
| BT26         | 2026-09-04  |             108 |                 104 | C 40, U 26, R 21, SR 12, UR 3, SEC 2 |
| EX12         | 2026-07-03  |              83 |                  77 | U 20, R 18, C 22, SR 12, UR 3, SEC 2 |
| BT25         | 2026-05-22  |             115 |                 110 | C 42, U 28, R 23, SR 12, UR 3, SEC 2 |
| EX11         | 2026-02-13  |              88 |                  82 | C 27, R 21, U 20, SR 12, SEC 2       |
| BT24         | 2026-01-23  |             106 |                 102 | C 40, U 26, R 22, SR 12, SEC 2       |
| BT23         | 2025-10-24  |             107 |                 102 | C 40, R 22, U 26, SR 12, SEC 2       |
| EX10         | 2025-09-19  |              78 |                  74 | C 22, U 20, R 18, SR 12, SEC 2       |
| BT22         | 2025-07-25  |             107 |                 102 | C 40, U 26, R 22, SR 12, SEC 2       |
| EX9          | 2025-06-26  |              79 |                  74 | C 22, U 20, R 18, SR 12, SEC 2       |
| BT21         | 2025-04-25  |             114 |                 110 | SEC 5, R 23, C 41, U 26, SR 15       |
| BT19-20      | 2025-02-28  |             174 |                 164 | SEC 5, C 64, U 39, SR 18, R 38       |
| EX8          | 2025-01-10  |              78 |                  74 | U 20, C 22, R 18, SR 12, SEC 2       |
| BT18-19      | 2024-11-01  |             150 |                 146 | U 40, C 56, R 28, SR 18, SEC 4       |
| EX7          | 2024-09-13  |              78 |                  74 | C 22, U 20, R 18, SR 12, SEC 2       |
| BT17         | 2024-08-09  |             106 |                 102 | U 26, R 22, C 40, SR 12, SEC 2       |
| EX6          | 2024-06-28  |              79 |                  74 | U 20, C 22, R 18, SR 12, SEC 2       |
| BT16         | 2024-05-24  |             106 |                 102 | U 26, C 40, SR 12, R 22, SEC 2       |
| BT15         | 2024-02-16  |             130 |                 126 | SR 20, U 34, C 46, R 23, SEC 3       |
| EX5          | 2024-01-19  |              74 |                  74 | U 20, R 18, C 22, SR 12, SEC 2       |
| BT14         | 2023-11-17  |             103 |                 103 | U 26, SR 12, C 40, R 22, SEC 3       |
| BT13         | 2023-07-21  |             112 |                 112 | U 30, SR 10, C 44, R 26, SEC 2       |
| EX4          | 2023-06-23  |              74 |                  74 | U 20, C 24, R 18, SR 10, SEC 2       |
| BT12         | 2023-04-28  |             112 |                 112 | U 30, C 44, R 26, SR 10, SEC 2       |
| BT11         | 2023-02-17  |             115 |                 125 | SR 15, SEC 3, C 46, U 33, R 28       |
| EX3          | 2022-11-11  |              74 |                  74 | U 22, C 26, R 16, SR 8, SEC 2        |
| BT10         | 2022-10-14  |             113 |                 113 | U 30, C 44, R 26, SR 10, SEC 3       |
| BT9          | 2022-07-29  |             112 |                 112 | U 30, C 44, R 26, SR 10, SEC 2       |
| EX2          | 2022-06-24  |              74 |                  74 | U 20, R 18, C 26, SR 8, SEC 2        |
| BT8          | 2022-05-13  |             112 |                 112 | U 30, C 44, R 26, SR 10, SEC 2       |
| BT7          | 2022-03-04  |             120 |                 112 | U 30, C 44, R 26, SR 10, SEC 2       |
| EX1          | 2021-12-10  |              73 |                  73 | U 20, C 26, R 18, SR 8, SEC 1        |
| BT6          | 2021-10-15  |             113 |                 113 | SR 11, U 30, C 44, R 26, SEC 2       |
| BT5          | 2021-08-06  |             112 |                 112 | U 30, C 44, R 26, SR 10, SEC 2       |
| BT4          | 2021-06-11  |             115 |                 115 | U 30, C 44, SR 12, R 26, SEC 3       |
| BT01-03-V1.5 | 2021-03-12  |             152 |                 152 | SR 10, R 35, C 64, U 40, SEC 3       |
| BT01-03-V1   | 2021-02-12  |             187 |                 187 | R 45, U 50, C 69, SR 20, SEC 3       |

The English BT1–BT3 distribution is represented by `BT01-03-V1` (187 identities) and `BT01-03-V1.5` (152), not separate English BT1/BT2/BT3 packs. BT18–BT20 use `BT18-19` and `BT19-20`, with the exact official splits and reprints. The four combined products use their actual English pack covers downloaded from their official product pages; they do not reuse Japanese standalone-set art.

RB1 and AD1 are visible as unsupported: their special slots and promo distributions need a separate audited collation model. Their old solo approximation is removed from the chooser together with its web-only reprint list. LM, starter decks and other special products are not standalone eligible boosters. Unknown IDs, standalone BT1/BT2/BT3/BT18/BT19/BT20 and BT27 requests are refused. BT27 has 71 local numbered cards after upstream integration against 104 ordinary identities plus four special types; reaching its date cannot enable the incomplete manifest.

BT25 includes six older-numbered reprints at their BT25 rarities and official printings (110 total identities). EX11 includes eight reprints (82 total). BT15 includes the English pack’s LM01 cards, not a fabricated standalone English BT15-only pool. The official product card lists are authoritative where prefix counting or the summary totals differ. Box toppers, Legend Packs, Movie Memorial Packs, Limited Card Pack bonuses and the BT6 anniversary promo pack are excluded. Campaign/special alternate treatments of a numbered identity do not become fabricated cards.

The source audit corrected `BT26-091` from `-` to `R`, and restored official English printing metadata for `BT2-047_P2` (BT25) and `BT8-112_P5` (BT14). Other legacy rarity differences are resolved per product from its official list, including older `UR`-labelled secrets and EX11’s incorrectly promo-labelled numbered cards. They do not silently lose product cards.

## Collation and compatibility

`aegis-pack-v1` remains an **estimate**, not physical Bandai odds: seven common slots, three uncommon slots, one rare, and one estimated hit using the existing family model. One representative official printing per identity is in the main pool; eligible existing alternate art follows the established alternate selector. This does not model every special foil, campaign slot, box topper or case distribution. No rookies or eggs are inserted, cards invented, or slot outcomes silently rerolled. If a sampled six-pack allocation has fewer than 40 main-deck cards, creation fails before persistence rather than inventing a legal deck. RNG is injectable for deterministic verification; live allocation uses cryptographic randomness.

`sealed-catalog-v2` identifies the expanded manifests. BT4 retains `sealed-catalog-v1` and its existing pool/collation contract. The creator’s set, six-pack count, catalog/collation/rules versions, 30-minute build window and 120-second sideboard window are persisted in private JSON state `version: 2`. They control both seats and every game. Only legacy states with neither version nor configuration use BT4; malformed versioned data fails closed. No SQL migration or edit to 053, 054 or 055 is required. Conflicting-set retries of a successful creation UUID are refused. Swiss already stores its immutable configuration in `tournaments.sealed_configuration`.

To play: open **Play → Private Match → Advanced settings → Rules → Sealed Format**, **choose a series**, then Create. The existing account or automatic guest name is used; a saved constructed deck is not required. Share the invitation link, or use the same setup's Join tab. The guest inherits the creator's immutable series. For Swiss, enable Sealed Swiss and choose the series before creating. Open the allocated packs and use the regular bounded DeckEditor; locking still requires 40 owned main cards and at most five owned eggs.

## Source fingerprints

Product catalog HTML SHA256: `dea8fd9009c8238812eaaed3924ed99f418de6920a8397cad4d596e21c4e9c88`. Full downloaded HTML, parsed metadata, excluded-note audit, card-list records and image evidence are retained in the local review evidence package. Each product manifest embeds its product-page and card-list SHA256. These are retrieval-byte hashes, not promises of upstream byte stability.

| Product page                                                      | SHA256                                                             | Card-list category                                                            | SHA256                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [ex-13](https://world.digimoncard.com/products/pack/ex-13/)       | `404277bedcb31133e9215da9b32375cbfac2e6521135361ae445be1bd1d673db` | [522039](https://world.digimoncard.com/cardlist/?search=true&category=522039) | `ef64b620234282e28d973914dfe848f25a0c5ce86156656326845638f6ec2db9` |
| [ver26](https://world.digimoncard.com/products/pack/ver26/)       | `9d48e9483cd7881ecff96a14d692ed160ef02d72df86684f410f28115f711c92` | [522038](https://world.digimoncard.com/cardlist/?search=true&category=522038) | `4d3d46671b103bd1d416103bcfb5b0f1b69acd0d9c9ea7aa38b3944c769214a0` |
| [ex-12](https://world.digimoncard.com/products/pack/ex-12/)       | `0350eb1be11fc41f53a16ace51e92e6d098ee9a139356c6e9cda919006c7c921` | [522037](https://world.digimoncard.com/cardlist/?search=true&category=522037) | `7f17095f2e8091ed9dab3815ea6cd1b8b1bbbedbcdcac31b701b787e399fe0e2` |
| [ver25](https://world.digimoncard.com/products/pack/ver25/)       | `7bc881729f0bdb5f7272f1f2c297f301cda4da1abd1af82d58ecf5a08a1f3a16` | [522036](https://world.digimoncard.com/cardlist/?search=true&category=522036) | `a28f3e4d202285421e016abd66f71f010f8ba6f2357ce0271fd865847ce542e2` |
| [ad-01](https://world.digimoncard.com/products/pack/ad-01/)       | `7cf718c7f244d8b27a676ba02a97a1d7eb56c69dafb22c88758f887563c9ffee` | [522035](https://world.digimoncard.com/cardlist/?search=true&category=522035) | `b5abf66f8645f0c276ea5abf44d4d14c63cf2ab184a1f7b3c3eead572c5555f5` |
| [ex-11](https://world.digimoncard.com/products/pack/ex-11/)       | `e7ef6a783ed33d13398b10028fce108c624b76b1522f5862fab4fcbf4db37430` | [522034](https://world.digimoncard.com/cardlist/?search=true&category=522034) | `15b117b93430db7d148b9c94630f836b71e97dfca3c4bc94f7b90bb60c02985d` |
| [ver24](https://world.digimoncard.com/products/pack/ver24/)       | `0bd657527351a7249740b69e04a5d03720c69722a9e2d77373373a35eb77c2d4` | [522033](https://world.digimoncard.com/cardlist/?search=true&category=522033) | `1cc8eb8fdcdd98b33022b3cac0e27902abf355884554f0093091c87f2f01c90a` |
| [ver23](https://world.digimoncard.com/products/pack/ver23/)       | `f7948ed1d16d16ce834a212c5aec5e231ad88fc95891c750f56e5cd1ec075627` | [522032](https://world.digimoncard.com/cardlist/?search=true&category=522032) | `0294fde60375d001092f1ad6d429780d15597a3009e757ccafadf650a96817c5` |
| [ex-10](https://world.digimoncard.com/products/pack/ex-10/)       | `40fa2a93d37aa35168b8c22cec4bd5f68b234334eed492156284b35490bdbe82` | [522031](https://world.digimoncard.com/cardlist/?search=true&category=522031) | `0dec695bf2d28636ad0b30f96369b106c022b3d50ef4173e5246f2d941c90c92` |
| [ver22](https://world.digimoncard.com/products/pack/ver22/)       | `4534167d4a3b0b758b291da4b9ac5ba59f4c752966e2d52e42bbbdb897ab1de6` | [522030](https://world.digimoncard.com/cardlist/?search=true&category=522030) | `ad829332c299d8e111b2ae564431cae817881c06f72e30ec477ac4dbd002836d` |
| [ex-09](https://world.digimoncard.com/products/pack/ex-09/)       | `9705f355a56521d4b2ae3fd93d56be6ff9dfd781cdf12f308f712075eb35dc10` | [522029](https://world.digimoncard.com/cardlist/?search=true&category=522029) | `cefc50c181f6d5d44fad8f751468b5a67d7250a19d3aa3f8f2b43756931c1d52` |
| [ver21](https://world.digimoncard.com/products/pack/ver21/)       | `7899d09d4cb324155af8b91cc1571277e308dc8a142535c89535ef5fa8f23b1a` | [522028](https://world.digimoncard.com/cardlist/?search=true&category=522028) | `59226d6e3d8cc446a3668e4b7885b4808f277a6a0eab8345b9001f1fce3b1dc8` |
| [ver19-20](https://world.digimoncard.com/products/pack/ver19-20/) | `0b5e4f6cdd5ff8877b215ad0e105fa44f6408de062b36243d57e3f3c12deaf35` | [522027](https://world.digimoncard.com/cardlist/?search=true&category=522027) | `68467ae7a97580afee9d4798f1f16f1c1693613cd99d00db7b970ea898f53e49` |
| [ex-08](https://world.digimoncard.com/products/pack/ex-08/)       | `365a4479c9a55a6116c55e78724b1917d363ac4a42d089120eadd4c14e66636a` | [522026](https://world.digimoncard.com/cardlist/?search=true&category=522026) | `26ae547f40085c8bcb5d0dea4a314472a144220b5f148c729030231ff072e963` |
| [ver18-19](https://world.digimoncard.com/products/pack/ver18-19/) | `f231d68a5cd0d79b2030a9a0d6232c2b206f760c7fd583ca424735e6c35c7d68` | [522025](https://world.digimoncard.com/cardlist/?search=true&category=522025) | `8647a4db42e345f60431be7c8d69079a0c3b8f9a748ea755f3fdecf3965dacd1` |
| [ex-07](https://world.digimoncard.com/products/pack/ex-07/)       | `7165aee5291b9184d54d3e3e6c32bbc31683d9ca1a6a585af3253b921a0ea520` | [522024](https://world.digimoncard.com/cardlist/?search=true&category=522024) | `25fd74a015c5204307b049bb53f43cffb6844612bb4863bc037d798ee9f9bdc7` |
| [ver17](https://world.digimoncard.com/products/pack/ver17/)       | `85bcc8c3fd98b4348808fc665c2e95c2d7331de96e6bf48257a0e8f9db084a3c` | [522023](https://world.digimoncard.com/cardlist/?search=true&category=522023) | `91c0936b4919a1c57faf38c600d4602f922a7ad2e56abd392deae680e6e9ba55` |
| [ex-06](https://world.digimoncard.com/products/pack/ex-06/)       | `fee333dbe96667568a2699b54abca0cc1266f47740964ef2d0587e9a20725309` | [522022](https://world.digimoncard.com/cardlist/?search=true&category=522022) | `a51895464f94ca88a90c5d31cc1477054aae068ae902c64fd44189001097ad40` |
| [ver16](https://world.digimoncard.com/products/pack/ver16.php)    | `8c5318775481ea2ea040145bc42724728e343839bb554fcde3a9495362d22ebb` | [522021](https://world.digimoncard.com/cardlist/?search=true&category=522021) | `168de3c3df77098473652d37a0aaecdf2c6c44557b7871a9ef5ff81cc011fb81` |
| [ver15](https://world.digimoncard.com/products/pack/ver15.php)    | `fff771852d0dfe12f501b0aa884ca1941afb580a866a16f18ba1e0b56cb4e16d` | [522020](https://world.digimoncard.com/cardlist/?search=true&category=522020) | `ce40568a71924f547bb75554f5c131bc87e27afff7aff0a37d5ea0e93400e128` |
| [ex-05](https://world.digimoncard.com/products/pack/ex-05.php)    | `aea426a0fd0f272773fd09bf7c180c4d2921360abc38fca12c121a1f8cee686a` | [522019](https://world.digimoncard.com/cardlist/?search=true&category=522019) | `145cad680cce98440a2a96f710a038d4fb053e9d39d970f316e4632f0bd1fda5` |
| [ver14](https://world.digimoncard.com/products/pack/ver14.php)    | `789ff21a34ceeaa9c04ba4fda465745a6d1f56063fceef8cbb7506104c1a09de` | [522018](https://world.digimoncard.com/cardlist/?search=true&category=522018) | `022b8c9e5dc31b04f2c04e544dec6f5760c97c265dc04934f1e1a907e16d6aa8` |
| [rb-01](https://world.digimoncard.com/products/pack/rb-01.php)    | `263995d03b25cfec0089fe9b6d2ded10ad73b66260467ad1c001e5101b76130b` | [522017](https://world.digimoncard.com/cardlist/?search=true&category=522017) | `979c51db17281fa6fc30a4b59a022da9eea31b0baca4dddbc9c071154df8dbec` |
| [ver13](https://world.digimoncard.com/products/pack/ver13.php)    | `84abe5feab821877d4c85cd9e989ec81a95a1ceaa56c7ae96a43e6a23f2fa7a4` | [522016](https://world.digimoncard.com/cardlist/?search=true&category=522016) | `c45b57529e0f401b5468363ae965d41f1061d4ef15bcda0eb1c1c4bf83e2d17a` |
| [ex-04](https://world.digimoncard.com/products/pack/ex-04.php)    | `fa2916beb485c59595948dc49c38aa0c282a3304e374bde0f367154ca2dcb95e` | [522015](https://world.digimoncard.com/cardlist/?search=true&category=522015) | `1389c28295ab694318b8ad5a6370487358816fd6f8a4be9af20d20492cb606fe` |
| [ver12](https://world.digimoncard.com/products/pack/ver12.php)    | `b03ace2c249c73046ed200e97df0668be0e307ebdfa1326199efe90fe3c5d72d` | [522014](https://world.digimoncard.com/cardlist/?search=true&category=522014) | `01335dd67cdc922ddbd2a6a6efccba6a7fda6e146e9febb440e31f48fc363ba2` |
| [ver11](https://world.digimoncard.com/products/pack/ver11.php)    | `35b21ac68eef6e2847b4ce4784b201f2917d973b8c4c90e49a21bf30ec01c60b` | [522013](https://world.digimoncard.com/cardlist/?search=true&category=522013) | `ed7cadc42886414f353a641ef80e46f73707b6d30b821fee7e65d54e7f04ccd9` |
| [ex-03](https://world.digimoncard.com/products/pack/ex-03.php)    | `ba86f3a1b1692b6c3e6956b230dbb5e012ea26c235ec3832bec90a5700da7957` | [522012](https://world.digimoncard.com/cardlist/?search=true&category=522012) | `189e190cfb5f0ec5f1e64f140c9b64a15ac2d7d66b8b8932f82168bf212df75d` |
| [ver10](https://world.digimoncard.com/products/pack/ver10.php)    | `03cc3ec2874105fc8bd5d7695f3aad493b6bc8a8eca2c6915f222af15a56208e` | [522011](https://world.digimoncard.com/cardlist/?search=true&category=522011) | `8456f58ecc89895235347925425e28c72c6453b6bd0b98f9a5073a1e86914df7` |
| [ver9](https://world.digimoncard.com/products/pack/ver9.php)      | `5cfb4170d6e129bce0fd1ef1934a41206ebdcde7a741d8637c4a395d48f39f55` | [522010](https://world.digimoncard.com/cardlist/?search=true&category=522010) | `210042873f5b10e6b75098a6df6a3a31fb56cda99ecb0f0eddc69013a1552719` |
| [ex-02](https://world.digimoncard.com/products/pack/ex-02.php)    | `937690c846448f03d4ef73587ea7953fba37158e3b557d8c540e60602db31565` | [522009](https://world.digimoncard.com/cardlist/?search=true&category=522009) | `308171239fbd771783210e6a0a3e063fcf24433555bc340d488a2ad7c3cdb9d6` |
| [ver8](https://world.digimoncard.com/products/pack/ver8.php)      | `188e52f1c5d2687befaed38cf2d66baf81fa7417ba90b1da329ab1ea776e9840` | [522008](https://world.digimoncard.com/cardlist/?search=true&category=522008) | `c72198e4ddda237c33dc86289a465e73355837d1d43071536b734d98c5cc1e27` |
| [ver7](https://world.digimoncard.com/products/pack/ver7.php)      | `38f2a298f253d29c69647cb8f9cd87951d65c9ad5634831f16b5a098462895b8` | [522007](https://world.digimoncard.com/cardlist/?search=true&category=522007) | `02790c33595a26eb1dc744958ac6f166442c39c456b87711272d2db12b57e286` |
| [ex-01](https://world.digimoncard.com/products/pack/ex-01.php)    | `cd378c1345f343c51016ef3d3562c4783358d32972043e25aa80cae0f7ca58f7` | [522006](https://world.digimoncard.com/cardlist/?search=true&category=522006) | `2ab9561c3eb123787688ac5e406ea3cea9ef1eb03eb1603c321cd5babfbbcc80` |
| [ver6](https://world.digimoncard.com/products/pack/ver6.php)      | `cbfaac66ca0394dfc2e0742169b0a8662b95b6c9ebe7eed880a61dc9b0d0416e` | [522005](https://world.digimoncard.com/cardlist/?search=true&category=522005) | `0201f23183838012c4085c93de96852febb5aa703985d090c61744b6a046bc08` |
| [ver5](https://world.digimoncard.com/products/pack/ver5.php)      | `0a98eb4f35b3bf2d08ef5098df55d4029b65d1d12406158d94cb07ef3dbdad92` | [522004](https://world.digimoncard.com/cardlist/?search=true&category=522004) | `6712e016d38e7873e64869e409e33e9ff75536f708ccf3b3a3fb1d67a2775d4c` |
| [ver4](https://world.digimoncard.com/products/pack/ver4.php)      | `4c225b63e9a697eec2c3eafbbe20a5f59f549ea88968cca94cee0e7836c663f5` | [522003](https://world.digimoncard.com/cardlist/?search=true&category=522003) | `cbcfad72e60cc0b2aabcf8f8485de2958d76d3c80264f42b073283c4323a2061` |
| [ver3](https://world.digimoncard.com/products/pack/ver3.php)      | `6cf4d1fd957376375d379743a8a0086fabf20fa52ff56c53a460b0bbdadc2479` | [522002](https://world.digimoncard.com/cardlist/?search=true&category=522002) | `5fe62112570caf31ac588b215bc4f1e6666e6da680cef70948f53aef06b9dd9e` |
| [ver2](https://world.digimoncard.com/products/pack/ver2.php)      | `0d24904c4718a9a24214029a5fbfdde8fb21654aa667f3868871cc9146799412` | [522001](https://world.digimoncard.com/cardlist/?search=true&category=522001) | `b59da05be7cce0cab2df4ccd420341d2946148dcb0d2178e12f5c4c9170e2ba1` |

## Product-panel cross-checks

BT11's category page includes `BT1-115_P2` Veedramon even though that printing belongs to RB1 in the maintained art catalog. The official [BT11 gold-reprint panel](https://world.digimoncard.com/images/products/pack/ver11/point_05.jpg) names exactly BT2-032, EX1-073 and ST10-06. Its [anniversary panel](https://world.digimoncard.com/images/products/pack/ver11/point_06.jpg?v2) names ten further reprints: BT1-063, BT2-046, BT2-051, BT3-077, BT3-103, BT4-063, BT5-032, BT6-085, BT7-005 and BT7-036. The explicit manifest therefore has 112 numbered cards plus these thirteen reprints, **125 identities**. Veedramon is excluded. The separate eight-card Illustration Competition bonus is also excluded; it is described as a box-purchase pack and its cards are not booster pulls.

The [official Producer Letter Vol. 1](https://world.digimoncard.com/news/p-letter_vol1.php) independently confirms that all twenty LM01 text cards are included in English BT15. BT15 therefore retains those cards despite their Japanese product name in the English card-list Notes field. Its four older-numbered ACE special printings remain eligible; special treatment counts and identity counts differ.

The reprint audit also corrects stale English art labels for the source-verified BT25 `BT3-103_P2`, the four BT15 `BT14-014/026/037/049_P2` ACE printings, and BT6 `BT1-084_P3`. Printing IDs and image IDs remain unchanged; per-product membership and rarity come from the official English sources, rather than inherited Japanese ordering or stale label metadata.

Official combined-product pack images were retrieved on 2026-11-01 without alteration. Their source URLs and byte hashes are recorded below.

| Product      | Official cover                                                                        | SHA256                                                             |
| ------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| BT01-03-V1   | [Pack image](https://world.digimoncard.com/images/products/pack/ver2/img_pkg.png)     | `0e996f0a7cdee8bd0dddf83049f6341997f3d057884795adc18e3cb06b7c4e19` |
| BT01-03-V1.5 | [Pack image](https://world.digimoncard.com/images/products/pack/ver3/img_pkg.png)     | `83253c076629011fb39fa7ee2e22259052b6c7fa6e55d1f05b5cd253472e1ff3` |
| BT18-19      | [Pack image](https://world.digimoncard.com/images/products/pack/ver18-19/img_pkg.png) | `b3decd5a843e6b7b11e3a28bc9c5df34fb8040f50f78bb1ba7a2d735d3ee8a69` |
| BT19-20      | [Pack image](https://world.digimoncard.com/images/products/pack/ver19-20/img_pkg.png) | `0be69b36a5133fbc5bcd98acc7fb331adda555efb4a1863fca248a132c6a48b0` |
