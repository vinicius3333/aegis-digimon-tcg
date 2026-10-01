import "../P/P-106.js";
import { observe } from "../../engine/testkit/observe.js";
import { describe, it, expect } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { drainMicrotasks, setupEngine, settle, type EngineSetup, type SeatSpec } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT20-078.js";
import "./BT20-073.js";
import "./BT20-069.js";
import "./index.js";
import "../BT4/BT4-011.js";
import "../BT6/BT6-017.js";
import "../BT6/BT6-060.js";
import "../P/P-103.js";

const REAPERMON = "BT20-078";
const AGUMON = "BT1-010";
const METAL_GREYMON = "BT1-021";

describe("BT20-078 Reapermon — On Deletion deletes cheap opponent permanent", () => {
  it("watches opponent effect-driven digivolutions and de-digivolves once per turn", () => {
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    expect(allTurns?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAnyDigivolves",
      sourceFilter: { controllerDefault: "opponent", kind: ["Digimon"], byEffect: true },
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
        },
      ],
    });
  });

  it("de-digivolves an opponent effect evolution once and resets on a later opponent turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: REAPERMON, as: "reapermon" }], hand: [AGUMON], deck: [AGUMON, AGUMON, AGUMON] },
        1: {
          battleArea: [{ card: "BT1-064", as: "base" }],
          hand: [
            { card: "P-106", as: "training1" },
            { card: "P-106", as: "training2" },
            { card: "P-106", as: "training3" },
            { card: "BT20-039", as: "evolution1" },
            { card: "BT1-071", as: "evolution2" },
            { card: "BT1-075", as: "evolution3" },
            AGUMON,
          ],
          deck: Array(20).fill(AGUMON),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    for (const alias of ["training1", "training2", "training3"]) {
      const id = s.inst(alias).instanceId;
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: id })).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === id));
      expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === id)).toBe(true);
    }
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    async function train(alias: string, expectedTop: string, expectedStack: number) {
      const training = s.perm(alias);
      const id = training.topCard.instanceId;
      const entry = observe(s.engine).activatableEffects(training)[0];
      expect(entry).toBeDefined();
      const before = s.events.filter((e) => e.kind === "effectActivated").length;
      expect(
        s.engine.applyIntent(1, { type: "activateEffect", sourceInstanceId: id, effectKey: entry!.effectKey }),
      ).toEqual({ ok: true });
      await settle(() => s.events.filter((e) => e.kind === "effectActivated").length > before);
      expect(s.perm("base").topCard.cardId).toBe(expectedTop);
      expect(s.perm("base").stack).toHaveLength(expectedStack);
      expect(s.state.players[1]!.trash.some((c) => c.instanceId === id)).toBe(true);
    }
    await train("training1", "BT1-064", 0);
    expect(s.perm("reapermon").isSuspended).toBe(true);
    const turnPlayerTrigger = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT20-039",
    );
    const reapermonTrigger = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === REAPERMON,
    );
    expect(turnPlayerTrigger).toBeGreaterThanOrEqual(0);
    expect(reapermonTrigger).toBeGreaterThan(turnPlayerTrigger);

    await train("training2", "BT1-071", 1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    await train("training3", "BT1-071", 1);
    expect(s.state.players[1]!.trash.some((c) => c.cardId === "BT1-075")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("grants Collision and Blocker as static keywords", () => {
    expect(
      compiled.effects.filter((effect) => effect.trigger === "Static").map((effect) => effect.keywords?.[0]?.keyword),
    ).toEqual(["Collision", "Blocker"]);
  });

  it("does not react to an opponent's ordinary Main digivolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: REAPERMON, as: "reapermon" }], deck: [AGUMON, AGUMON] },
        1: {
          battleArea: [{ card: "BT1-064", as: "base" }],
          hand: [{ card: "BT1-071", as: "evolution" }],
          deck: [AGUMON, AGUMON],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-071");
    expect(s.perm("base").topCard.cardId).toBe("BT1-071");
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publishes the printed identity, evolution routes, and full compiled coverage", () => {
    expect(getCardDefinition(REAPERMON)).toMatchObject({
      cardId: REAPERMON,
      nameEn: "Reapermon",
      colors: ["Purple", "Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [
        { color: "Purple", level: 5, memoryCost: 3 },
        { color: "Black", level: 5, memoryCost: 3 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Cyborg", "Ghost"],
      effectText: expect.stringContaining("[All Turns] [Once Per Turn]"),
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("[On Deletion] deletes opponent Digimon with play cost <= 4 when Reapermon is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: REAPERMON, dp: 11000, as: "reapermon" }] },
        1: {
          battleArea: [
            { card: AGUMON, dp: 2000, as: "agumon", suspended: true },
            { card: METAL_GREYMON, dp: 15000, as: "metalGreymon", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const reapermon = s.perm("reapermon");
    const agumon = s.perm("agumon");
    const metalGreymon = s.perm("metalGreymon");

    s.state.memory = 5;
    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: reapermon.permanentId,
      target: { kind: "permanent", permanentId: metalGreymon.permanentId },
    });

    expect(res).toEqual({ ok: true });

    await settle(() => !p1.battleArea.some((pp) => pp.permanentId === agumon.permanentId), 600);

    expect(p1.battleArea.some((pp) => pp.permanentId === agumon.permanentId)).toBe(false);
    expect(p1.trash.some((c) => c.cardId === AGUMON)).toBe(true);
  });

  it("[On Deletion] does NOT delete opponent Digimon with play cost > 4", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: REAPERMON, dp: 11000, as: "reapermon" }] },
        1: {
          battleArea: [
            { card: METAL_GREYMON, dp: 15000, as: "metalGreymon", suspended: true },
            { card: METAL_GREYMON, dp: 15000, as: "oppAttacker", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const reapermon = s.perm("reapermon");
    const metalGreymon = s.perm("metalGreymon");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: reapermon.permanentId,
        target: { kind: "permanent", permanentId: s.perm("metalGreymon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === REAPERMON));

    expect(p1.battleArea.filter((pp) => pp.permanentId === metalGreymon.permanentId)).toHaveLength(1);
    expect(p1.battleArea.some((pp) => pp.topCard.cardId === METAL_GREYMON)).toBe(true);
  });

  it("[On Deletion] deletes a cost-3 opponent Tamer while preserving a cost-5 Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: REAPERMON, dp: 11000, as: "reapermon" }] },
        1: {
          battleArea: [
            { card: "BT10-087", as: "cheapTamer" },
            { card: "AD1-020", as: "expensiveTamer" },
            { card: "BT20-076", dp: 15000, as: "attacker", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const cheapTamerId = s.perm("cheapTamer").permanentId;
    const expensiveTamerId = s.perm("expensiveTamer").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reapermon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("attacker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === REAPERMON));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === cheapTamerId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === expensiveTamerId)).toBe(true);
  });

  it("publicly forces an opponent Digimon to block through Collision, then redirects with its own Blocker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: REAPERMON, dp: 11000, as: "reapermon" }], security: ["BT1-010"] },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 1000, as: "blocker" },
            { card: "BT20-076", dp: 15000, as: "attacker", suspended: true },
          ],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const blockerId = s.perm("blocker").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reapermon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("attacker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declineBlock" }).ok).toBe(false);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === blockerId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("reapermon").permanentId)).toBe(true);
  });

  it("publicly redirects an opponent player attack with Reapermon's Blocker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: REAPERMON, dp: 11000, as: "reapermon" }],
          security: ["BT1-010", "BT1-010"],
          deck: [AGUMON, AGUMON],
        },
        1: {
          battleArea: [{ card: "BT1-010", dp: 2000, as: "attacker" }],
          security: ["BT1-010", "BT1-010"],
          deck: [AGUMON, AGUMON],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("reapermon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("reapermon").permanentId)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

const reapermonWatchesOpponentTurn = async (opponent: SeatSpec) => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: REAPERMON, as: "reapermon" }], deck: [AGUMON, AGUMON] },
      1: { deck: [AGUMON, AGUMON, AGUMON], ...opponent },
    },
    { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
  );
  s.state.turnSeat = 1;
  s.state.turnCount = 2;
  s.state.memory = 10;
  await s.ready();
  return s;
};

const activateTrainingDelay = (s: EngineSetup, alias: string) => {
  const training = s.perm(alias);
  const [delay] = observe(s.engine).activatableEffects(training);
  expect(delay).toBeDefined();
  return s.engine.applyIntent(1, {
    type: "activateEffect",
    sourceInstanceId: training.topCard.instanceId,
    effectKey: delay!.effectKey,
  });
};

const reapermonTriggered = (s: EngineSetup) =>
  s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === REAPERMON);

describe("BT20-078 Reapermon — KB Q&A rulings", () => {
  it("resolves the turn player's [When Digivolving] before Reapermon's simultaneous [All Turns] (Q4401)", async () => {
    const s = await reapermonWatchesOpponentTurn({
      battleArea: [
        { card: "BT1-064", as: "base" },
        { card: "P-106", as: "training" },
      ],
      hand: [{ card: "BT20-039", as: "diatrymon" }],
    });

    expect(activateTrainingDelay(s, "training")).toEqual({ ok: true });
    await settle(() => reapermonTriggered(s) && s.state.pendingDecision === undefined);
    await drainMicrotasks();

    const triggerOrder = s.events
      .filter((event) => event.kind === "effectTriggered")
      .map((event) => event.sourceCardId)
      .filter((cardId) => cardId === "BT20-039" || cardId === REAPERMON);
    expect(triggerOrder).toEqual(["BT20-039", REAPERMON]);
    expect(s.perm("reapermon").isSuspended).toBe(true);
    expect(s.perm("base").topCard.cardId).toBe("BT1-064");
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("diatrymon").instanceId)).toBe(true);
  });

  it("triggers only on digivolution by an effect, not on Agunimon's Tamer route or Deputymon's requirement waiver (Q4402)", async () => {
    const byTrainingEffect = await reapermonWatchesOpponentTurn({
      battleArea: [
        { card: METAL_GREYMON, as: "metalGreymon" },
        { card: "P-103", as: "offenseTraining" },
      ],
      hand: [{ card: "BT6-017", as: "magnaKidmon" }],
    });
    expect(activateTrainingDelay(byTrainingEffect, "offenseTraining")).toEqual({ ok: true });
    await settle(() => reapermonTriggered(byTrainingEffect) && byTrainingEffect.state.pendingDecision === undefined);
    await drainMicrotasks();
    expect(byTrainingEffect.perm("metalGreymon").topCard.cardId).toBe(METAL_GREYMON);
    expect(
      byTrainingEffect.state.players[1]!.trash.some(
        (card) => card.instanceId === byTrainingEffect.inst("magnaKidmon").instanceId,
      ),
    ).toBe(true);

    const byDeputymonWaiver = await reapermonWatchesOpponentTurn({
      battleArea: [{ card: "BT6-060", as: "deputymon" }],
      hand: [{ card: "BT6-017", as: "magnaKidmon" }],
    });
    expect(
      byDeputymonWaiver.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: byDeputymonWaiver.perm("deputymon").permanentId,
        instanceId: byDeputymonWaiver.inst("magnaKidmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => byDeputymonWaiver.perm("deputymon").topCard.cardId === "BT6-017");
    await drainMicrotasks();
    expect(reapermonTriggered(byDeputymonWaiver)).toBe(false);
    expect(byDeputymonWaiver.perm("deputymon").topCard.cardId).toBe("BT6-017");

    const byAgunimonTamerRoute = await reapermonWatchesOpponentTurn({
      battleArea: [{ card: "BT1-085", as: "tamer" }],
      hand: [{ card: "BT4-011", as: "agunimon" }],
    });
    expect(
      byAgunimonTamerRoute.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: byAgunimonTamerRoute.perm("tamer").permanentId,
        instanceId: byAgunimonTamerRoute.inst("agunimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => byAgunimonTamerRoute.perm("tamer").topCard.cardId === "BT4-011");
    await drainMicrotasks();
    expect(reapermonTriggered(byAgunimonTamerRoute)).toBe(false);
    expect(byAgunimonTamerRoute.perm("tamer").topCard.cardId).toBe("BT4-011");
  });
});
