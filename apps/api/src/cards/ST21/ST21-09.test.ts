import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-09", () => {
  it("suspends through 5000 DP and scales deck-bottom returns by Tamer colors", () => {
    const effects = runtimeCompiledCard("ST21-09")?.effects ?? [];
    const onPlay = effects.find((effect) => effect.trigger === "OnPlay");
    const suspend = onPlay?.actions[0];
    const returns = onPlay?.actions[1];
    expect(suspend?.kind).toBe("Suspend");
    expect(suspend?.target.filter.dp).toEqual({ op: "lte", value: 5000 });
    expect(returns?.kind).toBe("Return");
    expect(returns?.to).toBe("deckBottom");
    expect(returns?.scaling).toMatchObject({ per: 2, unit: "colors" });
  });

  it("keeps the mandatory Alliance condition, optional attack, and once-per-turn limit", () => {
    const effect = (runtimeCompiledCard("ST21-09")?.effects ?? []).find(
      (candidate) => candidate.trigger === "YourTurn",
    );
    expect(effect?.frequency).toBe("OncePerTurn");
    const [played, digivolved] = effect?.actions ?? [];
    for (const trigger of [played, digivolved]) {
      expect(trigger.sourceFilter.excludeSelf).toBe(true);
      expect(trigger.actions[0].condition).toMatchObject({ kind: "sourceHasTrait", trait: "ADVENTURE" });
      expect(trigger.actions[1]).toMatchObject({ kind: "Attack", optional: true });
    }
  });

  it("retains inherited Alliance and the ADVENTURE evolution requirement", () => {
    const card = runtimeCompiledCard("ST21-09");
    expect(card?.effects.some((effect) => effect.isInherited && effect.keywords?.some((keyword) => keyword.keyword === "Alliance"))).toBe(true);
    expect(card?.digivolutionRequirement).toEqual([{ level: 4, traits: ["ADVENTURE"], cost: 3, isAlternate: true }]);
  });

  it("suspends and bottoms one 5000-DP Digimon for two Tamer colors", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "ST21-09", as: "lillymon" }], battleArea: [{ card: "ST21-13", as: "mattTk" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }, { card: "BT1-010", as: "safe", dp: 7000 }], deck: ["BT1-003"] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lillymon").instanceId })).toEqual({ ok: true });
    await settle(() => (s.state.players[1] as PlayerState).deck.some((card) => card.cardId === "BT1-009"));

    expect((s.state.players[1] as PlayerState).deck.at(-1)?.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(true);
  });
});
