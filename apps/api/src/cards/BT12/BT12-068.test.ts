import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-031.js";
import "../BT1/BT1-085.js";
import "./BT12-068.js";

describe("BT12-068 MetalGreymon", () => {
  it("digivolves for 3 from a level-4 Greymon and rejects a same-level near-match", async () => {
    expect(digivolutionRequirementsFor("BT12-068")).toContainEqual({
      level: 4,
      names: ["Greymon"],
      cost: 3,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "greymon" }],
        hand: [{ card: "BT12-068", as: "metal" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("greymon").permanentId,
        instanceId: legal.inst("metal").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("greymon").topCard.cardId === "BT12-068");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("greymon").stack.map(({ cardId }) => cardId)).toEqual(["BT1-015"]);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-037", as: "gorilla" }], hand: [{ card: "BT12-068", as: "metal" }] },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("gorilla").permanentId,
        instanceId: illegal.inst("metal").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("has Raid and gives a Greymon host inherited Piercing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-068", as: "metal" },
          { card: "BT1-015", as: "host", under: ["BT12-068"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("metal"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
  });

  it("does not grant inherited Piercing to a plain host or on the opponent's turn", async () => {
    const plain = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-068"] }] } });
    await plain.ready();
    expect(observe(plain.engine).hasPierce(plain.perm("host"))).toBe(false);

    const offTurn = setupEngine({ 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT12-068"] }] } });
    offTurn.state.turnSeat = 1;
    await offTurn.engine.recomputeContinuousEffects();
    expect(observe(offTurn.engine).hasPierce(offTurn.perm("host"))).toBe(false);
  });

  it.each(["BT1-085", "BT12-094"])("plays qualifying red or black Tamer %s when a target switches", async (tamer) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-068", as: "metal" },
            { card: "BT1-009", as: "attacker" },
          ],
          hand: [{ card: tamer, as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === tamer));
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("tamer").instanceId),
    ).toBe(true);
  });

  it("does not play wrong-color or over-cost Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-068", as: "metal" }],
          hand: [
            { card: "BT12-091", as: "yellow" },
            { card: "AD1-020", as: "expensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {});
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("yellow").instanceId,
      s.inst("expensive").instanceId,
    ]);
  });

  it("may decline the optional Tamer play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-068", as: "metal" }], hand: [{ card: "BT1-085", as: "tai" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {});
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("tai").instanceId]);
  });

  it("plays at most one Tamer per turn from target-switch triggers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-068", as: "metal" },
            { card: "BT1-009", as: "attacker" },
          ],
          hand: [
            { card: "BT1-085", as: "tai1" },
            { card: "BT1-085", as: "tai2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT1-085").length === 1,
    );
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT1-085")).toHaveLength(1);
  });
});

describe("BT12-068 MetalGreymon — KB Q&A rulings", () => {
  const SECURITY = ["BT1-009", "BT1-010", "BT1-011"];
  const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"];

  const taiPlayed = (s: EngineSetup): boolean =>
    s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("tai").instanceId);

  function yourTurnAttackFixture(attacker: "metal" | "partner"): EngineSetup {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-068", as: "metal" },
            { card: "BT1-009", as: "partner" },
          ],
          hand: [{ card: "BT1-085", as: "tai" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-031", as: "blocker" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Raid"] },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm(attacker).permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    return s;
  }

  async function answerBlockWindow(s: EngineSetup, block: boolean): Promise<void> {
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    const intent = block
      ? ({ type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId } as const)
      : ({ type: "declineBlock" } as const);
    expect(s.engine.applyIntent(1, intent)).toEqual({ ok: true });
  }

  it("plays a Tamer when the opponent blocks this Digimon's attack (Q2207)", async () => {
    const blocked = yourTurnAttackFixture("metal");
    await answerBlockWindow(blocked, true);
    await settle(() => taiPlayed(blocked));
    expect(blocked.state.players[0]!.hand).toHaveLength(0);
    expect(blocked.state.players[1]!.security).toHaveLength(SECURITY.length);

    const unblocked = yourTurnAttackFixture("metal");
    await answerBlockWindow(unblocked, false);
    await settle(() => unblocked.state.players[1]!.security.length === SECURITY.length - 1);
    await settle();
    expect(taiPlayed(unblocked)).toBe(false);
    expect(unblocked.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-085"]);
  });

  it("also activates when another of my Digimon or an opponent's Digimon has its attack target switched (Q2208)", async () => {
    const partnerBlocked = yourTurnAttackFixture("partner");
    await answerBlockWindow(partnerBlocked, true);
    await settle(() => taiPlayed(partnerBlocked));
    expect(partnerBlocked.state.players[0]!.hand).toHaveLength(0);

    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-068", as: "metal" },
            { card: "BT1-031", as: "myBlocker" },
          ],
          hand: [{ card: "BT1-085", as: "tai" }],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-015", as: "opponentAttacker" }],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(taiPlayed(s)).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("myBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => taiPlayed(s));
    expect(s.state.players[0]!.security).toHaveLength(SECURITY.length);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
