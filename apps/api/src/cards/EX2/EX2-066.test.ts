import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-066.js";

describe("EX2-066 Offensive Plug-In A", () => {
  it("gives one Digimon Security Attack +1 for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-008", as: "target", dp: 7000 }, "EX2-060"],
          hand: [{ card: "EX2-066", as: "option" }],
          deck: ["EX2-014"],
        },
        1: { security: ["BT1-001", "BT1-002"], deck: ["EX2-015"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter(({ kind }) => kind === "securityChecked").length === 2);
    expect(s.events.filter(({ kind }) => kind === "securityChecked")).toHaveLength(2);
    expect(s.perm("target").isSuspended).toBe(true);

    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("waives the red color requirement only while a Tamer is in play", async () => {
    const s = setupEngine({ 0: { battleArea: ["EX2-014"], hand: [{ card: "EX2-066", as: "option" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("waives the red color requirement with a Tamer even when no red card is in play", async () => {
    const s = setupEngine({
      0: { battleArea: ["EX2-014", "EX2-060"], hand: [{ card: "EX2-066", as: "option" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
  });

  it("reveals a Tamer, returns the other revealed cards to the bottom, then adds itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX2-066", as: "securityOption", faceUp: true }],
          deck: [{ card: "EX2-060", as: "revealedTamer" }, "EX2-014", "EX2-015"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("securityOption").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("securityOption").instanceId, s.inst("revealedTamer").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX2-014", "EX2-015"]);
  });
});
