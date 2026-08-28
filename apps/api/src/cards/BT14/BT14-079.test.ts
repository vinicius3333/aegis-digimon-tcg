import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-079.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-079", () => {
  it("uses level 3 without Eiji and level 4 when Eiji is stacked", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      {
        kind: "PlayWithoutCost",
        from: ["trash"],
        payCost: false,
        target: { filter: { levelComparison: { op: "lte", value: 3 } } },
        condition: { kind: "not" },
      },
      {
        kind: "PlayWithoutCost",
        from: ["trash"],
        payCost: false,
        target: { filter: { levelComparison: { op: "lte", value: 4 } } },
        condition: { kind: "selfDigivolutionStackMatchesFilter" },
      },
    ]));
  it("gains one memory by trashing a hand card when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      cost: { kind: "trash" },
    }));
  it("inherits once-per-turn unsuspend when a Dark Animal or SoC Digimon is played", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Unsuspend" }] }],
    }));
  it("trashes a hand card and gains memory when attacking", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT14-079", as: "source" }], hand: [{ card: "BT1-002", as: "cost" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002") && s.state.memory === 4);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002")).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("digivolves through a legal stack and naturally unsuspends from the inherited watcher", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-074", as: "host", suspended: true }],
          hand: [
            { card: "BT14-079", as: "source" },
            { card: "BT14-080", as: "finisher" },
            { card: "BT14-072", as: "fangmon" },
            { card: "BT1-002", as: "discard" },
          ],
          trash: [{ card: "BT14-071", as: "playable" }],
          deck: ["BT1-001", "BT1-003", "BT1-004"],
        },
      },
      { memory: 20, autoSelectCards: true, autoAcceptOptional: true },
    );

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("source").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("host").topCard?.cardId === "BT14-079" &&
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-071"),
    );
    expect(s.perm("host").topCard?.cardId).toBe("BT14-079");

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("finisher").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT14-080");
    expect(s.perm("host").stack.some((card) => card.cardId === "BT14-079")).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fangmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      !s.perm("host").isSuspended && s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002"),
    );
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002")).toBe(true);
  });
});
