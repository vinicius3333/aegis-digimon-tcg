import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-016.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-016", () => {
  it("has Training and inherits Jamming", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Jamming",
      raw: "＜Jamming＞",
    });
  });

  it("uses Training to place the deck top face-down at the bottom of its stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-016", as: "source", under: ["EX9-002"] }], deck: ["BT1-001", "BT1-002"] },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const source = s.perm("source");
    const entry = observe(s.engine)
      .activatableEffects(source)
      .find(({ instanceId }) => instanceId === source.topCard.instanceId);
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.topCard.instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => source.stack.length === 2 && s.state.players[0]!.deck.length === 1);

    expect(source.isSuspended).toBe(true);
    expect(source.stack.map((card) => card.cardId)).toEqual(["BT1-001", "EX9-002"]);
    expect(source.stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-002"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([true, false])("survives a losing security battle only with inherited Jamming: %s", async (inherited) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-037", as: "source", under: inherited ? ["EX9-016"] : [] }] },
        1: { security: ["ST1-10"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const source = s.perm("source");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: source.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === source.permanentId)).toBe(
      inherited,
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX9-016")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["EX9-001", "BT1-001"])("checks the off-color DM alternate route from %s", async (egg) => {
    const s = setupEngine({
      0: { breeding: { card: egg, as: "base" }, hand: [{ card: "EX9-016", as: "evo" }], deck: ["BT1-009"] },
    });
    s.state.memory = 3;
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evo").instanceId,
      useAlternateCost: true,
    });
    const legal = egg === "EX9-001";
    expect(result).toEqual(legal ? { ok: true } : { ok: false, reason: "invalid-evolution" });
    await settle();
    expect(s.perm("base").topCard.cardId).toBe(legal ? "EX9-016" : egg);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(legal ? [egg] : []);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(legal ? ["BT1-009"] : ["EX9-016"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
