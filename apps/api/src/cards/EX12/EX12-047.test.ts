import { EffectTiming, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-047 Amaterasumon", () => {
  it("deletes the lowest-DP Digimon, returns exactly two trash cards, and uses their distinct colors", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-047", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", dp: 1000 },
            { card: "BT1-021", as: "target", dp: 15000 },
          ],
          trash: ["BT1-010", "BT1-027"],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("source").currentDP === 18000 && s.perm("target").currentDP === 5000);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.perm("source").currentDP).toBe(18000);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.deck).toHaveLength(3);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-001", "BT1-010", "BT1-027"]),
    );
  });

  it("does not apply the follow-up buffs when two opponent trash cards are unavailable", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-047", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", dp: 1000 },
            { card: "BT1-021", as: "target", dp: 15000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("source").currentDP).toBe(12000);
    expect(s.perm("target").currentDP).toBe(15000);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("returns a TB card and plays a level-5-or-lower TB Digimon after deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-047", as: "source" }],
          trash: [{ card: "EX12-009", as: "recovered" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );

    await s.ready();
    const deleting = advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision;
    expect(pending?.kind).toBe("orderTriggers");
    const request = s.decisions.find(({ req }) => req.decisionId === pending?.decisionId)?.req;
    const triggerKeys = request?.options?.triggerKeys ?? [];
    const onDeletionKey = triggerKeys.find((key) => key.startsWith("on-deletion/"));
    expect(onDeletionKey).toBeDefined();
    expect(
      s.engine.applyIntent(request!.seat, {
        type: "respondDecision",
        decisionId: request!.decisionId,
        response: { kind: "orderTriggers", order: [onDeletionKey!] },
      } as never),
    ).toEqual({ ok: true });
    await deleting;
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-009"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-009")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(false);
  });

  it("maps the catalog, keyword, evolution, trash-color seam, timing, and deletion clauses", () => {
    const card = getCardDefinition("EX12-047");
    const compiled = registeredCompiledCards.get("EX12-047")!;
    const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay")!;
    const onDeletion = compiled.effects.find((effect) => effect.trigger === "OnDeletion")!;
    const keywords = compiled.effects.flatMap((effect) => effect.keywords ?? []).map((keyword) => keyword.keyword);

    expect(card?.effectText).toContain("returning 2 cards from their trash");
    expect(keywords).toEqual(expect.arrayContaining(["Piercing", "SecurityAttack", "Ascension"]));
    expect(digivolutionRequirementsFor("EX12-047")).toEqual([
      { level: 5, traits: ["Shambala"], cost: 3, isAlternate: true },
    ]);
    expect(onPlay.actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: 6000,
      cost: {
        kind: "return",
        target: { filter: { zone: "trash", controller: "opponent" }, count: 2 },
        trackColors: "returnedCardColors",
      },
    });
    expect(onPlay.actions[2]).toMatchObject({
      kind: "ModifyDP",
      amount: -5000,
      scaling: { unit: "namedCount", countSource: "returnedCardColors" },
    });
    expect(onDeletion.actions[0]).toMatchObject({
      kind: "Return",
      target: { filter: { zone: "trash", controller: "mine" } },
      to: "hand",
      optional: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
