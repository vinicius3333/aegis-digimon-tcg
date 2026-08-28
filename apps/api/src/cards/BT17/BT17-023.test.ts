import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT4/BT4-030.js";
import { compiled } from "./BT17-023.js";
import "./index.js";

describe("BT17-023", () => {
  it("can digivolve onto a yellow Tamer as level 3 and has Draw 1", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "Digivolve", asLevel: 3 }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      keywords: [{ keyword: "Draw", amount: 1 }],
    });
  });

  it("may digivolve while attacking into a Hybrid for 1 less", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "Digivolve", from: ["hand"], costDelta: -1, optional: true }],
    });
  });

  it("draws while attacking with 7 or fewer cards in hand as inherited", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "zoneCount", value: 7 } }],
    });
  });

  it("matches and executes only the printed yellow Tamer path", async () => {
    expect(matchingAlternateDigivolutionRequirement("BT17-023", "BT1-087")).toMatchObject({
      cost: 3,
      baseIsTamer: true,
    });
    expect(matchingAlternateDigivolutionRequirement("BT17-023", "BT1-086")).toBeUndefined();

    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-086", as: "blueTamer" },
          { card: "BT1-087", as: "yellowTamer" },
        ],
        hand: [{ card: "BT17-023", as: "kendo" }],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueTamer").permanentId,
        instanceId: s.inst("kendo").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowTamer").permanentId,
        instanceId: s.inst("kendo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowTamer").topCard?.cardId === "BT17-023");
    expect(s.state.memory).toBe(0);
  });

  it("draws from the attack trigger", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT17-023", as: "kendo" }], deck: ["BT1-009"] } },
      { autoDeclineOptional: true },
    );
    const before = s.state.players[0]!.hand.length;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("kendo"));
    expect(s.state.players[0]!.hand).toHaveLength(before + 1);
  });

  it("Q2769: digivolving with the 2nd [When Attacking] first loses the 1st one", async () => {
    // "They trigger simultaneously, so the turn player chooses the effect to activate first.
    // However, if you activate the 2nd [When Attacking] effect first and digivolve, the 1st
    // [When Attacking] can no longer be activated." (CR §15-4-4-3: digivolving makes the
    // attacker's top card a digivolution card, so its pending trigger belongs to a card that
    // is no longer what it was when the effect triggered.)
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-023", as: "kendo" }],
          hand: [{ card: "BT4-030", as: "beowolfmon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    const deckBefore = s.state.players[0]!.deck.length;

    const attacking = advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("kendo"));
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const orderDecision = s.state.pendingDecision!;
    const keys = s.decisions.find(({ req }) => req.decisionId === orderDecision.decisionId)!.req.options?.triggerKeys;
    expect(keys).toHaveLength(2);
    // Index 1 is the digivolve effect; index 0 is the ＜Draw 1＞ one.
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: orderDecision.decisionId,
        response: { kind: "orderTriggers", order: [keys![1]!] },
      }),
    ).toEqual({ ok: true });
    await attacking;

    expect(s.perm("kendo").topCard.cardId).toBe("BT4-030");
    // Only the digivolution bonus draw happened: the pending ＜Draw 1＞ never activated.
    expect(deckBefore - s.state.players[0]!.deck.length).toBe(1);
  });
});
