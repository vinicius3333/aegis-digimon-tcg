import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-186.js";

describe("P-186 Gallantmon", () => {
  it("reduces play cost by 2 per five total trash cards when a 13000+ DP Digimon exists", () => {
    expect(runtimeCompiledCard("P-186")!.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [
        {
          event: "wouldBePlayed",
          condition: { kind: "anyHas", filter: { kind: ["Digimon"], dp: { op: "gte", value: 13000 } } },
          actions: [
            {
              mode: "reduceCost",
              amount: 2,
              scaling: { per: 5, unit: "cards", filter: { zone: "trash", controller: "any" } },
            },
          ],
        },
      ],
    });
  });

  it("encodes Rush, Blocker, and ruling-correct deletion followed by conditional Recovery", () => {
    const card = runtimeCompiledCard("P-186")!;
    expect(card.effects.flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Rush", raw: "＜Rush＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: {
              count: 1,
              filter: { controller: "any", kind: ["Digimon"], dp: { op: "gte", value: 13000 } },
            },
          },
          {
            kind: "SecurityManipulation",
            op: "addTop",
            controller: "mine",
            source: "deck",
            amount: 1,
            condition: { kind: "ifThisEffectDidNotDelete" },
          },
        ],
      });
    }
  });
});
describe("P-186 engine behavior", () => {
  it("reduces the real play cost by 2 for each five cards in both trashes", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-186", as: "gallantmon" }],
          trash: Array.from({ length: 5 }, () => "BT1-001"),
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 13000, as: "qualifying" }],
          trash: Array.from({ length: 5 }, () => "BT1-002"),
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("gallantmon").instanceId),
    );
    // Gallantmon costs 12; 10 total trash cards apply two -2 reductions, paying 8.
    expect(s.state.memory).toBe(2);
  });

  it.each([13000, 14000])("deletes a Digimon at %i DP on play", async (dp) => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-186", as: "gallantmon" }], security: 5 },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("recovers one card when its play effect deletes no qualifying Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-186", as: "gallantmon" }], security: ["BT1-048"], deck: ["BT1-067"] },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("victim").instanceId)).toBe(
      true,
    );
  });

  it("deletes an own qualifying Digimon when no opposing target exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-017", as: "warGrowlmon" },
            { card: "BT1-009", as: "ownTarget", dp: 13000 },
          ],
          hand: [{ card: "P-186", as: "gallantmon" }],
          security: ["BT1-009"],
          deck: ["BT1-067"],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("warGrowlmon").permanentId,
        instanceId: s.inst("gallantmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("warGrowlmon").topCard.instanceId === s.inst("gallantmon").instanceId);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("ownTarget").instanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("warGrowlmon").stack.map((card) => card.instanceId)).toEqual([s.inst("warGrowlmon").instanceId]);
  });

  it.each([
    { label: "normal cost 4", useAlternateCost: false, expectedMemory: 6 },
    { label: "alternate cost 3", useAlternateCost: true, expectedMemory: 7 },
  ])("uses the WarGrowlmon route with the printed $label", async ({ useAlternateCost, expectedMemory }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-017", as: "host" }],
          hand: [{ card: "P-186", as: "gallantmon" }],
          security: ["BT1-009"],
          deck: ["BT1-067", "BT1-009"],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseInstanceId = s.inst("host").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("gallantmon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("gallantmon").instanceId);
    expect(s.state.memory).toBe(expectedMemory);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
  });
});
