import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
describe("ST21-14", () => {
  it("reveals three, adds one ADVENTURE card, bottoms the rest, and places itself", () => {
    const main = (runtimeCompiledCard("ST21-14")?.effects ?? []).find((effect) => effect.trigger === "Main");
    expect(main?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(main?.actions[0].add[0].filter.nameOrTrait).toEqual([{ tokens: ["ADVENTURE"], match: "trait" }]);
    expect(main?.actions[1]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
  });
  it("keeps Delay memory and security placement", () => {
    const effects = runtimeCompiledCard("ST21-14")?.effects ?? [];
    expect(effects.some((effect) => effect.keywords?.some((keyword) => keyword.keyword === "Delay"))).toBe(true);
    expect(effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
  });

  it("reveals three cards, adds an ADVENTURE card, and places itself in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST21-13", as: "adventureTamer" }],
        hand: [{ card: "ST21-14", as: "option" }],
        deck: ["ST21-10", "BT1-009", "BT1-045"],
      },
      1: { security: ["BT1-003"] },
    }, { autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST21-14"));
    const hand = s.state.players[0]!.hand;
    expect(hand.filter((card) => card.cardId === "ST21-10")).toHaveLength(1);
    expect(hand.filter((card) => card.cardId === "ST21-10")).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-045"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST21-14")).toBe(true);
  });

  it("activates Delay on a later turn, gains two memory, and trashes itself", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST21-13", as: "adventureTamer" }],
        hand: [{ card: "ST21-14", as: "option" }],
        deck: ["ST21-10", "BT1-009", "BT1-045"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST21-14"));
    const option = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "ST21-14")!;
    s.state.turnCount += 1;
    const [delay] = observe(s.engine).activatableEffects(option) as { effectKey: string; description: string }[];
    expect(delay).toBeDefined();
    expect(delay.description).toContain("Gain 2 memory");
    const memoryBeforeDelay = s.state.memory;
    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: option.topCard!.instanceId,
      effectKey: delay.effectKey,
    })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST21-14")).toBe(false);
    expect(s.state.memory).toBe(memoryBeforeDelay + 2);
  });
});
