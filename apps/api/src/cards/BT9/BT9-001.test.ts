import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-001.js";

describe("BT9-001 Koromon", () => {
  it("matches the complete catalog and compiled inherited contract", () => {
    expect(getCardDefinition("BT9-001")).toMatchObject({
      cardId: "BT9-001",
      nameEn: "Koromon",
      colors: ["Red"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText: "[Your Turn] While this Digimon has [Agumon] or [Greymon] in its name, it gets +1000 DP.",
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
              while: { kind: "selfHasNameContaining", names: ["Agumon", "Greymon"] },
            },
          ],
          isInherited: true,
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("grants +1000 DP to both printed name families but not a near peer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT9-008", as: "agumon", under: ["BT9-001"] },
          { card: "BT1-015", as: "greymon", under: ["BT9-001"] },
          { card: "BT1-028", as: "nonmatch", under: ["BT9-001"] },
        ],
      },
    });
    await s.ready();

    expect(s.perm("agumon").currentDP).toBe(3000);
    expect(s.perm("greymon").currentDP).toBe(5000);
    expect(s.perm("nonmatch").currentDP).toBe(3000);
  });

  it("applies only during the Koromon controller's turn", async () => {
    for (const turnSeat of [0, 1] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT9-008", as: "host", under: ["BT9-001"] }] },
      });
      s.state.turnSeat = turnSeat;
      await s.ready();

      expect(s.perm("host").currentDP).toBe(turnSeat === 0 ? 3000 : 2000);
    }
  });

  it("applies +1000 DP on the same stack built by a legal breeding evolution", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT9-001", as: "koromon" },
        hand: [{ card: "BT9-008", as: "agumon" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koromon").permanentId,
        instanceId: s.inst("agumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koromon").topCard.instanceId === s.inst("agumon").instanceId);
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("koromon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding === undefined);
    expect(s.perm("koromon").stack.map((card) => card.cardId)).toContain("BT9-001");
    expect(s.perm("koromon").currentDP).toBe(3000);
    expect(s.state.memory).toBe(0);
  });
});
