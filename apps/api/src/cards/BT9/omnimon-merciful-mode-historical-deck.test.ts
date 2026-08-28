import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-084.js";
import "../BT5/BT5-111.js";
import "./BT9-083.js";

describe("Omnimon Merciful Mode historical Mega-stack deck", () => {
  it("counts two Mega sources, deletes two stacks, orders ten trash cards, and trashes security next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT5-111",
              as: "omnimonX",
              under: [{ card: "BT1-084", as: "classicOmnimon" }],
            },
          ],
          hand: [{ card: "BT9-083", as: "mercifulMode" }],
        },
        1: {
          battleArea: [
            {
              card: "BT2-047",
              as: "firstTarget",
              under: [
                { card: "BT1-001", as: "redEgg" },
                { card: "BT1-009", as: "firstRookie" },
              ],
            },
            {
              card: "BT2-047",
              as: "secondTarget",
              under: [
                { card: "BT1-002", as: "blueEgg" },
                { card: "BT1-010", as: "secondRookie" },
              ],
            },
          ],
          trash: [
            { card: "BT1-011", as: "trashOne" },
            { card: "BT1-012", as: "trashTwo" },
            { card: "BT1-013", as: "trashThree" },
            { card: "BT1-014", as: "trashFour" },
          ],
          security: [{ card: "BT1-015", as: "securityTop" }],
        },
      },
      { autoOrderCards: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const omnimonXInstanceId = s.perm("omnimonX").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("omnimonX").permanentId,
        instanceId: s.inst("mercifulMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[1]!.deck.length === 8 &&
        s.state.players[1]!.eggDeck.length === 2,
    );

    expect(s.state.players[1]!.deck).toHaveLength(8);
    expect(s.state.players[1]!.eggDeck).toHaveLength(2);

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("omnimonX"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === omnimonXInstanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("securityTop").instanceId)).toBe(true);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
