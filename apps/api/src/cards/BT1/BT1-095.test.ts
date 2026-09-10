import { EffectTiming, Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT1-095.js";
describe("BT1-095 Brave Shield", () => {
  it("matches the catalog and encodes distinct Main and Security durations", () => {
    expect(getCardDefinition("BT1-095")).toMatchObject({
      cardId: "BT1-095",
      set: "BT1",
      nameEn: "Brave Shield",
      colors: ["Red"],
      kinds: ["Option"],
      playCost: 5,
      dp: 0,
      evoCosts: [],
      effectText:
        "[Main] Unsuspend 1 of your Digimon. Until the end of your opponent's next turn, that Digimon gains ＜Blocker＞. (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.)",
      securityEffectText:
        "[Security] Unsuspend 1 of your Digimon. That Digimon gains <Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead) for the turn.",
      rarity: "R",
      maxCountInDeck: 4,
      imageId: "BT1-095",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "Main",
        actions: [
          expect.objectContaining({ kind: "Unsuspend" }),
          expect.objectContaining({
            kind: "GainKeyword",
            duration: "untilOpponentTurnEnd",
            target: expect.objectContaining({ sameTarget: true }),
          }),
        ],
      }),
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [
          expect.objectContaining({ kind: "Unsuspend" }),
          expect.objectContaining({
            kind: "GainKeyword",
            duration: "forTheTurn",
            target: expect.objectContaining({ sameTarget: true }),
          }),
        ],
      }),
    ]);
  });

  it("unsuspends the chosen Digimon and gives that Digimon Blocker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "chosen", suspended: true },
            { card: "BT1-011", as: "other", suspended: true },
          ],
          hand: [{ card: "BT1-095", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker") && [...s.perm("chosen").keywords].includes("Blocker"),
    );
    expect(s.perm("chosen").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
    expect([...s.perm("chosen").keywords]).toContain("Blocker");
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(1);
  });

  it("can give Blocker to an already-unsuspended Digimon (Q963)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "active" }],
          hand: [{ card: "BT1-095", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("active"), "Blocker"));

    expect(s.perm("active").isSuspended).toBe(false);
  });

  it("targets a Digimon reached through hatch, legal digivolution, and move", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT1-001", as: "egg" }],
        hand: [
          { card: "BT1-010", as: "evolved" },
          { card: "BT1-095", as: "option" },
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

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("evolved").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-010");
    expect(s.state.players[0]!.breeding!.stack.map(({ cardId }) => cardId)).toEqual(["BT1-001"]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ permanentId: id }) => id === permanentId));
    await advance(s.engine).waitForMainPhase(0);

    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(permanentId, "Blocker"));
    expect(s.state.players[0]!.battleArea.find(({ permanentId: id }) => id === permanentId)!.isSuspended).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the Main Blocker grant through this turn and removes it at the opponent's turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "target", suspended: true, under: ["BT1-001"] }],
          hand: [{ card: "BT1-095", as: "option" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target"), "Blocker"));

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(false);
  });

  it("unsuspends one Digimon and grants it Blocker from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT1-095", as: "securityOption", faceUp: true }],
          battleArea: [
            { card: "BT1-010", as: "target", suspended: true },
            { card: "BT1-011", as: "other", suspended: true },
          ],
          deck: ["BT1-010"],
        },
        1: { deck: ["BT1-012"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("target").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
    expect([...s.perm("target").keywords]).toContain("Blocker");
    expect(s.perm("other").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(1);

    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(false);
  });
});
