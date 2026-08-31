import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-008.js";
import "../index.js";

describe("BT21-008 Elizamon", () => {
  it("reveals three, adds one Reptile/Dragonkin and one LIBERATOR, then bottoms the rest", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            add: [
              {
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }],
                },
                count: 1,
                to: "hand",
              },
              {
                filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] },
                count: 1,
                to: "hand",
              },
            ],
            rest: "deckBottom",
          },
        ],
      }),
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenSecurityRemoved",
            sourceFilter: { controller: "opponent" },
            fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" },
            actions: [{ kind: "GainMemory", amount: 1 }],
          },
        ],
      }),
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("plays for 3, adds separate Reptile and LIBERATOR cards, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-008", as: "elizamon" }],
          deck: [
            { card: "BT1-010", as: "reptile" },
            { card: "BT21-087", as: "liberator" },
            { card: "BT1-009", as: "rest" },
            { card: "BT1-002", as: "tail" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("elizamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("reptile").instanceId, s.inst("liberator").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("tail").instanceId,
      s.inst("rest").instanceId,
    ]);
    expect(s.state.memory).toBe(7);
  });

  it("gains inherited memory from a public attack that removes opponent security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-018", as: "host", under: ["BT21-008"] }] },
      1: { security: ["BT1-001"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(1);
  });

  it("leaves all three cards in the deck when neither search bucket matches", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-008", as: "elizamon" }],
        deck: ["BT1-009", "BT1-018", "BT1-026"],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("elizamon"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("gains memory once per turn only when the opponent's security is removed", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-018", as: "host", under: ["BT21-008"] }] },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.memory).toBe(0);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.memory).toBe(1);
  });
});
