import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-063.js";
import "./index.js";

describe("BT20-063 Ghostmon", () => {
  it("reveals three and adds one Ghost and one LIBERATOR card, bottoming the rest", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { filter: { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] }, count: 1, to: "hand" },
            { filter: { nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] }, count: 1, to: "hand" },
          ],
        },
      ],
    });
  });

  it("inherits On Deletion gain 1 memory", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });

  it("publishes the printed stats and zero-cost purple evolution route", () => {
    expect(getCardDefinition("BT20-063")).toMatchObject({
      cardId: "BT20-063",
      nameEn: "Ghostmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Ghost", "LIBERATOR"],
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
    });
    expect(getCardDefinition("BT20-063")?.effectText).toContain("Reveal the top 3 cards");
    expect(getCardDefinition("BT20-063")?.effectText).toContain("Return the rest to the bottom of the deck");
    expect(getCardDefinition("BT20-063")?.inheritedEffectText).toBe("[On Deletion] Gain 1 memory.");
  });

  it("on play adds separate Ghost and LIBERATOR matches and bottoms the nonmatch", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-063", as: "ghostmon" }],
          deck: [
            { card: "BT20-062", as: "ghost" },
            { card: "BT20-090", as: "liberator" },
            { card: "BT20-047", as: "machine" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ghostmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT20-062", "BT20-090"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT20-047"]);
  });

  it("gains 1 memory only when Ghostmon is an inherited source of the deleted stack", async () => {
    for (const [under, expected] of [
      [true, -1],
      [false, 0],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [
            under
              ? { card: "BT20-068", under: ["BT20-063"], suspended: true, as: "subject" }
              : { card: "BT20-063", suspended: true, as: "subject" },
          ],
        },
        1: { battleArea: [{ card: "BT20-076", as: "attacker" }] },
      });
      s.state.memory = 0;
      const subjectId = s.perm("subject").permanentId;
      s.state.turnSeat = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: subjectId },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === subjectId) &&
          s.state.memory === expected,
      );
      expect(s.state.memory).toBe(expected);
    }
  });

  it("publicly builds a Yaamon-Ghostmon-Bakemon stack for inherited timing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-006", as: "yaamon" }],
        hand: [
          { card: "BT20-063", as: "ghostmon" },
          { card: "BT20-068", as: "bakemon" },
        ],
      },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yaamon").permanentId,
        instanceId: s.inst("ghostmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yaamon").topCard.cardId === "BT20-063");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yaamon").permanentId,
        instanceId: s.inst("bakemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yaamon").topCard.cardId === "BT20-068");
    expect(s.state.memory).toBe(0);
    expect(s.perm("yaamon").stack.map((card) => card.cardId)).toEqual(["EX7-006", "BT20-063"]);
  });

  it("bottoms all three revealed cards when neither Ghost nor LIBERATOR is present", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-063", as: "ghostmon" }],
          deck: ["BT20-047", "BT20-057", "BT20-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ghostmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 3 && s.state.players[0]!.hand.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT20-047", "BT20-057", "BT20-009"]);
  });
});

describe("BT20-063 Ghostmon — KB Q&A rulings", () => {
  type RecoveryChoice = "deletedBakemon" | "inheritedGhostmon" | "unrelatedGhost";

  async function resolveDemiMeramonRecoveryFirst(choice: RecoveryChoice) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT20-068",
              dp: 4000,
              as: "bakemon",
              under: [
                { card: "BT20-006", as: "demiMeramon" },
                { card: "BT20-063", as: "ghostmon" },
              ],
            },
          ],
          trash: [{ card: "BT20-062", as: "unrelatedGhost" }],
        },
        1: { battleArea: [{ card: "BT20-011", dp: 10000, suspended: true, as: "defender" }] },
      },
      { autoOrderTriggers: false, autoAcceptOptional: true, autoSelectCards: false },
    );
    const demiMeramonInstance = s.inst("demiMeramon").instanceId;
    const ghostmonInstance = s.inst("ghostmon").instanceId;
    const recoveredInstance = {
      deletedBakemon: s.perm("bakemon").topCard.instanceId,
      inheritedGhostmon: ghostmonInstance,
      unrelatedGhost: s.inst("unrelatedGhost").instanceId,
    }[choice];
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bakemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const order = s.decisions.findLast(({ req }) => req.kind === "orderTriggers")!.req;
    const triggerKeys = order.options!.triggerKeys!;
    expect(triggerKeys).toHaveLength(2);
    expect(triggerKeys.some((key) => key.includes(ghostmonInstance))).toBe(true);
    const demiMeramonKey = triggerKeys.find((key) => key.includes(demiMeramonInstance))!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderTriggers", order: [demiMeramonKey] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.decisions.findLast(({ req }) => req.kind === "selectCards")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [recoveredInstance] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([recoveredInstance]);
    return s;
  }

  it("cannot activate Ghostmon's pending inherited effect after the deleted Bakemon returns from trash to hand (Q4285)", async () => {
    const bakemonRecovered = await resolveDemiMeramonRecoveryFirst("deletedBakemon");
    expect(bakemonRecovered.state.memory).toBe(0);

    const unrelatedGhostRecovered = await resolveDemiMeramonRecoveryFirst("unrelatedGhost");
    expect(unrelatedGhostRecovered.state.memory).toBe(1);
  });

  it("still activates Ghostmon's inherited effect after Ghostmon itself returns from trash to hand (Q4286)", async () => {
    const s = await resolveDemiMeramonRecoveryFirst("inheritedGhostmon");
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT20-068");
  });
});
