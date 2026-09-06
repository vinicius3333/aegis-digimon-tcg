# BT26 browser evolution proof

Date: 2026-09-06. Result: **PASS**.

The Luna worker prepared an isolated API on port `3567` and Vite client on `5174`. The coordinator completed the interaction through the Orca browser on `/dev/battle`, page `7e49ce3f-fb63-4256-8925-29b345a9e565`.

## Reproduction

Temporarily seed `apps/api/src/engine/devScenario.ts` with four memory, hand card `BT26-033`, and the human stack bottom-to-top `BT26-001`, `BT26-009`, `BT26-011`, `BT26-015`. Start the API and web client on isolated ports with `VITE_AEGIS_API_URL` pointing at that API. Open `/dev/battle`.

1. End Breeding with **Encerrar criação**, and verify the Main phase and memory `+4`.
2. Select Jupitermon in hand. The interface highlights Butenmon and instructs the player to select an evolution base.
3. Focus the highlighted Butenmon button and press **Enter**. This uses the existing keyboard activation path for draggable battlefield cards. Orca's direct click did not activate that drag-oriented target; it was not a missing DUAL evolution mode.
4. In the evolution-cost choice, select **[TS] TRAIT LV.5 · 4 DE MEMÓRIA**, rather than the displayed Yellow Lv.5 route costing 5.
5. Decline the optional Iliad continuation using **NÃO USAR** and await the resolved-effect log entry.
6. Focus Jupitermon, press **Enter**, then choose **Ver pilha** to inspect the resulting sources.

Orca commands used semantic refs from fresh snapshots, `focus`, `keypress`, `click`, and `screenshot`. Ref numbers are session-specific and must be reacquired when reproducing. No DOM state injection or API intent injection was used to perform the evolution.

## Observed final state

- Jupitermon `BT26-033` is the active Lv.6 Digimon with 13,000 DP and Raid, Alliance, and Engage visible.
- Its four evolution sources remain in order: Yokomon `BT26-001`, Hyokomon `BT26-009`, Buraimon `BT26-011`, Butenmon `BT26-015`.
- Memory changed **4 → 0** through the selected alternate evolution requirement.
- The player's deck changed **39 → 38**; the log records Kiriha Aonuma moving from deck to hand as the evolution draw.
- Security changed **5 → 4**; the log records Taiki Kudo moving from security to hand.
- The optional continuation was declined, and the log confirms **O efeito de Jupitermon foi resolvido**. No effect decision remained pending.

## Screenshots

- [Completed evolution, memory 0, security 4, and final hand](./BT26-UI-REAUDIT.png)
- [Completed Jupitermon stack with all four sources](./BT26-UI-REAUDIT-stack.png)

The coordinator visually inspected both final screenshots and the semantic snapshots. This is representative UI stack evidence; the complete per-card contract remains covered by the 104-card audit and its 993-test collection.

## Cleanup

`devScenario.ts` was restored exactly to its committed baseline. The isolated API terminal `term_479b7ad0-7d3d-41d2-9dc8-7bed3825ebbd` and web terminal `term_28d23923-7d6d-4b88-b10e-d4df1d80791e` were stopped. No application implementation changes were retained from the browser setup.
