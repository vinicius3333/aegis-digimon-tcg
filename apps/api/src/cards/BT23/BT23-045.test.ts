import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import {
  settle,
  settleAcrossTimers,
  setupEngine,
  type BoardSpec,
  type SetupEngineOptions,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-045.js";

const SECURITY = ["BT1-010", "BT1-011", "BT1-012"];
const DECK = ["BT1-010", "BT1-011", "BT1-012", "BT1-013"];

/** Open seat 0's real Main phase through the production turn loop with a known memory. */
async function openMain(board: BoardSpec, opts: SetupEngineOptions, memory = 10) {
  const prefer: string[] = [];
  const s = setupEngine(board, { ...opts, preferInstanceIds: prefer });
  await s.ready();
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  s.state.memory = memory;
  return {
    s,
    prefer,
    async close() {
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  };
}

describe("BT23-045 TigerVespamon ACE", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-045")).toMatchObject({
      cardId: "BT23-045",
      nameEn: "TigerVespamon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 8,
      dp: 12000,
      evoCosts: [
        { color: "Green", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Cyborg", "X Antibody", "Royal Base", "Zaxon", "CS", "Insectoid"],
      isAce: true,
      overflowMemory: 4,
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Royal Base", "CS"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("declares the [Hand] [Counter] Blast Digivolve clause", () => {
    const counter = compiled.effects.find((entry) => entry.trigger === "Counter") as any;
    expect(counter).toMatchObject({ isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] });
  });

  // --- [On Play] / [When Digivolving] by-placement -----------------------------------------

  it("On Play: pays the trash placement face up at security bottom and returns the exact eligible target", async () => {
    const { s, prefer, close } = await openMain(
      {
        0: {
          hand: [
            { card: "BT23-045", as: "tiger" },
            { card: "ST1-02", as: "keeper" },
          ],
          trash: [{ card: "BT18-044", as: "royalTrash" }],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "eligible" },
            { card: "BT1-012", as: "tooBig", dp: 13000 },
          ],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("royalTrash").instanceId;
    const eligibleCardId = s.perm("eligible").topCard!.instanceId;
    const tooBigId = s.perm("tooBig").permanentId;
    prefer.push(eligibleCardId);
    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tiger").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === securityBefore.length + 1);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([...securityBefore, costId]);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: costId, faceUp: true });
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === costId)).toBe(false);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(eligibleCardId);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === tooBigId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    await close();
  });

  it("On Play: keeps the trash placement mandatory even when the controller declines every prompt (Q5331)", async () => {
    const { s, close } = await openMain(
      {
        0: {
          hand: [
            { card: "BT23-045", as: "tiger" },
            { card: "ST1-02", as: "keeper" },
          ],
          trash: [{ card: "BT18-044", as: "royalTrash" }],
          security: SECURITY,
          deck: DECK,
        },
        1: { battleArea: [{ card: "BT1-009", as: "eligible" }], security: SECURITY, deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("royalTrash").instanceId;
    const eligibleCardId = s.perm("eligible").topCard!.instanceId;
    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tiger").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === securityBefore.length + 1);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([...securityBefore, costId]);
    expect(s.state.players[0]!.security.at(-1)!.faceUp).toBe(true);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(eligibleCardId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    await close();
  });

  it("On Play: may decline the placement when the only eligible cost card is in hand (Q5331)", async () => {
    const { s, close } = await openMain(
      {
        0: {
          hand: [
            { card: "BT23-045", as: "tiger" },
            { card: "BT18-044", as: "royalHand" },
            { card: "ST1-02", as: "keeper" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: { battleArea: [{ card: "BT1-009", as: "eligible" }], security: SECURITY, deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const handId = s.inst("royalHand").instanceId;
    const eligibleId = s.perm("eligible").permanentId;
    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tiger").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT23-045"));

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(securityBefore);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(handId);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === eligibleId)).toBe(true);
    await close();
  });

  it("On Play: pays a hand placement when the controller accepts and no trash card qualifies", async () => {
    const { s, close } = await openMain(
      {
        0: {
          hand: [
            { card: "BT23-045", as: "tiger" },
            { card: "BT18-044", as: "royalHand" },
            { card: "ST1-02", as: "keeper" },
          ],
          trash: [{ card: "BT1-009", as: "wrongTrait" }],
          security: SECURITY,
          deck: DECK,
        },
        1: { battleArea: [{ card: "BT1-009", as: "eligible" }], security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const handId = s.inst("royalHand").instanceId;
    const wrongTraitId = s.inst("wrongTrait").instanceId;
    const eligibleCardId = s.perm("eligible").topCard!.instanceId;
    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tiger").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === securityBefore.length + 1);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([...securityBefore, handId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(wrongTraitId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(eligibleCardId);
    await close();
  });

  it("On Play: does nothing when no [Royal Base] or [Zaxon] Digimon card is available to place", async () => {
    const { s, close } = await openMain(
      {
        0: {
          hand: [
            { card: "BT23-045", as: "tiger" },
            { card: "BT1-009", as: "wrongTraitHand" },
            { card: "ST1-02", as: "keeper" },
          ],
          trash: [{ card: "BT1-010", as: "wrongTraitTrash" }],
          security: SECURITY,
          deck: DECK,
        },
        1: { battleArea: [{ card: "BT1-009", as: "eligible" }], security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eligibleId = s.perm("eligible").permanentId;
    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tiger").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT23-045"));

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(securityBefore);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === eligibleId)).toBe(true);
    await close();
  });

  it("On Play: does not spend the placement when the opponent has no Digimon at 12000 DP or less", async () => {
    const { s, close } = await openMain(
      {
        0: {
          hand: [
            { card: "BT23-045", as: "tiger" },
            { card: "ST1-02", as: "keeper" },
          ],
          trash: [{ card: "BT18-044", as: "royalTrash" }],
          security: SECURITY,
          deck: DECK,
        },
        1: { battleArea: [{ card: "BT1-012", as: "tooBig", dp: 13000 }], security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("royalTrash").instanceId;
    const tooBigId = s.perm("tooBig").permanentId;
    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tiger").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT23-045"));

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(securityBefore);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(costId);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === tooBigId)).toBe(true);
    await close();
  });

  it("When Digivolving: takes the Lv.5 [Royal Base]/[CS] route for 3 and returns the exact eligible target", async () => {
    const { s, close } = await openMain(
      {
        0: {
          battleArea: [{ card: "BT23-043", as: "base" }],
          hand: [
            { card: "BT23-045", as: "tiger" },
            { card: "ST1-02", as: "keeper" },
          ],
          trash: [{ card: "BT18-044", as: "royalTrash" }],
          security: SECURITY,
          deck: DECK,
        },
        1: { battleArea: [{ card: "BT1-009", as: "eligible" }], security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseCardId = s.perm("base").topCard!.instanceId;
    const costId = s.inst("royalTrash").instanceId;
    const eligibleCardId = s.perm("eligible").topCard!.instanceId;
    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tiger").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === securityBefore.length + 1);

    expect(s.state.memory).toBe(7);
    expect(s.perm("base").topCard!.cardId).toBe("BT23-045");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseCardId]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([...securityBefore, costId]);
    expect(s.state.players[0]!.security.at(-1)!.faceUp).toBe(true);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(eligibleCardId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    await close();
  });

  it("charges the printed 4 when the alternate Lv.5 route is not declared", async () => {
    const { s, close } = await openMain(
      {
        0: {
          battleArea: [{ card: "BT23-043", as: "base" }],
          hand: [
            { card: "BT23-045", as: "tiger" },
            { card: "ST1-02", as: "keeper" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tiger").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT23-045");
    expect(s.state.memory).toBe(6);
    await close();
  });

  it("refuses a level-4 [Royal Base] source on both the printed and the alternate route", async () => {
    const { s, close } = await openMain(
      {
        0: {
          battleArea: [{ card: "BT23-042", as: "tooLow" }],
          hand: [
            { card: "BT23-045", as: "tiger" },
            { card: "ST1-02", as: "keeper" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    for (const useAlternateCost of [false, true]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("tooLow").permanentId,
          instanceId: s.inst("tiger").instanceId,
          useAlternateCost,
        }).ok,
      ).toBe(false);
    }
    expect(s.state.memory).toBe(10);
    expect(s.perm("tooLow").topCard!.cardId).toBe("BT23-042");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT23-045");
    await close();
  });

  // --- [All Turns] when this Digimon suspends --------------------------------------------

  it("flips the top face-up security card face down to unsuspend one of your Digimon when it attacks", async () => {
    const { s, prefer, close } = await openMain(
      {
        0: {
          battleArea: [
            { card: "BT23-045", as: "tiger" },
            { card: "BT1-009", as: "ally", suspended: true },
          ],
          hand: [{ card: "ST1-02", as: "keeper" }],
          security: [
            { card: "BT1-010", as: "topSecurity", faceUp: true },
            { card: "BT1-011", as: "nextSecurity" },
          ],
          deck: DECK,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // The turn loop's Active phase unsuspends the board, so arm the ally inside the open Main.
    s.perm("ally").isSuspended = true;
    prefer.push(s.perm("ally").topCard!.instanceId);
    const topId = s.inst("topSecurity").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tiger").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("ally").isSuspended === false);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: topId, faceUp: false });
    await close();
  });

  it("cannot unsuspend while no security card is face up", async () => {
    const { s, close } = await openMain(
      {
        0: {
          battleArea: [
            { card: "BT23-045", as: "tiger" },
            { card: "BT1-009", as: "ally", suspended: true },
          ],
          hand: [{ card: "ST1-02", as: "keeper" }],
          security: [
            { card: "BT1-010", as: "topSecurity" },
            { card: "BT1-011", as: "nextSecurity" },
          ],
          deck: DECK,
        },
        1: { hand: [{ card: "ST1-02", as: "keeper1" }], security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("ally").isSuspended = true;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tiger").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("tiger").isSuspended).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.faceUp)).toEqual([false, false]);
    await close();
  });

  // "Your top face-up security card" is read as the topmost face-up card in the stack, not as
  // "the top card, and only while it is face up". No ruling settles the wording; this pins the
  // engine's reading so a change to it is a deliberate one.
  it("flips the topmost face-up card even when a face-down card sits above it", async () => {
    const { s, prefer, close } = await openMain(
      {
        0: {
          battleArea: [
            { card: "BT23-045", as: "tiger" },
            { card: "BT1-009", as: "ally", suspended: true },
          ],
          hand: [{ card: "ST1-02", as: "keeper" }],
          security: [
            { card: "BT1-010", as: "topSecurity" },
            { card: "BT1-011", as: "faceUpBelow", faceUp: true },
          ],
          deck: DECK,
        },
        1: { hand: [{ card: "ST1-02", as: "keeper1" }], security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("ally").isSuspended = true;
    prefer.push(s.perm("ally").topCard!.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tiger").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.state.players[0]!.security.map((card) => [card.instanceId, card.faceUp])).toEqual([
      [s.inst("topSecurity").instanceId, false],
      [s.inst("faceUpBelow").instanceId, false],
    ]);
    await close();
  });

  it("may decline the security flip and leave the ally suspended", async () => {
    const { s, close } = await openMain(
      {
        0: {
          battleArea: [
            { card: "BT23-045", as: "tiger" },
            { card: "BT1-009", as: "ally", suspended: true },
          ],
          hand: [{ card: "ST1-02", as: "keeper" }],
          security: [
            { card: "BT1-010", as: "topSecurity", faceUp: true },
            { card: "BT1-011", as: "nextSecurity" },
          ],
          deck: DECK,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.perm("ally").isSuspended = true;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tiger").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.state.players[0]!.security[0]).toMatchObject({
      instanceId: s.inst("topSecurity").instanceId,
      faceUp: true,
    });
    await close();
  });

  /**
   * Open the opponent's (seat 1) attack through the real turn loop and stop with seat 0's
   * [Counter] window open, so ＜Blast Digivolve＞ can be answered the public way.
   */
  async function openCounterWindow(board: BoardSpec, prefer: string[]) {
    const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 5;
    return {
      s,
      loop,
      async close() {
        expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
        await loop;
      },
    };
  }

  it("Blast Digivolves from hand through the [Counter] window, pays no memory, and ends the attack by returning the attacker", async () => {
    const prefer: string[] = [];
    const { s, close } = await openCounterWindow(
      {
        0: {
          battleArea: [{ card: "BT23-043", as: "base" }],
          hand: [{ card: "BT23-045", as: "tiger" }],
          trash: [{ card: "BT18-044", as: "royalTrash" }],
          security: [
            { card: "BT1-010", as: "sec0" },
            { card: "BT1-011", as: "sec1" },
            { card: "BT1-012", as: "sec2" },
          ],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker" }],
          hand: [{ card: "ST1-02", as: "keeper1" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      prefer,
    );
    const baseCardId = s.perm("base").topCard!.instanceId;
    const attackerCardId = s.perm("attacker").topCard!.instanceId;
    const costId = s.inst("royalTrash").instanceId;
    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);
    prefer.push(attackerCardId);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking());
    const memoryBefore = s.state.memory;

    // ＜Blast Digivolve＞ is answered through the open [Counter] window, not as a bare
    // `digivolve` intent: only `respondCounter` closes the window and lets the attack finish.
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: s.inst("tiger").instanceId,
        effectKey: `blast-digivolve:${s.perm("base").permanentId}`,
      } as never),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    // Blast Digivolve costs no memory, and the attack ended without a security check because
    // the [When Digivolving] return took the attacker off the board.
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.turnSeat).toBe(1);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.perm("base").topCard!.cardId).toBe("BT23-045");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseCardId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT23-045");
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([...securityBefore, costId]);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: costId, faceUp: true });
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(attackerCardId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    await close();
  });

  it("Blast Digivolves through the [Counter] window and lets the attack finish when another Digimon is returned", async () => {
    const prefer: string[] = [];
    const { s, close } = await openCounterWindow(
      {
        0: {
          battleArea: [{ card: "BT23-043", as: "base" }],
          hand: [{ card: "BT23-045", as: "tiger" }],
          trash: [{ card: "BT18-044", as: "royalTrash" }],
          security: [
            { card: "BT1-010", as: "sec0" },
            { card: "BT1-011", as: "sec1" },
            { card: "BT1-012", as: "sec2" },
          ],
          deck: DECK,
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "attacker" },
            { card: "BT1-009", as: "bystander" },
          ],
          hand: [{ card: "ST1-02", as: "keeper1" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      prefer,
    );
    const attackerPermanentId = s.perm("attacker").permanentId;
    const bystanderCardId = s.perm("bystander").topCard!.instanceId;
    const costId = s.inst("royalTrash").instanceId;
    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);
    prefer.push(bystanderCardId);

    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId, target: { kind: "player" } })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isAttacking());
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: s.inst("tiger").instanceId,
        effectKey: `blast-digivolve:${s.perm("base").permanentId}`,
      } as never),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(memoryBefore);
    expect(s.perm("base").topCard!.cardId).toBe("BT23-045");
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(bystanderCardId);
    // The attacker survived the counter, so the attack checked exactly one security card and the
    // placed cost card stayed at the bottom of the stack.
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([...securityBefore.slice(1), costId]);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.permanentId)).toEqual([attackerPermanentId]);
    expect(s.state.pendingDecision).toBeUndefined();
    await close();
  });

  // --- face-up security rules the placement creates (Q5307-Q5310) -------------------------

  it("leaves the placed card revealed in the security stack across the turn boundary (Q5307)", async () => {
    const { s, close } = await openMain(
      {
        0: {
          hand: [
            { card: "BT23-045", as: "tiger" },
            { card: "ST1-02", as: "keeper" },
          ],
          trash: [{ card: "BT18-044", as: "royalTrash" }],
          security: SECURITY,
          deck: DECK,
        },
        1: { battleArea: [{ card: "BT1-009", as: "eligible" }], security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("royalTrash").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tiger").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 4);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: costId, faceUp: true });
    expect(s.state.players[0]!.security.filter((card) => card.faceUp)).toHaveLength(1);
    await close();
  });

  it("checks a face-up security card exactly like a face-down one and fires its [Security] effect (Q5308, Q5309)", async () => {
    async function checkSecurity(faceUp: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-009", as: "attacker" }],
            hand: [{ card: "ST1-02", as: "keeper" }],
            security: SECURITY,
            deck: DECK,
          },
          1: {
            battleArea: [{ card: "BT1-012", as: "victim" }],
            hand: [{ card: "ST1-02", as: "keeper1" }],
            security: [{ card: "ST22-08", as: "securityOption", faceUp }],
            deck: DECK,
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = 5;
      const attackerId = s.perm("attacker").permanentId;
      const securityId = s.inst("securityOption").instanceId;
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
      const endpoints = {
        securityLeftStack: s.state.players[1]!.security.some((card) => card.instanceId === securityId),
        // ST22-08's [Security] effect deletes the attacking Digimon.
        attackerStillOnBoard: s.state.players[0]!.battleArea.some((perm) => perm.permanentId === attackerId),
        victimStillOnBoard: s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-012"),
        securityCount: s.state.players[1]!.security.length,
      };
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
      return endpoints;
    }

    const revealed = await checkSecurity(true);
    const hidden = await checkSecurity(false);
    expect(revealed).toEqual(hidden);
    expect(revealed).toEqual({
      securityLeftStack: false,
      attackerStillOnBoard: false,
      victimStillOnBoard: true,
      securityCount: 0,
    });
  });

  it("turns every face-up security card face down when the stack is shuffled (Q5310)", async () => {
    const { s, close } = await openMain(
      {
        0: {
          hand: [
            { card: "BT23-045", as: "tiger" },
            { card: "EX3-029", as: "shuffler" },
            { card: "ST1-02", as: "keeper" },
          ],
          trash: [{ card: "BT18-044", as: "royalTrash" }],
          security: SECURITY,
          deck: DECK,
        },
        1: { battleArea: [{ card: "BT1-009", as: "eligible" }], security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
      20,
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tiger").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 4);
    expect(s.state.players[0]!.security.filter((card) => card.faceUp)).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shuffler").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 3);

    expect(s.state.players[0]!.security.filter((card) => card.faceUp)).toHaveLength(0);
    await close();
  });

  it("charges the ACE Overflow -4 when it leaves the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-045", as: "tiger" }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("tiger").permanentId], "byEffect");
    expect(s.state.memory).toBe(-4);
  });

  // --- IR shape ---------------------------------------------------------------------------

  it("requires placing a Royal Base or Zaxon Digimon in security before returning an eligible opponent Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions).toHaveLength(2);
      const [mandatory, optional] = actions;
      expect(mandatory).toMatchObject({
        kind: "Return",
        to: "hand",
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
          count: 1,
        },
        condition: { kind: "selfHasMinTrash", count: 1 },
        cost: { kind: "place", destination: "security", position: "bottom", faceDown: false },
      });
      expect(mandatory.optional).toBeUndefined();
      expect(mandatory.cost.target.from).toEqual(["hand", "trash"]);
      expect(optional).toMatchObject({
        kind: "Return",
        condition: { kind: "not", condition: { kind: "selfHasMinTrash" } },
        optional: true,
        abortOnDecline: true,
      });
      expect(optional.cost.target.from).toEqual(["hand"]);
    }
  });

  it("only reacts when this Digimon suspends and pays by flipping the top face-up security card", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    const subtrigger = effect.actions[0];
    expect(subtrigger).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
    });
    expect(subtrigger.actions[0]).toMatchObject({
      kind: "Unsuspend",
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      cost: {
        kind: "flipSecurity",
        target: {
          filter: { zone: "security", controller: "mine", position: "top", faceUp: true },
          count: 1,
        },
        raw: "by flipping your top face-up security card face down",
      },
      abortOnDecline: true,
      optional: true,
    });
  });
});
