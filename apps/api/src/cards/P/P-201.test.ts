import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-201.js";

describe("P-201 Phascomon", () => {
  it("reveals three, adds a Belphemon/Gizmon-text card, bottoms the rest, then trashes a hand card", () => {
    const card = runtimeCompiledCard("P-201")!;
    for (const trigger of ["OnPlay", "OnDeletion"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            rest: "deckBottom",
            add: [
              {
                count: 1,
                to: "hand",
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [{ tokens: ["Belphemon", "Gizmon"], match: "text" }],
                },
              },
            ],
          },
          { kind: "Trash", target: { count: 1, filter: { controller: "mine", zone: "hand" } } },
        ],
      });
    }
  });

  it("requires Kapurimon for zero-cost evolution and inherits the hand-trash suspension effect", () => {
    const card = runtimeCompiledCard("P-201")!;
    expect(card.digivolutionRequirement).toEqual([{ names: ["Kapurimon"], cost: 0, isAlternate: true }]);
    expect(card.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Suspend",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          cost: { kind: "trash", target: { count: 1, filter: { zone: "hand", controller: "mine" } } },
        },
      ],
    });
  });

  it("reveals three, adds a Belphemon-text card, and trashes a hand card on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-201", as: "source" },
            { card: "ST1-16", as: "filler" },
          ],
          deck: [{ card: "BT13-084", as: "match" }, "BT1-009", "BT1-028"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("filler").instanceId)).toBe(true);
  });

  it("suspends an opposing Digimon once at each natural opponent-turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-074", as: "host", under: ["P-201"] }],
          hand: [
            { card: "ST1-16", as: "cost1" },
            { card: "ST1-16", as: "cost2" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim1" },
            { card: "BT1-009", as: "victim2" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const sourceId = s.perm("host").stack.find((card) => card.cardId === "P-201")!.instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined && s.perm("victim1").isSuspended);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost1").instanceId)).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.perm("victim1").isSuspended &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost2").instanceId),
    );
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost2").instanceId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("repeats the reveal-and-trash effect when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-201", as: "source" }],
          hand: [{ card: "ST1-16", as: "filler" }],
          deck: [{ card: "BT13-084", as: "match" }, "BT1-009", "BT1-028"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("filler").instanceId)).toBe(true);
  });
});
