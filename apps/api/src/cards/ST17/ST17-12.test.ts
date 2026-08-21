import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST17-12.js";

describe("ST17-12 Giant Missile", () => {
  it("suspends and bottoms one opposing Digimon, then restricts the remaining Digimon from unsuspending", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-03" }], hand: [{ card: "ST17-12", as: "missile" }] },
      1: { battleArea: [{ card: "BT1-009", as: "bottomed", suspended: true }, { card: "BT1-010", as: "restricted" }] },
    });
    await s.ready();
    s.state.memory = 10;
    const opponentDeckSize = s.state.players[1]!.deck.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("missile").instanceId, useAs: "option" } as never)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    let decision = s.state.pendingDecision!;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("restricted").permanentId] },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    decision = s.state.pendingDecision!;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("bottomed").permanentId] },
    })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.deck.length > opponentDeckSize &&
        s.state.players[1]!.battleArea.length === 1 &&
        observe(s.engine).isRestricted(s.perm("restricted"), "unsuspend"),
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-010");
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-009");
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "unsuspend")).toBe(true);
  });

  it("activates its Main effect from Security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-03" }], security: [{ card: "ST17-12", as: "missile", faceUp: true }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("missile"));

    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === s.perm("target").permanentId)).toBe(false);
    expect(s.state.players[1]!.deck.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
