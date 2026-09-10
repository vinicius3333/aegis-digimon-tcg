import { EffectTiming, Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT1-093.js";

describe("BT1-093 Great Tornado", () => {
  it("matches the catalog and its two exact IR clauses", () => {
    expect(getCardDefinition("BT1-093")).toMatchObject({
      cardId: "BT1-093",
      set: "BT1",
      nameEn: "Great Tornado",
      colors: ["Red"],
      kinds: ["Option"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      effectText:
        "[Main] 1 of your Digimon gets +2000 DP and ＜Security Attack +1＞ (This Digimon checks 1 additional security card) for the turn.",
      securityEffectText: "[Security] Add this card to its owner's hand.",
      rarity: "C",
      maxCountInDeck: 4,
      imageId: "BT1-093",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "Main",
        actions: [
          expect.objectContaining({ kind: "ModifyDP", amount: 2000, duration: "forTheTurn" }),
          expect.objectContaining({
            kind: "GainKeyword",
            keyword: { keyword: "SecurityAttack", amount: 1 },
            duration: "forTheTurn",
            target: expect.objectContaining({ sameTarget: true }),
          }),
        ],
      }),
      expect.objectContaining({ trigger: "Security", isSecurity: true, actions: [{ kind: "AddToHandSelf" }] }),
    ]);
  });

  it("gives the same Digimon +2000 DP and Security Attack +1", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "chosen", under: ["BT1-001"] },
            { card: "BT1-011", as: "other" },
          ],
          hand: [{ card: "BT1-093", as: "option" }],
          deck: ["BT1-010"],
        },
        1: { security: ["BT1-009", "BT1-012"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard.instanceId);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("chosen"), "SecurityAttack"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("chosen").currentDP).toBe(4000);
    expect(s.perm("other").currentDP).toBe(1000);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "SecurityAttack")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("chosen").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    await advance(s.engine).runTurn(0);

    expect(s.perm("chosen").currentDP).toBe(2000);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "SecurityAttack")).toBe(false);
  });

  it("targets a Digimon reached through hatch, legal digivolution, and move", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT1-001", as: "egg" }],
        hand: [
          { card: "BT1-010", as: "evolved" },
          { card: "BT1-093", as: "option" },
        ],
        deck: ["BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011"],
      },
      1: { deck: ["BT1-012", "BT1-012", "BT1-012", "BT1-012", "BT1-012", "BT1-012"] },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-001");
    const permanentId = s.state.players[0]!.breeding!.permanentId;
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("evolved").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-010");
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ permanentId: id }) => id === permanentId));
    await advance(s.engine).waitForMainPhase(0);

    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(permanentId, "SecurityAttack"));
    expect(s.state.players[0]!.battleArea.find(({ permanentId: id }) => id === permanentId)!.currentDP).toBe(4000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("resolves without a target decision when the user controls no Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-085"],
        hand: [{ card: "BT1-093", as: "option" }],
      },
    });
    const optionId = s.inst("option").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("adds itself from security to its owner's hand", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT1-093", as: "securityOption", faceUp: true }] } });
    const instanceId = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === instanceId)).toBe(true);
  });
});
