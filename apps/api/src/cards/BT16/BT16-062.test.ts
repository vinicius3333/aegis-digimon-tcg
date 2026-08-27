import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-062.js";
import "../index.js";

describe("BT16-062", () => {
  it("de-digivolves and deletes an opposing Digimon on play or digivolution", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "DeDigivolve",
        amount: 1,
        target: { filter: { dp: { op: "lte", relativeToSource: true } } },
      });
      expect(effect.actions?.[1]).toMatchObject({ kind: "Delete", target: { filter: { playCostLte: 3 } } });
    }
  });

  it("copies effects from Gammamon cards in its stack, including inherited", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        { kind: "GrantStatic", grant: { copyEffectsFromDigivolution: expect.anything() }, duration: "permanent" },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", isInherited: true });
  });

  it("de-digivolves a DP-legal target and deletes a separate low-cost target live", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-062", as: "zan" }] },
        1: {
          battleArea: [
            { card: "BT1-015", as: "stacked", dp: 4000, under: ["BT1-009"] },
            { card: "BT1-009", as: "low" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zan").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    // The ＜De-Digivolve 1＞ trashes the stacked Digimon's top card; the follow-up deletion then
    // takes a play-cost-3-or-less Digimon, which either survivor satisfies — so assert the
    // de-digivolution and the net board rather than a particular victim.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-015")).toBe(true);
  });
});
