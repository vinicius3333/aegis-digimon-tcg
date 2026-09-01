import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-010.js";
import "../index.js";

const CARD_ID = "BT26-010";

describe("BT26-010 Roleplaymon", () => {
  it("publishes Detach on Roleplaymon itself and does not treat its When Attacking effect as inherited", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "roleplay", linked: [{ card: "BT26-019", as: "sevenCodeLink" }] },
          { card: "BT21-009", as: "host", under: [{ card: CARD_ID, as: "sourceOnly" }] },
        ],
        hand: [{ card: "BT21-054", as: "eligibleCost" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("roleplay"), "Detach")).toBe(true);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("eligibleCost").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("uses the exact Appmon Lv.2 cost-0 evolution and rejects an off-color non-Appmon Lv.2", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 2,
      traits: ["Appmon"],
      cost: 0,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT21-001", as: "appmon" }],
        hand: [{ card: CARD_ID, as: "roleplay" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 0;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("appmon").permanentId,
        instanceId: legal.inst("roleplay").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("appmon").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-003", as: "plain" }], hand: [{ card: CARD_ID, as: "roleplay" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plain").permanentId,
        instanceId: illegal.inst("roleplay").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("links through the public action only to Appmon, pays 3, and grants Progress plus Piercing", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-009", as: "host" }], hand: [{ card: CARD_ID, as: "link" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    await settle(
      () => observe(s.engine).hasKeyword(s.perm("host"), "Progress") && observe(s.engine).hasPierce(s.perm("host")),
    );
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").linked[0]).toMatchObject({ instanceId: s.inst("link").instanceId, faceUp: true });
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Progress")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);

    const wrong = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "plain" }], hand: [{ card: CARD_ID, as: "link" }] },
    });
    wrong.state.memory = 3;
    expect(
      wrong.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: wrong.inst("link").instanceId,
        targetPermanentId: wrong.perm("plain").permanentId,
      }),
    ).toEqual(expect.objectContaining({ ok: false, reason: "link-requirement-unmet" }));
    expect(wrong.state.memory).toBe(3);
  });

  it("loses both linked keywords immediately when Roleplaymon leaves the link area (Q6964)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: CARD_ID, as: "link" }] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Progress")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    await advance(s.engine).verb.trash([s.inst("link").instanceId]);
    await advance(s.engine).recompute();
    expect(s.perm("host").linked).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Progress")).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);
  });

  it("when attacking trashes an eligible Game card, then draws exactly 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "roleplay", under: [{ card: "BT21-005", as: "appmonEgg" }] }],
          hand: [{ card: "BT21-054", as: "cost" }],
          deck: [
            { card: "BT1-009", as: "one" },
            { card: "BT1-010", as: "two" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("roleplay").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("one").instanceId,
      s.inst("two").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it.each([
    ["Open", "BT26-086"],
    ["Seven Code", "BT26-019"],
  ])("accepts the %s trait as the attack cost", async (_trait, costCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "roleplay" }],
          hand: [{ card: costCard, as: "cost" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("roleplay"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not trash or draw when the hand has no Game, Open, or Seven Code card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "roleplay" }],
          hand: [{ card: "BT1-009", as: "unrelated" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("roleplay"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("unrelated").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("may decline the optional attack payment without trashing or drawing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "roleplay" }],
          hand: [{ card: "BT21-054", as: "eligibleCost" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("roleplay"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("eligibleCost").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("encodes the exact hand cost, inherited draw, and linked keywords", () => {
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Detach" }] },
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "Draw",
            amount: 2,
            optional: true,
            cost: { kind: "trash", target: { filter: { zone: "hand" }, count: 1 } },
          },
        ],
      },
      { trigger: "Static", isLinked: true, keywords: [{ keyword: "Progress" }, { keyword: "Piercing" }] },
    ]);
  });

  it("Q6964: Detach saves only the tied attacker and removes linked Piercing before the opponent is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-019", as: "attacker", dp: 4000, linked: [{ card: CARD_ID, as: "piercingLink" }] }],
        },
        1: {
          battleArea: [{ card: "BT26-019", as: "defender", dp: 4000, suspended: true }],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    const defenderId = s.perm("defender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === defenderId));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("attacker").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("piercingLink").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("declining Detach in an equal-DP battle deletes both Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-019", as: "attacker", dp: 4000, linked: [{ card: CARD_ID }] }] },
      1: { battleArea: [{ card: "BT26-019", as: "defender", dp: 4000, suspended: true }] },
    });
    const attackerId = s.perm("attacker").permanentId;
    const defenderId = s.perm("defender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
  });

  it("an equal-DP battle offers each eligible loser its own Detach and both can survive", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-019", as: "attacker", dp: 4000, linked: [{ card: CARD_ID }] }] },
        1: {
          battleArea: [{ card: "BT26-019", as: "defender", dp: 4000, suspended: true, linked: [{ card: CARD_ID }] }],
        },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").linked.length === 0 && s.perm("defender").linked.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(2);
  });

  it("does not offer Detach for a linked card without the noted Seven Code trait", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-019", as: "attacker", dp: 4000, linked: [{ card: "BT21-009" }] }] },
      1: { battleArea: [{ card: "BT26-019", as: "defender", dp: 4000, suspended: true }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
  });

  it("never offers battle-only Detach for deletion by an effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-019", as: "target", linked: [{ card: CARD_ID }] }] },
    });
    expect(await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
  });
});
