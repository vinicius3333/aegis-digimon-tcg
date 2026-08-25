import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-004.js";

describe("BT9-004 Motimon", () => {
  it("matches the complete catalog and compiled inherited contract", () => {
    expect(getCardDefinition("BT9-004")).toMatchObject({
      cardId: "BT9-004",
      nameEn: "Motimon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText: "[Your Turn] While this Digimon has [Insectoid] in its traits, it gets +1000 DP.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "Aura",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              effect: { kind: "modifyDP", amount: 1000 },
              while: {
                kind: "selfHasTrait",
                filter: { nameOrTrait: [{ tokens: ["Insectoid"], match: "trait" }] },
              },
            },
          ],
          isInherited: true,
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("matches exact and multi-trait Insectoid stacks while rejecting a nonmatch", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-066", as: "exactInsectoid", under: ["BT9-004"] },
          { card: "BT11-058", as: "multiTraitInsectoid", under: ["BT9-004"] },
          { card: "BT1-028", as: "nonmatch", under: ["BT9-004"] },
        ],
      },
    });
    await s.ready();

    expect(s.perm("exactInsectoid").currentDP).toBe(3000);
    expect(s.perm("multiTraitInsectoid").currentDP).toBe(13000);
    expect(s.perm("nonmatch").currentDP).toBe(3000);
  });

  it("applies only during the Motimon controller's turn", async () => {
    for (const turnSeat of [0, 1] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT1-066", as: "host", under: ["BT9-004"] }] },
      });
      s.state.turnSeat = turnSeat;
      await s.ready();

      expect(s.perm("host").currentDP).toBe(turnSeat === 0 ? 3000 : 2000);
    }
  });

  it("applies +1000 DP on the Insectoid reached by a legal green breeding evolution", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT9-004", as: "motimon" },
        hand: [{ card: "BT1-066", as: "tentomon" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("motimon").permanentId,
        instanceId: s.inst("tentomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("motimon").topCard.instanceId === s.inst("tentomon").instanceId);
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("motimon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding === undefined);
    expect(s.perm("motimon").stack.map((card) => card.cardId)).toContain("BT9-004");
    expect(s.perm("motimon").currentDP).toBe(3000);
    expect(s.state.memory).toBe(0);
  });
});
