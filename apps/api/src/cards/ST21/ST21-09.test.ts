import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
describe("ST21-09", () => {
  it.each([
    ["ST21-07", true],
    ["BT1-010", false],
  ] as const)("gates Alliance on played card %s while allowing attack refusal", async (cardId, grantsAlliance) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST21-09", as: "source" }], hand: [{ card: cardId, as: "played" }] },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST21-09") &&
        s.state.pendingDecision === undefined,
    );
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(grantsAlliance);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
  });

  it("grants Alliance after another Digimon evolves into ADVENTURE while the optional attack is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST21-09", as: "source" },
            { card: "ST21-07", as: "base" },
          ],
          hand: [{ card: "ST21-08", as: "next" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("next").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("base").topCard.instanceId === s.inst("next").instanceId && s.state.pendingDecision === undefined,
    );
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(true);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
  });
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
      expect(irNode(trigger).actions[0]!.condition).toMatchObject({
        kind: "triggerSubjectMatchesFilter",
        filter: { nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }] },
      });
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
