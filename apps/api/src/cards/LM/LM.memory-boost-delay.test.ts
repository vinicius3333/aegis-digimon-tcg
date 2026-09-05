import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";

const boosts = [
  ["LM-033", "BT1-009"],
  ["LM-034", "BT1-027"],
  ["LM-035", "BT1-045"],
  ["LM-036", "BT1-064"],
  ["LM-037", "BT2-052"],
  ["LM-038", "ST6-03"],
  ["LM-045", "BT1-009"],
  ["LM-046", "BT1-027"],
  ["LM-047", "BT1-045"],
  ["LM-048", "BT1-064"],
  ["LM-049", "BT2-052"],
  ["LM-050", "ST6-03"],
  ["LM-051", "BT1-009"],
  ["LM-052", "BT1-027"],
  ["LM-053", "BT2-052"],
] as const;

describe.each(boosts)("%s Memory Boost Delay", (cardId, colorSource) => {
  it("trashes the established Option to gain exactly two memory and cannot reuse it", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "boost" }] } });
    s.state.turnCount = 1;
    s.state.memory = 0;
    await s.ready();
    const sourceInstanceId = s.inst("boost").instanceId;
    const abilities = observe(s.engine).activatableEffects(s.perm("boost"));
    expect(abilities).toHaveLength(1);
    const intent = { type: "activateEffect" as const, sourceInstanceId, effectKey: abilities[0]!.effectKey };
    expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
    expect(s.engine.applyIntent(0, intent).ok).toBe(false);
    await settle();
    expect(s.state.memory).toBe(2);
  });

  it("does not offer Delay on the turn its Main effect places it", async () => {
    const s = setupEngine(
      { 0: { battleArea: [colorSource], hand: [{ card: cardId, as: "boost" }], deck: [colorSource] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("boost").instanceId })).toEqual({ ok: true });
    await settle();
    const placed = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("boost").instanceId,
    );
    expect(placed).toBeDefined();
    expect(placed!.enterFieldTurnCount).toBe(s.state.turnCount);
    expect(observe(s.engine).activatableEffects(placed!)).toEqual([]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("boost").instanceId)).toBe(false);
  });
});
