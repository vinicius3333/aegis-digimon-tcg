import { EffectTiming, Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-096.js";

describe("BT1-096 Mad Dog Fire", () => {
  it("matches the catalog and preserves the ordered Security draw", () => {
    expect(getCardDefinition("BT1-096")).toMatchObject({
      cardId: "BT1-096",
      set: "BT1",
      nameEn: "Mad Dog Fire",
      colors: ["Blue"],
      kinds: ["Option"],
      playCost: 1,
      dp: 0,
      evoCosts: [],
      effectText: "[Main] 1 of your Digimon gets +3000 DP for the turn.",
      securityEffectText:
        "[Security] Trigger ＜Draw 1＞ (Draw 1 card from your deck). Then add this card to its owner's hand.",
      rarity: "R",
      maxCountInDeck: 4,
      imageId: "BT1-096",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "Main",
        actions: [
          expect.objectContaining({
            kind: "ModifyDP",
            amount: 3000,
            duration: "forTheTurn",
            target: expect.objectContaining({ count: 1 }),
          }),
        ],
      }),
      {
        trigger: "Security",
        actions: [{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "AddToHandSelf" }],
        isSecurity: true,
      },
    ]);
  });

  it("gives exactly 1 Digimon +3000 DP for the turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-028", as: "target", under: ["BT1-003"] },
            { card: "BT1-029", as: "other" },
          ],
          hand: [{ card: "BT1-096", as: "option" }],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    const otherBaseDP = s.perm("other").currentDP;
    s.state.memory = 1;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 6000);

    expect(s.state.memory).toBe(0);
    expect(s.perm("other").currentDP).toBe(otherBaseDP);
    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("targets a Digimon reached through hatch, legal digivolution, and move", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT1-003", as: "egg" }],
        hand: [
          { card: "BT1-028", as: "evolved" },
          { card: "BT1-096", as: "option" },
        ],
        deck: ["BT1-029", "BT1-029", "BT1-029", "BT1-029", "BT1-029", "BT1-029"],
      },
      1: { deck: ["BT1-012", "BT1-012", "BT1-012", "BT1-012", "BT1-012", "BT1-012"] },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-003");
    const permanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("evolved").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-028");
    expect(s.state.players[0]!.breeding!.stack.map(({ cardId }) => cardId)).toEqual(["BT1-003"]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ permanentId: id }) => id === permanentId));
    await advance(s.engine).waitForMainPhase(0);

    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.find(({ permanentId: id }) => id === permanentId)!.currentDP === 6000,
    );
    expect(s.state.memory).toBe(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("resolves without a target decision when the user controls no Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-086"],
        hand: [{ card: "BT1-096", as: "option" }],
      },
    });
    const optionId = s.inst("option").instanceId;
    s.state.memory = 1;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("draws 1, then adds itself to hand from security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT1-096", as: "securityOption", faceUp: true }],
        deck: [{ card: "BT1-029", as: "drawn" }],
      },
    });
    const optionId = s.inst("securityOption").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId, optionId]);
  });
});
