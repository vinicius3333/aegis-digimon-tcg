import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-060.js";
import "./index.js";

describe("BT17-060 Armageddemon", () => {
  it("reduces hand play cost by one per eligible trash card, up to thirteen", () => {
    const replacement = compiled.effects.find((entry) => entry.actions[0]?.kind === "Replacement")?.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { controllerDefault: "mine", isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          mode: "reduceCost",
          amount: 1,
          amountFromPaidCost: true,
          cost: { kind: "return", to: "deckBottom", target: { count: 13, upTo: true, from: ["trash"] } },
          scaling: { per: 1, unit: "cards" },
        },
      ],
    });
    if (replacement?.kind !== "Replacement") throw new Error("expected the outer play replacement");
    const reduction = replacement.actions?.[0];
    if (reduction?.kind !== "Replacement" || reduction.cost?.kind !== "return" || reduction.cost.target === undefined) {
      throw new Error("expected the nested return-cost reduction");
    }
    const trashFilter = reduction.cost.target.filter;
    expect(trashFilter?.nameOrTrait?.[1]).toMatchObject({ tokens: ["Diaboromon"], match: "text", orPrevious: true });
  });

  it("has Rush, Blocker, Reboot, budget-15 deletion, and unsuspended attack permission", () => {
    expect(
      compiled.effects
        .filter((entry) => entry.keywords?.length === 1)
        .flatMap((entry) => entry.keywords?.map((k) => k.keyword)),
    ).toEqual(["Rush", "Blocker", "Reboot"]);
    expect(
      compiled.effects
        .filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger))
        .map((entry) => entry.actions[0]),
    ).toEqual([
      expect.objectContaining({ kind: "DeleteBudget", budget: 15, upTo: true }),
      expect.objectContaining({ kind: "DeleteBudget", budget: 15, upTo: true }),
    ]);
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "GrantCanAttackUnsuspended",
    });
  });

  it("deletes budget 15, gains its keywords, and attacks unsuspended", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-060", as: "armageddemon" }],
          trash: [
            { card: "BT17-053", as: "costOne" },
            { card: "BT17-055", as: "costTwo" },
            { card: "BT17-059", as: "costThree" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT17-056", as: "costSeven" },
            { card: "BT17-049", as: "costEight" },
            { card: "BT17-060", as: "unsuspendedTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 16;
    const reducedCardIds = [s.inst("costOne").instanceId, s.inst("costTwo").instanceId, s.inst("costThree").instanceId];
    const unsuspendedTargetId = s.perm("unsuspendedTarget").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armageddemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) =>
          ["BT17-056", "BT17-049"].includes(permanent.topCard?.cardId ?? ""),
        ),
    );

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.some((card) => reducedCardIds.includes(card.instanceId))).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => reducedCardIds.includes(card.instanceId))).toBe(true);
    const armageddemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT17-060")!;
    expect(observe(s.engine).hasKeyword(armageddemon, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(armageddemon, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(armageddemon, "Reboot")).toBe(true);

    // Budget 15 exactly: the two 7+8 cost Digimon went, the 16-cost one is out of budget.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([unsuspendedTargetId]);

    // [Your Turn] permission plus ＜Rush＞: it attacks an UNSUSPENDED Digimon the turn it was played.
    expect(s.perm("unsuspendedTarget").isSuspended ?? false).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: armageddemon.permanentId,
        target: { kind: "permanent", permanentId: unsuspendedTargetId },
      }),
    ).toEqual({ ok: true });
    // The defender itself has ＜Blocker＞, so the defending seat's block window must be answered.
    await drainMicrotasks(50);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    // Both are 15000 DP Armageddemon, so the battle deletes attacker and defender alike.
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT17-060")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-060")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("respects the 15 budget when the opponent's Digimon cannot all fit, on [When Digivolving]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-058", as: "source" }],
          hand: [
            { card: "BT17-060", as: "armageddemon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [{ card: "BT1-012", as: "bonusDraw" }],
        },
        1: {
          battleArea: [
            { card: "BT17-056", as: "costSeven" },
            { card: "BT17-057", as: "costTwelve" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("armageddemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    // 7 + 12 = 19 exceeds the budget, so exactly one of them survives.
    const remaining = s.state.players[1]!.battleArea;
    expect(remaining).toHaveLength(1);
    const deletedCost = getCardDefinition(
      remaining[0]!.topCard?.cardId === "BT17-056" ? "BT17-057" : "BT17-056",
    )!.playCost!;
    expect(deletedCost).toBeLessThanOrEqual(15);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("matches the catalog printed text, colours and evolution costs", () => {
    const definition = getCardDefinition("BT17-060")!;
    expect(definition).toMatchObject({
      nameEn: "Armageddemon",
      level: 7,
      colors: ["Black", "White"],
      types: ["Unidentified"],
      playCost: 16,
      dp: 15_000,
      evoCosts: [
        { color: "Black", level: 6, memoryCost: 7 },
        { color: "White", level: 6, memoryCost: 7 },
      ],
    });
    expect(definition.effectText).toContain(
      "When you would play this card from the hand, by placing up to 13 cards with the [Unidentified]\u00a0trait or [Diaboromon]\u00a0in its text from your trash at the bottom of your deck, reduce the cost by 1 for each card.",
    );
    expect(definition.effectText).toContain("[Your Turn] This Digimon can attack your opponent's unsuspended Digimon.");
    expect(definition.inheritedEffectText).toBeUndefined();
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("counts only the eligible trash cards and leaves an ineligible peer behind", async () => {
    // Comparative filter case: BT17-053 Keramon has the [Unidentified] trait, BT17-100
    // Doomsday Clock has [Diaboromon] in its text only, and BT1-009 Monodramon has
    // neither, so exactly two reductions are available (16 -> 14).
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-060", as: "armageddemon" }],
          trash: [
            { card: "BT17-053", as: "byTrait" },
            { card: "BT17-100", as: "byText" },
            { card: "BT1-009", as: "ineligible" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 16;
    await s.ready();
    const eligibleIds = [s.inst("byTrait").instanceId, s.inst("byText").instanceId];
    const ineligibleId = s.inst("ineligible").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armageddemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-060"));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([ineligibleId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId).sort()).toEqual([...eligibleIds].sort());
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
