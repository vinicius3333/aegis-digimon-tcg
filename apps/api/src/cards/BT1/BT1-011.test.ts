import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-011.js";

describe("BT1-011 Agumon Expert", () => {
  it("matches the catalog and exports its exact On Play recovery", () => {
    expect(getCardDefinition("BT1-011")).toMatchObject({
      cardId: "BT1-011",
      nameEn: "Agumon Expert",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Dinosaur"],
      effectText: "[On Play] Return 1 Digimon card with [Agumon] in its name from your recycle bin to your hand.",
    });
    expect(compiled.effects).toEqual([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Return",
            to: "hand",
            target: {
              filter: {
                controller: "mine",
                zone: "trash",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Agumon"], match: "name" }],
              },
              count: 1,
            },
          },
        ],
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("returns an Agumon Digimon from trash to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-011", as: "expert" }],
          trash: [
            { card: "BT1-010", as: "agumon" },
            { card: "BT1-012", as: "other" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const agumonId = s.inst("agumon").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("expert").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === agumonId));

    expect(player.trash.map((card) => card.instanceId)).not.toContain(agumonId);
    expect(player.trash.map((card) => card.instanceId)).toContain(s.inst("other").instanceId);
  });

  it("matches a Digimon whose longer name contains Agumon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-011", as: "expert" }], trash: [{ card: "BT6-018", as: "bond" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const bondId = s.inst("bond").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("expert").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === bondId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bondId)).toBe(true);
  });

  it("does not return a non-Digimon card whose name contains Agumon", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT1-011", as: "expert" }],
        trash: [
          { card: "AD1-021", as: "agumonTamer" },
          { card: "BT1-012", as: "otherDigimon" },
        ],
      },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("expert").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-011"));

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("agumonTamer").instanceId, s.inst("otherDigimon").instanceId]),
    );
  });

  it("does not fire its On Play effect when Agumon Expert is digivolved", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-001", as: "base" }],
        hand: [{ card: "BT1-011", as: "expert" }],
        trash: [{ card: "BT1-010", as: "agumon" }],
        deck: [{ card: "BT1-013", as: "drawn" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("expert").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("expert").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(s.inst("base").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("agumon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("agumon").instanceId);
  });
});
