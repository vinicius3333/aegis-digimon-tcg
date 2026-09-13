import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-192.js";

describe("P-192 Bakemon", () => {
  it("trashes one hand card to delete an opponent level 4 or lower Digimon on play and digivolution", () => {
    const card = runtimeCompiledCard("P-192")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: {
              count: 1,
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            },
            cost: { kind: "trash", target: { count: 1, filter: { zone: "hand", controller: "mine" } } },
          },
        ],
      });
    }
  });

  it("has inherited Retaliation", () => {
    expect(runtimeCompiledCard("P-192")!.effects.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
    });
  });
});

describe("P-192 engine behavior", () => {
  it("exposes inherited Retaliation on a real evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-076", as: "host", under: ["P-192"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
  });

  it("publicly pays the evolution cost, preserves its source, and deletes an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-071", as: "host" }],
          hand: [
            { card: "P-192", as: "demidevimon" },
            { card: "ST1-16", as: "cost" },
          ],
          deck: Array(20).fill("BT1-009"),
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }], deck: Array(20).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostPermanentId = s.perm("host").permanentId;
    const sourceInstanceId = s.inst("host").instanceId;
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostPermanentId,
        instanceId: s.inst("demidevimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("demidevimon").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 5, to: 3, reason: "digivolve" });
    expect(s.perm("host").permanentId).toBe(hostPermanentId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
  });
});
describe("P-192 engine behavior", () => {
  it("trashes a hand card and deletes an opposing level-4-or-lower Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-192", as: "demidevimon" },
            { card: "ST1-16", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demidevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
  });
});
