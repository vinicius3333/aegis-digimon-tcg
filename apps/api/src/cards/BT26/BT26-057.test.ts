import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectDuration } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type BoardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-057.js";
import "../index.js";

describe("BT26-057 Bearcatmon", () => {
  it("encodes Digimon-effect immunity, dual All Turns unsuspend triggers, TS waiver, and granted attack", () => {
    expect(digivolutionRequirementsFor("BT26-057")).toContainEqual({
      level: 4,
      traits: ["Glowing Dawn"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 },
          actions: [
            { kind: "Restrict", restriction: "beAffected", fromSourceKind: ["Digimon"] },
            { kind: "ModifyDP", amount: 3000 },
          ],
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenAttackTargetSwitched" },
        { kind: "SubTrigger", event: "whenDigivolutionTrashed" },
      ],
    });
    expect(compiled.effects?.[2]?.actions).toContainEqual(expect.objectContaining({ kind: "WaiveColorRequirement" }));
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "DeDigivolve", amount: 1 },
        { kind: "GainTriggeredEffect", gainedTrigger: "StartOfYourMainPhase" },
      ],
    });
  });

  it("uses the Lv.4 Glowing Dawn alternate evolution and rejects a non-trait base", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT25-035", as: "glowingDawnBase" }],
        hand: [{ card: "BT26-057", as: "bearcatmon" }],
      },
    });
    legal.state.memory = 3;
    await legal.ready();

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("glowingDawnBase").permanentId,
        instanceId: legal.inst("bearcatmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("glowingDawnBase").topCard.cardId === "BT26-057");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("glowingDawnBase").stack.map(({ cardId }) => cardId)).toEqual(["BT25-035"]);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-032", as: "nonGlowingDawnBase" }],
        hand: [{ card: "BT26-057", as: "bearcatmon" }],
      },
    });
    invalid.state.memory = 3;
    await invalid.ready();

    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("nonGlowingDawnBase").permanentId,
        instanceId: invalid.inst("bearcatmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("publicly pays with a face-down Tamer card and gains DP plus Digimon-effect immunity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-035", as: "base" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", as: "faceDown", faceUp: false }] },
          ],
          hand: [{ card: "BT26-057", as: "bearcatmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bearcatmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-057");

    expect(s.perm("base").currentDP).toBe(11000);
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).not.toContain("BT1-010");
    expect(observe(s.engine).isRestrictedByEffect(s.perm("base"), "beAffected", "Digimon")).toBe(true);
  });

  it("grants neither protection nor DP when the exact face-down Tamer-bottom cost is unavailable", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-035", as: "base" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", faceUp: true }] },
          ],
          hand: [{ card: "BT26-057", as: "bearcatmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bearcatmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-057");

    expect(s.perm("base").currentDP).toBe(8000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("base"), "beAffected", "Digimon")).toBe(false);
  });

  it("ignores opposing Digimon effects but remains affected by opposing Option effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-035", as: "base" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", faceUp: false }] },
          ],
          hand: [{ card: "BT26-057", as: "bearcatmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bearcatmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-057");
    expect(s.perm("base").currentDP).toBe(11000);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    await advance(s.engine).verb.modifyDP(s.perm("base").permanentId, -3000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("base").currentDP).toBe(11000);

    advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
    await advance(s.engine).verb.modifyDP(s.perm("base").permanentId, -1000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("base").currentDP).toBe(10000);
  });

  it("shares Once Per Turn between the target-switch and Tamer-trash unsuspend triggers", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-057", as: "bearcatmon", suspended: true, dp: 50000 },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", as: "under", faceUp: false }] },
          ],
        },
        1: {
          battleArea: [
            { card: "BT26-014", as: "attacker" },
            { card: "BT1-072", as: "blocker" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // The unsuspend phase stood Bearcatmon back up, so suspend it again: a "may unsuspend"
    // clause whose host is already unsuspended meets none of its processing conditions and
    // can't be activated at all, which would leave the shared use untouched (CR 15-6-3).
    await advance(s.engine).verb.suspend([s.perm("bearcatmon").permanentId]);
    expect(s.perm("bearcatmon").isSuspended).toBe(true);
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("tamer").permanentId, [s.inst("under").instanceId], 0);
    expect(s.perm("bearcatmon").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bearcatmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));
    expect(s.perm("bearcatmon").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q7060/Q7062-Q7066: gives the opposing Digimon its Main-phase attack through the public Option flow", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-095", as: "tamer" },
            { card: "BT25-046", as: "glowingDawn" },
          ],
          hand: [
            { card: "BT26-057", as: "tamerCost" },
            { card: "BT26-057", as: "option" },
          ],
        },
        1: {
          battleArea: [{ card: "BT26-047", as: "immuneTarget", suspended: true }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("immuneTarget").permanentId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("option").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    await settle();
    expect(s.perm("immuneTarget").topCard.cardId).toBe("BT26-047");
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("unsuspends from a target switch produced by a real opponent attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-057", as: "bearcatmon", suspended: true },
            { card: "BT26-017", as: "blocker" },
          ],
        },
        1: {
          battleArea: [{ card: "BT26-014", as: "attacker" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
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
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));
    expect(s.perm("bearcatmon").isSuspended).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT26-057 Bearcatmon — KB Q&A rulings", () => {
  /**
   * Digivolve Cougarmon into Bearcatmon. With `payCost`, the Tamer's bottom card is face down,
   * so the [When Digivolving] cost is paid and Bearcatmon ignores opposing Digimon effects;
   * without it, the only card under the Tamer is face up and nothing is gained.
   */
  function bearcatmonBoard(payCost: boolean, opponentHand: string[] = []): BoardSpec {
    return {
      0: {
        battleArea: [
          { card: "BT25-035", as: "base" },
          { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", faceUp: !payCost }] },
        ],
        hand: [{ card: "BT26-057", as: "bearcatmon" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: {
        hand: opponentHand.map((card, index) => ({ card, as: `opponentCard${index}` })),
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
    };
  }

  async function digivolveIntoBearcatmon(s: EngineSetup): Promise<void> {
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bearcatmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-057" && s.state.pendingDecision === undefined);
  }

  async function opponentPlays(s: EngineSetup, alias: string): Promise<void> {
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst(alias).instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);
  }

  it.each([
    { payCost: true, dp: 11000, suspended: false },
    { payCost: false, dp: 5000, suspended: true },
  ])(
    "is neither suspended nor reduced by opposing Digimon effects that choose it (immune=$payCost) (Q7061)",
    async ({ payCost, dp, suspended }) => {
      const preferred: string[] = [];
      const s = setupEngine(bearcatmonBoard(payCost, ["ST22-04", "BT26-038"]), {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      });
      await s.ready();
      await digivolveIntoBearcatmon(s);
      preferred.push(s.perm("base").permanentId, s.perm("base").topCard.instanceId);

      s.state.turnSeat = 1;
      s.state.memory = 20;
      await opponentPlays(s, "opponentCard0");
      await opponentPlays(s, "opponentCard1");

      expect(s.perm("base").currentDP).toBe(dp);
      expect(s.perm("base").isSuspended).toBe(suspended);
    },
  );

  it.each([
    { payCost: true, securityAttack: 0 },
    { payCost: false, securityAttack: -2 },
  ])(
    "can be chosen and given <Security A. -2>, but does not have it while immune (immune=$payCost) (Q7063)",
    async ({ payCost, securityAttack }) => {
      const preferred: string[] = [];
      const board = bearcatmonBoard(payCost, ["BT22-031"]);
      board[0]!.battleArea!.push({ card: "BT1-009", as: "decoy" });
      const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
      await s.ready();
      await digivolveIntoBearcatmon(s);
      const bearcatmon = s.perm("base");
      preferred.push(bearcatmon.permanentId, bearcatmon.topCard.instanceId);

      s.state.turnSeat = 1;
      s.state.memory = 10;
      await opponentPlays(s, "opponentCard0");

      const offeredBearcatmon = s.decisions.some(
        ({ seat, req }) =>
          seat === 1 &&
          (req.options?.candidateInstanceIds ?? []).some(
            (id) => id === bearcatmon.permanentId || id === bearcatmon.topCard.instanceId,
          ),
      );
      expect(offeredBearcatmon).toBe(true);
      expect(observe(s.engine).keywordAmount(s.perm("decoy"), "SecurityAttack")).toBe(0);
      expect(observe(s.engine).keywordAmount(bearcatmon, "SecurityAttack")).toBe(securityAttack);
    },
  );

  it.each([
    { payCost: true, securityAttack: 0 },
    { payCost: false, securityAttack: -2 },
  ])(
    "stops being affected by an opposing Digimon effect the moment it gains the immunity (immune=$payCost) (Q7064)",
    async ({ payCost, securityAttack }) => {
      const s = setupEngine(bearcatmonBoard(payCost, ["BT22-031"]), {
        autoAcceptOptional: true,
        autoSelectCards: true,
      });
      await s.ready();

      s.state.turnSeat = 1;
      s.state.memory = 10;
      await opponentPlays(s, "opponentCard0");
      expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(-2);

      s.state.turnSeat = 0;
      await digivolveIntoBearcatmon(s);

      expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(securityAttack);
    },
  );

  it("is affected by effects it gained while immune once the immunity ends (Q7065)", async () => {
    const s = setupEngine(bearcatmonBoard(true, ["BT22-031", "ST22-04"]), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await digivolveIntoBearcatmon(s);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 20;
    await opponentPlays(s, "opponentCard0");
    await opponentPlays(s, "opponentCard1");
    expect(observe(s.engine).isRestrictedByEffect(s.perm("base"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(0);
    expect(s.perm("base").currentDP).toBe(11000);
    advance(s.engine).endMainPhaseIfOpen(1);

    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("base"), "beAffected", "Digimon")).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(-2);
    expect(s.perm("base").currentDP).toBe(5000);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
