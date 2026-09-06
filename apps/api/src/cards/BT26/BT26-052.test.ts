import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-052.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-052 Pristimon", () => {
  it("contains both independent reveal slots and inherited Reboot", () => {
    expect(digivolutionRequirementsFor("BT26-052")).toContainEqual({
      level: 2,
      traits: ["Glowing Dawn"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [{ count: 1 }, { count: 1 }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Reboot" }],
    });
  });

  it("adds one Glowing Dawn card and one black BEATBREAK card, bottoming the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-052", as: "pristimon" }],
          deck: [
            { card: "BT25-035", as: "dawn" },
            { card: "BT26-093", as: "beatbreak" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pristimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);
    expect(s.state.players[0]!.hand.map((c) => c.cardId).sort()).toEqual(["BT25-035", "BT26-093"]);
    expect(s.state.players[0]!.deck.map((c) => c.cardId)).toEqual(["BT1-009"]);
  });

  it("does not accept a non-black BEATBREAK card for the second reveal slot", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-052", as: "pristimon" }],
          deck: [
            { card: "BT26-093", as: "blackDawnBeatbreak" },
            { card: "BT25-035", as: "yellowDawnBeatbreak" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pristimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT26-093"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT25-035", "BT1-009"]);
  });

  it("never adds the same revealed card twice when it qualifies for both slots", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-052", as: "played" }],
          deck: [
            { card: "BT26-052", as: "bothTraits" },
            { card: "BT1-009", as: "firstRest" },
            { card: "BT1-010", as: "secondRest" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bothTraits").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstRest").instanceId, s.inst("secondRest").instanceId]),
    );
  });

  it("digivolves for 0 from a differently colored level 2 Glowing Dawn card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-003", as: "base" }],
        hand: [{ card: "BT26-052", as: "pristimon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pristimon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-052");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe("BT25-003");
  });

  it("grants inherited Reboot to its evolution host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-053", as: "host", under: ["BT26-052"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });

  it("actually unsuspends an inherited host during the opponent's Active phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-053", as: "host", under: ["BT26-052"], suspended: true }],
        deck: ["BT1-001"],
      },
      1: { deck: ["BT1-002", "BT1-003"] },
    });
    s.state.turnSeat = 1;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });
});
