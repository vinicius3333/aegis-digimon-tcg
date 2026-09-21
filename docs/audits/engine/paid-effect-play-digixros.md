# Paid effect-play DigiXros audit

Date: 2026-09-21

Issue #4892 exposed a cross-set representation gap: `PlayWithoutCost` is also used for effects that
play a card **while paying its cost**, often with a reduction. Those actions must explicitly set
`allowDigiXros: true`; genuinely free plays must not prepare DigiXros.

The audit covered every card module containing a paid `PlayWithoutCost` action sourced from hand.
Tamer-only actions (BT15-024, BT24-024, EX13-019, and P-206) were excluded because DigiXros can only
apply to Digimon. Existing correct opt-ins BT21-021 and BT26-006 were retained.

The corrected modules are:

- BT13-056; BT15-096; BT16-048, BT16-090; BT17-094.
- BT20-013, BT20-093, BT20-099; BT21-092; BT23-008, BT23-018.
- BT24-090, BT24-094; BT25-039, BT25-094, BT25-095, BT25-097, BT25-098, BT25-099, BT25-102.
- BT26-012, BT26-022, BT26-032, BT26-033, BT26-096.
- EX9-005, EX9-067; EX10-012, EX10-020, EX10-035, EX10-057; EX11-071.
- EX12-013, EX12-027, EX12-041, EX12-043, EX12-045, EX12-050, EX12-069, EX12-074.
- EX13-005, EX13-012, EX13-043, EX13-060; ST17-02; ST23-04, ST23-08.

Behavioral proof is anchored by EX12-043 Hakubamon and EX12-045 Sanzomon: each pays a reduced play
cost and then applies the selected Digimon's DigiXros reduction/material placement. The shared
DigiXros preparation suite proves that the opt-in opens preparation only for paid plays. The direct
module IR was synchronized into `packages/shared/src/effects/effects.json` for every affected set.
