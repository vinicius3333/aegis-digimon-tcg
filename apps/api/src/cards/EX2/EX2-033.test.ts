import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-033.js";
import "./EX2-033.js";
import "./EX2-037.js";

describe("EX2-033 Locomon", () => {
  it("matches the catalog and compiled GroundLocomon-only reduction", () => {
    expect(getCardDefinition("EX2-033")).toMatchObject({
      cardId: "EX2-033",
      nameEn: "Locomon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Machine"],
      effectText:
        "[Your Turn] When this Digimon would digivolve into a [GroundLocomon] in your hand, reduce the digivolution cost by 1.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              sourceFilter: { isSelfRef: true },
              into: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [{ tokens: ["GroundLocomon"], match: "name" }],
              },
              actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("reduces the cost to digivolve into GroundLocomon by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-033", as: "base" }],
          hand: [{ card: "EX2-036", as: "evolution" }],
          deck: ["BT1-009"],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 8);
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-033"]);
    expect(s.perm("base").topCard.cardId).toBe("EX2-036");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("does not reduce a digivolution into a different level-6 Digimon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX2-033", as: "base" }], hand: [{ card: "EX2-037", as: "evolution" }] } },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 6);
    expect(s.state.memory).toBe(6);
  });

  it("rejects GroundLocomon evolution from a non-black level-4 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-026", as: "greenSource" }], hand: [{ card: "EX2-036", as: "evolution" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenSource").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });
});
