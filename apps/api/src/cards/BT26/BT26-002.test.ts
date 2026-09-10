import { describe, expect, it } from "vitest";
import { Zone } from "@aegis/shared";
import type { Primitives as EnginePrimitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-002.js";
import "../index.js";

function primitives(s: ReturnType<typeof setupEngine>): EnginePrimitives {
  return (s.engine as unknown as { primitives: EnginePrimitives }).primitives;
}

function seedTurnLoop(s: ReturnType<typeof setupEngine>) {
  for (const seat of [0, 1] as const) {
    for (let i = 0; i < 6; i += 1) s.give(seat, Zone.Deck, "BT1-009");
    if (s.state.players[seat]!.security.length === 0) s.give(seat, Zone.Security, "BT1-010");
  }
}

describe("BT26-002 Budmon", () => {
  it("is compiled as a once-per-turn inherited Your Turn watcher", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      effects: [
        {
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          isInherited: true,
          actions: [
            {
              kind: "SubTrigger",
              event: "whenDigivolutionTrashed",
              sourceFilter: { controller: "mine", kind: ["Tamer"], byEffect: true },
            },
          ],
        },
      ],
    });
  });

  it("draws from a public Tamer-stack payment and only once that turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-034", as: "host", under: [{ card: "BT26-002", as: "budmon" }] },
            {
              card: "BT26-090",
              as: "tamer",
              under: [
                { card: "BT1-010", as: "underA", faceUp: false },
                { card: "BT1-011", as: "underB", faceUp: false },
              ],
            },
          ],
          deck: [
            { card: "BT1-012", as: "drawn" },
            { card: "BT1-013", as: "notDrawn" },
          ],
          hand: [
            { card: "BT26-098", as: "firstOption" },
            { card: "BT26-098", as: "secondOption" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const secondOptionId = s.inst("secondOption").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("secondOption").instanceId,
      s.inst("drawn").instanceId,
    ]);

    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("underB").instanceId]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === secondOptionId));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("notDrawn").instanceId]);
  });

  it("reaches Budmon through its legal green level-2-to-level-3 evolution stack", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        breeding: { card: "BT26-002", as: "budmon" },
        hand: [{ card: "BT26-034", as: "palmon" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("budmon").permanentId,
        instanceId: s.inst("palmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("budmon").topCard.cardId === "BT26-034");

    expect(s.perm("budmon").topCard.cardId).toBe("BT26-034");
    expect(s.perm("budmon").stack.map(({ cardId }) => cardId)).toEqual(["BT26-002"]);
  });

  it("draws from a public attack-target change that trashes a face-down card under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-034", as: "budmonHost", under: [{ card: "BT26-002", as: "budmon" }] },
            { card: "BT26-053", as: "wolvermon" },
            { card: "BT26-011", as: "attacker" },
            {
              card: "BT26-090",
              as: "tamer",
              under: [
                { card: "BT1-010", as: "bottom", faceUp: false },
                { card: "BT1-011", as: "upper", faceUp: false },
              ],
            },
          ],
          hand: [{ card: "BT26-075", as: "option" }],
          deck: [{ card: "BT1-012", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT26-014", as: "opponentTarget", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId));

    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("upper").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not draw when the Tamer-stack trash has no effect provenance", async () => {
    const s = setupEngine({
      0: {
        security: ["BT1-012"],
        battleArea: [
          { card: "BT26-034", as: "host", under: [{ card: "BT26-002", as: "budmon" }] },
          { card: "BT26-090", as: "tamer", under: [{ card: "BT1-010", as: "under" }] },
        ],
        deck: ["BT1-012"],
      },
    });
    await s.ready();

    await primitives(s).trashDigivolutionCards(s.perm("tamer").permanentId, [s.inst("under").instanceId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("ignores cards under Digimon, cards under an opponent Tamer, and all events during the opponent turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT26-034",
            as: "host",
            under: [{ card: "BT26-002" }, { card: "BT1-008", as: "digimonUnder" }],
          },
        ],
        deck: ["BT1-012"],
        security: 5,
      },
      1: {
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016", "BT1-017"],
        security: 5,
        battleArea: [
          { card: "BT26-090", as: "opponentTamer", under: [{ card: "BT1-010", as: "oppUnder" }] },
          { card: "BT26-090", as: "borrowedTamer", under: [{ card: "BT1-011", as: "turnUnder" }] },
        ],
      },
    });
    await s.ready();
    await primitives(s).trashDigivolutionCards(s.perm("host").permanentId, [s.inst("digimonUnder").instanceId], {
      byEffectSeat: 0,
    });
    expect(s.state.players[0]!.hand).toHaveLength(0);

    await primitives(s).trashDigivolutionCards(s.perm("opponentTamer").permanentId, [s.inst("oppUnder").instanceId], {
      byEffectSeat: 0,
    });
    expect(s.state.players[0]!.hand).toHaveLength(0);

    seedTurnLoop(s);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.perm("borrowedTamer").controllerSeat = 0;
    await primitives(s).trashDigivolutionCards(s.perm("borrowedTamer").permanentId, [s.inst("turnUnder").instanceId], {
      byEffectSeat: 1,
    });
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("gives separate Budmon copies independent once-per-turn draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-034", as: "firstHost", under: [{ card: "BT26-002" }] },
          { card: "BT26-036", as: "secondHost", under: [{ card: "BT26-002" }] },
          { card: "BT26-090", as: "tamer", under: [{ card: "BT1-011", as: "under" }] },
        ],
        deck: ["BT1-012", "BT1-013"],
      },
    });
    await s.ready();
    await primitives(s).trashDigivolutionCards(s.perm("tamer").permanentId, [s.inst("under").instanceId], {
      byEffectSeat: 0,
    });
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
