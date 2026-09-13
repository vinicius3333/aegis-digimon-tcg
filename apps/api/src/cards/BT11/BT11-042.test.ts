import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-042.js";

describe("BT11-042 Angewomon", () => {
  it("maps the catalog and all three executable clauses", () => {
    expect(getCardDefinition("BT11-042")).toMatchObject({
      cardId: "BT11-042",
      colors: ["Yellow"],
      level: 5,
      playCost: 7,
      dp: 6000,
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 3 },
        { color: "Purple", level: 4, memoryCost: 3 },
      ],
      types: ["Archangel"],
    });
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Search", searchZone: "security" },
        { kind: "SecurityManipulation", op: "addTop" },
        { kind: "SecurityManipulation", op: "shuffle" },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    expect(compiled.effects[2]).toMatchObject({ trigger: "OpponentsTurn", isInherited: true });
  });

  it("searches all security, adds an Angel-family card, recovers and shuffles", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-039", as: "base" }],
          hand: [{ card: "BT11-042", as: "angewomon" }],
          security: [
            { card: "BT11-038", as: "angel" },
            { card: "BT1-009", as: "securityRest" },
          ],
          deck: [{ card: "BT1-009", as: "recovery" }, "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("angewomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.length === 2 &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("angel").instanceId),
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("angel").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).not.toContain(s.inst("recovery").instanceId);
  });

  it("may decline its security search, then shuffles without recovering", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-039", as: "base" }],
          hand: [{ card: "BT11-042", as: "angewomon" }],
          security: [{ card: "BT11-038", as: "angel" }],
          // Normal digivolution draws the first card before this optional effect resolves;
          // leave the second card as the Recovery sentinel.
          deck: ["BT1-009", { card: "BT1-009", as: "recovery" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("angewomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-042");

    expect(s.state.players[0]!.hand).not.toContainEqual(
      expect.objectContaining({ instanceId: s.inst("angel").instanceId }),
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("recovery").instanceId);
  });

  it("gains 1 memory when its controller plays LadyDevimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-042", as: "angewomon" }],
        hand: [{ card: "BT11-083", as: "ladyDevimon" }],
      },
    });
    s.state.memory = 10;
    const playCost = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ladyDevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 10 - playCost + 1);

    expect(s.state.memory).toBe(4);
  });

  it("uses each printed evolution color and gains memory only once across two Mirei plays", async () => {
    for (const base of ["BT11-039", "BT11-080"] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT11-042", as: "angewomon" }],
          deck: ["BT1-009"],
        },
      });
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("angewomon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT11-042");
      expect(s.state.memory).toBe(2);
    }

    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-042", as: "host" },
          { card: "BT1-013", as: "spare" },
        ],
        hand: [
          { card: "BT11-094", as: "firstMirei" },
          { card: "BT11-094", as: "secondMirei" },
          { card: "BT11-094", as: "thirdMirei" },
        ],
        deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        security: ["BT1-013", "BT1-013"],
      },
      1: { deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013", "BT1-013"] },
    });
    s.state.memory = 10;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstMirei").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 6 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(6);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondMirei").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("secondMirei").instanceId),
    );
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const resetTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thirdMirei").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 6 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(6);
    advance(s.engine).endMainPhaseIfOpen(0);
    await resetTurn;
  });

  it("inherited effect grants Blocker to Angel-family Digimon on the opponent's turn while a purple Digimon is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-083", under: ["BT11-042"] }, { card: "BT11-038", as: "angemon" }, "BT1-009"],
        security: [
          { card: "BT1-010", as: "security-one" },
          { card: "BT1-011", as: "security-two" },
        ],
        deck: ["BT1-012", "BT1-013"],
      },
      1: {
        battleArea: [{ card: "BT1-028", as: "attacker", dp: 1000 }],
        deck: ["BT1-014", "BT1-015"],
        security: ["BT1-016", "BT1-017"],
      },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("angemon"), "Blocker")).toBe(true);
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("angemon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every(({ permanentId }) => permanentId !== attackerId));
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("security-one").instanceId,
      s.inst("security-two").instanceId,
    ]);
  });

  it("does not grant inherited Blocker without a purple Digimon or to a non-family Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-038", as: "host", under: ["BT11-042"] },
          { card: "BT1-010", as: "nonFamily" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("nonFamily"), "Blocker")).toBe(false);
  });
});
