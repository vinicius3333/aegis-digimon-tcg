import { EffectDuration, EffectTiming, Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-072.js";
import { compiled } from "./BT1-094.js";
describe("BT1-094 Oblivion Bird", () => {
  it("matches the catalog and preserves the Main activation in Security", () => {
    expect(getCardDefinition("BT1-094")).toMatchObject({
      cardId: "BT1-094",
      set: "BT1",
      nameEn: "Oblivion Bird",
      colors: ["Red"],
      kinds: ["Option"],
      playCost: 5,
      dp: 0,
      evoCosts: [],
      effectText: "[Main] Delete 1 of your opponent's Digimon with ＜Blocker＞.",
      securityEffectText: "[Security] Activate this card's [Main] effect.",
      rarity: "C",
      maxCountInDeck: 4,
      imageId: "BT1-094",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({ trigger: "Main", actions: [expect.objectContaining({ kind: "Delete" })] }),
      { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
    ]);
  });

  it("deletes only an opposing Digimon with Blocker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-072", as: "ownBlocker" }, "BT1-010"],
          hand: [{ card: "BT1-094", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-072", as: "opposingBlocker", under: ["BT1-066"] },
            { card: "BT1-071", as: "nonBlocker" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const opposingBlockerId = s.perm("opposingBlocker").permanentId;
    const nonBlockerId = s.perm("nonBlocker").permanentId;
    const ownBlockerId = s.perm("ownBlocker").permanentId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((entry) => entry.permanentId === opposingBlockerId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.some((entry) => entry.permanentId === nonBlockerId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((entry) => entry.permanentId === ownBlockerId)).toBe(true);
  });

  it("exercises the Option after hatch, two legal digivolutions, and move", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT1-007", as: "egg" }],
        battleArea: ["BT1-010"],
        hand: [
          { card: "BT1-066", as: "level3" },
          { card: "BT1-072", as: "evolvedBlocker" },
          { card: "BT1-094", as: "option" },
        ],
        deck: ["BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011"],
      },
      1: {
        battleArea: [{ card: "BT1-072", as: "target" }],
        deck: ["BT1-012", "BT1-012", "BT1-012", "BT1-012", "BT1-012", "BT1-012"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-007");
    const permanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("level3").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-066");
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("evolvedBlocker").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-072");
    expect(s.state.players[0]!.breeding!.stack.map(({ cardId }) => cardId)).toEqual(["BT1-007", "BT1-066"]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ permanentId: id }) => id === permanentId));
    await advance(s.engine).waitForMainPhase(0);

    s.state.memory = 5;
    const targetId = s.perm("target").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId: id }) => id === targetId));
    expect(s.state.memory).toBe(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("deletes a Digimon that received Blocker from an Option effect (Q962)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-010"], hand: [{ card: "BT1-094", as: "oblivionBird" }] },
        1: { battleArea: [{ card: "BT1-071", as: "grantedBlocker", suspended: true }] },
      },
      { autoSelectCards: true },
    );

    const grantedBlockerId = s.perm("grantedBlocker").permanentId;
    advance(s.engine).ledgers.continuous.addKeywordGrant(grantedBlockerId, "Blocker", EffectDuration.UntilEachTurnEnd);
    expect(observe(s.engine).hasKeyword(grantedBlockerId, "Blocker")).toBe(true);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("oblivionBird").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((entry) => entry.permanentId === grantedBlockerId) &&
        s.state.players[1]!.trash.some((card) => card.cardId === "BT1-071"),
    );

    expect(s.state.players[1]!.battleArea.some((entry) => entry.permanentId === grantedBlockerId)).toBe(false);
  });

  it("resolves without a target decision when the opponent controls no Digimon with Blocker", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT1-010"], hand: [{ card: "BT1-094", as: "option" }] },
      1: { battleArea: ["BT1-071"] },
    });
    const optionId = s.inst("option").instanceId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT1-094", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT1-072", as: "blocker" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
