import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-015.js";
import "../BT12/BT12-088.js";
import "../BT17/BT17-011.js";
import "../BT2/BT2-105.js";
import "./BT5-094.js";

describe("BT5-094 Rowdy Rocker", () => {
  it("may place a red level 4-or-lower hand card as the bottom source, then draws 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-007", as: "host", under: [{ card: "BT5-093", as: "tamerSource" }] }],
          hand: [
            { card: "BT5-094", as: "option" },
            { card: "BT5-012", as: "material" },
          ],
          deck: [
            { card: "BT5-002", as: "draw1" },
            { card: "BT5-003", as: "draw2" },
          ],
        },
        1: { battleArea: [{ card: "BT5-007", as: "opponentHost" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.length === 2 && s.state.players[0]!.hand.length === 2);
    expect(s.perm("host").stack[0]!.instanceId).toBe(s.inst("material").instanceId);
    expect(s.perm("host").stack[1]!.instanceId).toBe(s.inst("tamerSource").instanceId);
    expect(s.perm("opponentHost").stack).toHaveLength(0);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("draw1").instanceId, s.inst("draw2").instanceId]),
    );
  });

  it("does not draw when no qualifying red card is in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-007", as: "host" }],
          hand: [
            { card: "BT5-094", as: "option" },
            { card: "BT5-071", as: "wrongColor" },
            { card: "BT5-013", as: "tooHigh" },
          ],
          deck: ["BT5-002", "BT5-003"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("wrongColor").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tooHigh").instanceId)).toBe(true);
  });

  it("may decline placement even when a legal card and host exist", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-007", as: "host" }],
          hand: [
            { card: "BT5-094", as: "option" },
            { card: "BT5-012", as: "material" },
          ],
          deck: ["BT5-002", "BT5-003"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-094", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });
});

describe("BT5-094 Rowdy Rocker — KB Q&A rulings", () => {
  const TAKUYA = "BT12-088";
  const AGUNIMON = "BT17-011";
  const GREYMON = "BT1-015";
  // Agunimon 5000 + Greymon's and Takuya's inherited [Your Turn] +2000 each.
  const AGUNIMON_WITH_BOTH_INHERITED_DP = 9000;

  const setupTamerHost = (extraHand: { card: string; as: string }[] = []) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAKUYA, as: "host" }],
          hand: [
            { card: AGUNIMON, as: "agunimon" },
            { card: "BT5-094", as: "option" },
            { card: GREYMON, as: "greymon" },
            ...extraHand,
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: [{ card: "BT2-105", as: "spiderShooter", faceUp: true }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    return s;
  };

  const digivolveOntoTamer = async (s: ReturnType<typeof setupTamerHost>, alias: string) => {
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst(alias).instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === s.inst(alias).instanceId);
  };

  const placeGreymonUnderHost = async (s: ReturnType<typeof setupTamerHost>) => {
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("greymon").instanceId));
  };

  it("places a red level 4 or lower card under a Digimon that digivolved from a Tamer (Q1371)", async () => {
    const control = setupTamerHost();
    const controlDeckSize = control.state.players[0]!.deck.length;
    expect(control.engine.applyIntent(0, { type: "playCard", instanceId: control.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => control.state.players[0]!.trash.some(({ cardId }) => cardId === "BT5-094"));
    expect(control.perm("host").stack).toHaveLength(0);
    expect(control.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      control.inst("greymon").instanceId,
    );
    expect(control.state.players[0]!.deck).toHaveLength(controlDeckSize);

    const s = setupTamerHost();
    await digivolveOntoTamer(s, "agunimon");
    const takuyaInstanceId = s.perm("host").stack[0]!.instanceId;
    const deckSizeBeforeOption = s.state.players[0]!.deck.length;
    await placeGreymonUnderHost(s);
    await settle(() => s.state.players[0]!.deck.length === deckSizeBeforeOption - 2);

    expect(s.perm("host").topCard?.cardId).toBe(AGUNIMON);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("greymon").instanceId,
      takuyaInstanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(deckSizeBeforeOption - 2);
  });

  it("keeps the placed card stacked under a de-digivolved Tamer without its inherited effect until it digivolves again (Q1372)", async () => {
    const s = setupTamerHost([{ card: AGUNIMON, as: "agunimonAgain" }]);
    await digivolveOntoTamer(s, "agunimon");
    await placeGreymonUnderHost(s);
    await settle(() => s.perm("host").currentDP === AGUNIMON_WITH_BOTH_INHERITED_DP);
    expect(observe(s.engine).canUseInheritedEffect(s.perm("host"), GREYMON)).toBe(true);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("spiderShooter"));
    await settle(() => s.perm("host").topCard?.cardId === TAKUYA);

    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("greymon").instanceId]);
    expect(observe(s.engine).canUseInheritedEffect(s.perm("host"), GREYMON)).toBe(false);
    expect(s.perm("host").currentDP).toBe(0);

    await digivolveOntoTamer(s, "agunimonAgain");
    await settle(() => s.perm("host").currentDP === AGUNIMON_WITH_BOTH_INHERITED_DP);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual([GREYMON, TAKUYA]);
    expect(observe(s.engine).canUseInheritedEffect(s.perm("host"), GREYMON)).toBe(true);
    expect(s.perm("host").currentDP).toBe(AGUNIMON_WITH_BOTH_INHERITED_DP);
  });
});
