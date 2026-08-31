import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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

  it("suspends through the 5000-DP boundary and deck-bottoms one target for two Tamer colors", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["ST21-12"], hand: [{ card: "ST21-09", as: "lillymon" }] },
        1: {
          battleArea: [
            { card: "BT1-019", as: "boundary", dp: 5000 },
            { card: "BT1-021", as: "above", dp: 7000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const boundaryId = s.perm("boundary").topCard.instanceId;
    const aboveId = s.perm("above").permanentId;
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lillymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck.some(({ instanceId }) => instanceId === boundaryId));

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === aboveId)).toBe(true);
    expect(s.perm("above").isSuspended).toBe(false);
  });
});
