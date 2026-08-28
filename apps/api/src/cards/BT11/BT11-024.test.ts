import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-024.js";

describe("BT11-024 Penguinmon", () => {
  it("matches the catalog and carries the complete optional-cost contract", () => {
    expect(getCardDefinition("BT11-024")).toMatchObject({
      cardId: "BT11-024",
      nameEn: "Penguinmon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Avian"],
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "Draw",
              amount: 1,
              optional: true,
              abortOnDecline: true,
              cost: { kind: "place", position: "bottom", target: { count: 1, from: ["hand"] } },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "Draw",
      cost: { kind: "place", position: "bottom" },
    });
  });

  it("evolves from blue level 2 for 0", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-002", as: "base" }], hand: [{ card: "BT11-024", as: "penguin" }] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("penguin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-024");
    expect(s.state.memory).toBe(2);
  });

  it("accepts a non-blue Sea Animal as the optional placement cost and draws", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT11-024", as: "penguinmon" },
            { card: "BT15-068", as: "seaAnimal" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    const sourceInstanceId = s.inst("penguinmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: sourceInstanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          ({ topCard, stack }) => topCard?.instanceId === sourceInstanceId && stack.length === 1,
        ) && s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId),
    );
    const penguinmon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.instanceId === sourceInstanceId)!;

    expect(penguinmon.stack[0]?.instanceId).toBe(s.inst("seaAnimal").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("accepts the independent blue-level-3 branch", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT11-024", as: "penguin" },
            { card: "BT11-020", as: "blueLevel3" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("penguin").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.battleArea[0]!.stack[0]!.instanceId).toBe(s.inst("blueLevel3").instanceId);
  });

  it("draws neither when the cost is declined nor when no qualifying card exists", async () => {
    for (const [candidate, options] of [
      ["BT11-020", { autoDeclineOptional: true }],
      ["BT11-025", { autoAcceptOptional: true, autoSelectCards: true }],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT11-024", as: "penguin" },
              { card: candidate, as: "candidate" },
            ],
            deck: [{ card: "BT1-009", as: "notDrawn" }],
          },
        },
        options,
      );
      s.state.memory = 6;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("penguin").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.length === 1);
      expect(s.state.players[0]!.deck.map((c) => c.instanceId)).toContain(s.inst("notDrawn").instanceId);
      expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("candidate").instanceId);
    }
  });
});
