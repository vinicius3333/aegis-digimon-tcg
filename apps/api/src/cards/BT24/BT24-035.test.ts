import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_035 } from "./BT24-035.js";
import "../index.js";

describe("BT24-035 Gatomon", () => {
  it("applies -3000 DP and conditionally offers Silphymon DNA digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = BT24_035.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" });
      expect(actions[1]).toMatchObject({
        kind: "DnaDigivolve",
        payCost: true,
        optional: true,
        condition: { kind: "isYourTurn" },
        into: { namesExact: ["Silphymon"] },
      });
    }
    expect(BT24_035.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Barrier");
  });

  it("finishes the optional DNA action before 0-DP rule cleanup (Q5614)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-035", as: "gatomon" },
            { card: "BT24-011", as: "redMaterial" },
          ],
          hand: [{ card: "BT16-012", as: "silphymon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "zeroDp", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gatomon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT16-012"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("silphymon").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("applies the DP loss but does not offer DNA on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-035", as: "gatomon" },
            { card: "BT24-011", as: "redMaterial" },
          ],
          hand: [{ card: "BT16-012", as: "silphymon" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gatomon"));

    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("silphymon").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("grants inherited Barrier and supports the alternate TS evolution route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-037", as: "host", under: ["BT24-035"] }],
        breeding: { card: "BT24-020", as: "tsBase" },
        hand: [{ card: "BT24-035", as: "gatomon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("gatomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.instanceId === s.inst("gatomon").instanceId);
    expect(s.state.memory).toBe(2);
  });
});
