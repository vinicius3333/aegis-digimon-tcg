import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-061.js";
import { compiled } from "./BT9-005.js";

describe("BT9-005 Tumblemon", () => {
  it("matches the complete catalog and compiled inherited contract", () => {
    expect(getCardDefinition("BT9-005")).toMatchObject({
      cardId: "BT9-005",
      nameEn: "Tumblemon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      forms: ["In-Training"],
      types: ["Rock"],
      inheritedEffectText: "[Opponent's Turn] While this Digimon has ＜Blocker＞, it gets +1000 DP.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OpponentsTurn",
          actions: [
            {
              kind: "Aura",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              effect: { kind: "modifyDP", amount: 1000 },
              while: { kind: "selfHasKeyword", keyword: "Blocker" },
            },
          ],
          isInherited: true,
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("grants exactly +1000 DP only to a Blocker carrier on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT9-061", as: "blocker", under: ["BT9-005"] },
          { card: "BT1-028", as: "other", under: ["BT9-005"] },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("blocker").currentDP).toBe(7000);
    expect(s.perm("other").currentDP).toBe(3000);
  });

  it("does not grant the bonus to a Blocker carrier during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-061", as: "host", under: ["BT9-005"] }] },
    });
    s.state.turnSeat = 0;
    await s.ready();

    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("applies only on the opponent's turn to the Blocker reached by a legal black evolution", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT9-005", as: "tumblemon" },
        hand: [{ card: "BT2-054", as: "gotsumon" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tumblemon").permanentId,
        instanceId: s.inst("gotsumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tumblemon").topCard.instanceId === s.inst("gotsumon").instanceId);
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("tumblemon").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => s.state.players[0]!.breeding === undefined);
    expect(s.perm("tumblemon").stack.map((card) => card.cardId)).toContain("BT9-005");
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("tumblemon").currentDP).toBe(4000);
    s.state.turnSeat = 0;
    await s.ready();
    expect(s.perm("tumblemon").currentDP).toBe(3000);
    expect(s.state.memory).toBe(0);
  });
});
