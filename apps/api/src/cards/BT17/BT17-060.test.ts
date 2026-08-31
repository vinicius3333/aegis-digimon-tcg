import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-060.js";
import "./index.js";

describe("BT17-060 Armageddemon", () => {
  it("reduces hand play cost by one per eligible trash card, up to thirteen", () => {
    const replacement = compiled.effects.find((entry) => entry.actions[0]?.kind === "Replacement")?.actions[0] as any;
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
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
    const trashFilter = replacement.actions?.[0]?.cost?.target?.filter;
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

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: armageddemon.permanentId,
        target: { kind: "permanent", permanentId: unsuspendedTargetId },
      }),
    ).toEqual({ ok: true });
  });
});
