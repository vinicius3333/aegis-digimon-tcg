import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX10-003.js";

describe("EX10-003 Tumblemon", () => {
  it("models the inherited opponent-attack prevention with the exact three-card cost", () => {
    const effect = compiled.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "EndAttack",
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    isSelfRef: true,
                    zone: "digivolutionCards",
                    nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }],
                  },
                  count: 3,
                },
              },
            },
          ],
        },
      ],
    });
    // The printed cost is "3 [Mineral] or [Rock] trait CARDS". A `kind` gate would silently
    // exclude the Digi-Egg at the bottom of the stack.
    const costFilter = irNode(effect).actions?.[0]?.actions?.[0]?.cost?.target?.filter;
    expect(costFilter).toBeDefined();
    expect(costFilter?.kind).toBeUndefined();
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("trashes exactly 3 matching sources to end an opponent attack before the security check", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-033",
              as: "host",
              under: [
                { card: "EX10-003", as: "tumblemon" },
                { card: "EX10-025", as: "mineral1" },
                { card: "BT13-061", as: "rock" },
                { card: "EX10-025", as: "mineral2" },
              ],
            },
          ],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("mineral1").instanceId, s.inst("rock").instanceId, s.inst("mineral2").instanceId);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("host").stack.length === 1);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX10-003"]);
  });

  it("counts the [Rock] Digi-Egg itself toward the cost and skips a non-matching stack card", async () => {
    // FAILS-WHEN-REVERTED: with `kind: ["Digimon"]` back on the cost filter only 2 of these 4
    // stack cards qualify, the cost is unpayable, and the security check resolves.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-033",
              as: "host",
              under: [
                { card: "EX10-003", as: "tumblemon" },
                { card: "EX10-025", as: "mineral" },
                { card: "BT13-061", as: "rock" },
                { card: "BT1-010", as: "reptile" },
              ],
            },
          ],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("host").stack.length === 1);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT13-061", "EX10-003", "EX10-025"]);
  });

  it("cannot pay with 2 matching sources and does not partially trash the stack", async () => {
    // KB Q5007: a "by" condition is unmet unless every required card is trashed.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-033",
              as: "host",
              under: ["EX10-003", "EX10-025", "BT1-010"],
            },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.perm("host").stack).toHaveLength(3);
  });

  it("leaves the stack intact and lets the attack continue when the optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-033",
              as: "host",
              under: ["EX10-003", "EX10-025", "BT13-061", "EX10-025"],
            },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 7000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.perm("host").stack).toHaveLength(4);
  });

  it("Q5008: ends the attack at declaration, so no block timing occurs", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-033",
              as: "host",
              under: ["EX10-003", "EX10-025", "BT13-061", "EX10-025"],
            },
            { card: "ST18-07", as: "blocker" },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("host").stack.length === 1);

    // The blocker is eligible, so a block window would have opened had the attack survived
    // the declaration timing.
    expect(s.perm("blocker").isSuspended).toBe(false);
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("Q5009: ends the attack of an attacker unaffected by the opponent's Digimon effects", async () => {
    // EX8-029 keeps its controller's [DS] trait Digimon — itself included — unaffected by the
    // opponent's Digimon effects while that player has 1 or more memory. "End the attack"
    // changes the timing rather than affecting the attacker, so the inherited effect still
    // ends the attack.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-033",
              as: "host",
              under: ["EX10-003", "EX10-025", "BT13-061", "EX10-025"],
            },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "EX8-029", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasRestriction(s.perm("attacker"), "beAffected", "Digimon")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("host").stack.length === 1);

    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });

  it("fires once per opponent's turn and resets on the next opponent's turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-033",
              as: "host",
              under: [
                { card: "EX10-003", as: "tumblemon" },
                // Inert [Mineral]/[Rock] fixtures: EX10-025 carries an inherited "when effects
                // trash this card" deletion that would remove the second attacker mid-test.
                { card: "BT10-062", as: "m1" },
                { card: "BT10-064", as: "r1" },
                { card: "BT10-062", as: "m2" },
                { card: "BT10-062", as: "m3" },
                { card: "BT10-064", as: "r2" },
                { card: "BT10-062", as: "m4" },
              ],
            },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker1", dp: 7000 },
            { card: "BT1-011", as: "attacker2", dp: 7000 },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("m1").instanceId, s.inst("r1").instanceId, s.inst("m2").instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker1").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.length === 4);
    expect(s.state.players[0]!.security).toHaveLength(2);

    // Second attack on the SAME opponent's turn: the once-per-turn gate refuses, so nothing
    // is trashed and the security check resolves.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker2").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.perm("host").stack).toHaveLength(4);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    preferred.length = 0;
    preferred.push(s.inst("m3").instanceId, s.inst("r2").instanceId, s.inst("m4").instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker1").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.length === 1);

    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX10-003"]);
    expect(s.state.players[0]!.security).toHaveLength(1);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
  it("hatches from the egg deck, grows in breeding, moves to the battle area and ends an attack there", async () => {
    // The full public Digi-Egg route. Every zone change is an intent: `hatchEgg` takes the egg
    // out of the egg deck, three `digivolve` intents build the stack in the breeding area
    // ([Rock] egg -> [Rock] Lv.3 -> [Mineral] Lv.4 -> [Rock] Lv.5 top), `moveFromBreeding`
    // carries that stack into the battle area, and only then does the opponent attack.
    // One breeding action is legal per turn (Comprehensive Rules 6-4-1), so the hatch and the
    // move sit on different turns of the real turn loop.
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "EX10-003", as: "egg" }],
          hand: [
            { card: "BT4-065", as: "gotsumon" },
            { card: "BT10-062", as: "golemon" },
            { card: "BT10-064", as: "gogmamon" },
            "BT1-009",
          ],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 7000 }],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const p0 = s.state.players[0]!;
    const ownBreedingWindow = async () => {
      await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
      expect(s.state.phase).toBe(Phase.Breeding);
    };
    const digivolveInBreeding = async (alias: "gotsumon" | "golemon" | "gogmamon") => {
      await advance(s.engine).waitForMainPhase(0);
      const instanceId = s.inst(alias).instanceId;
      expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: p0.breeding!.permanentId, instanceId })).toEqual(
        { ok: true },
      );
      await settle(() => p0.breeding?.topCard?.instanceId === instanceId);
      advance(s.engine).endMainPhaseIfOpen(0);
    };
    const passOpponentTurn = async () => {
      await advance(s.engine).waitForMainPhase(1);
      advance(s.engine).endMainPhaseIfOpen(1);
    };

    const loop = s.engine.startTurnLoop();

    // Turn 1 (seat 0): hatch, then digivolve the hatched egg into the Lv.3.
    await ownBreedingWindow();
    expect(p0.eggDeck).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => p0.breeding !== undefined);
    expect(p0.eggDeck).toHaveLength(0);
    expect(p0.breeding!.topCard!.cardId).toBe("EX10-003");
    expect(p0.breeding!.stack).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "hatched")).toBe(true);
    const eggPermanentId = p0.breeding!.permanentId;
    // The hatch spent this turn's single breeding action: the window is closed and Main is
    // open, so a move in the same turn is refused.
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({
      ok: false,
      reason: "wrong-phase",
    });
    await digivolveInBreeding("gotsumon");
    expect(p0.breeding!.stack.map(({ cardId }) => cardId)).toEqual(["EX10-003"]);

    // Turn 3 (seat 0): skip the breeding window, digivolve to the Lv.4.
    await passOpponentTurn();
    await ownBreedingWindow();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await digivolveInBreeding("golemon");

    // Turn 5 (seat 0): skip again, digivolve to the Lv.5 top so three cards sit underneath.
    await passOpponentTurn();
    await ownBreedingWindow();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await digivolveInBreeding("gogmamon");
    expect(p0.breeding!.stack.map(({ cardId }) => cardId)).toEqual(["EX10-003", "BT4-065", "BT10-062"]);
    expect(p0.battleArea).toHaveLength(0);

    // Turn 7 (seat 0): move the stack to the battle area.
    await passOpponentTurn();
    await ownBreedingWindow();
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => p0.battleArea.length === 1);
    expect(p0.breeding).toBeUndefined();
    const carrier = p0.battleArea[0]!;
    expect(carrier.permanentId).toBe(eggPermanentId);
    expect(carrier.topCard!.cardId).toBe("BT10-064");
    expect(carrier.stack.map(({ cardId }) => cardId)).toEqual(["EX10-003", "BT4-065", "BT10-062"]);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);

    // Turn 8 (seat 1): the opponent attacks the player and the inherited clause fires on the
    // carrier the route built.
    await advance(s.engine).waitForMainPhase(1);
    const securityBefore = p0.security.length;
    const trashBefore = p0.trash.map(({ instanceId }) => instanceId);
    preferred.push(...carrier.stack.map(({ instanceId }) => instanceId));
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && carrier.stack.length === 0);

    expect(carrier.stack).toHaveLength(0);
    expect(carrier.topCard!.cardId).toBe("BT10-064");
    const newlyTrashed = p0.trash.filter(({ instanceId }) => !trashBefore.includes(instanceId));
    expect(newlyTrashed.map(({ cardId }) => cardId).sort()).toEqual(["BT10-062", "BT4-065", "EX10-003"]);
    expect(p0.security).toHaveLength(securityBefore);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
