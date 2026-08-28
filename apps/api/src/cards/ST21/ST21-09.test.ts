import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
describe("ST21-09", () => {
  it("suspends through 5000 DP and scales deck-bottom returns by Tamer colors", () => {
    const effects = runtimeCompiledCard("ST21-09")?.effects ?? [];
    const onPlay = effects.find((effect) => effect.trigger === "OnPlay");
    const suspend = onPlay?.actions[0];
    const returns = onPlay?.actions[1];
    expect(suspend?.kind).toBe("Suspend");
    expect(irNode(suspend)?.target.filter.dp).toEqual({ op: "lte", value: 5000 });
    expect(returns?.kind).toBe("Return");
    expect(irNode(returns)?.to).toBe("deckBottom");
    expect(returns?.scaling).toMatchObject({ per: 2, unit: "colors" });
  });

  it("keeps the mandatory Alliance condition, optional attack, and once-per-turn limit", () => {
    const effect = (runtimeCompiledCard("ST21-09")?.effects ?? []).find(
      (candidate) => candidate.trigger === "YourTurn",
    );
    expect(effect?.frequency).toBe("OncePerTurn");
    const [played, digivolved] = effect?.actions ?? [];
    for (const trigger of [played, digivolved]) {
      expect(irNode(trigger).sourceFilter.excludeSelf).toBe(true);
      expect(irNode(trigger).actions[0]!.condition).toMatchObject({ kind: "sourceHasTrait", trait: "ADVENTURE" });
      expect(irNode(trigger).actions[1]).toMatchObject({ kind: "Attack", optional: true });
    }
  });

  it("retains inherited Alliance and the ADVENTURE evolution requirement", () => {
    const card = runtimeCompiledCard("ST21-09");
    expect(
      card?.effects.some(
        (effect) => effect.isInherited && effect.keywords?.some((keyword) => keyword.keyword === "Alliance"),
      ),
    ).toBe(true);
    expect(card?.digivolutionRequirement).toEqual([{ level: 4, traits: ["ADVENTURE"], cost: 3, isAlternate: true }]);
  });
});
