import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-064.js";
import "../index.js";

describe("BT26-064 DemiDevimon", () => {
  it("compiles the two reveal slots and inherited once-per-turn draw/trash", () => {
    expect(digivolutionRequirementsFor("BT26-064")).toContainEqual({
      level: 2,
      traits: ["TS"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [{ count: 1 }, { count: 1 }],
      rest: "deckBottom",
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
    });
  });

  it("adds one evil trait card and one TS card, bottoming the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-064", as: "demi" }],
          deck: [
            { card: "BT15-036", as: "evil" },
            { card: "BT26-066", as: "ts" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demi").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 1);
    expect(s.state.players[0]!.hand.map((c) => c.cardId).sort()).toEqual(["BT15-036", "BT26-066"]);
    expect(s.state.players[0]!.deck.map((c) => c.cardId)).toEqual(["BT1-009"]);
  });

  it("draws and then trashes for its inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-066", as: "host", under: ["BT26-064"] }],
          deck: [{ card: "AD1-001", as: "drawn" }],
        },
        1: { security: ["AD1-002"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
