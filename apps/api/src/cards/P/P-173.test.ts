import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-173.js";

describe("P-173 RustTyrannomon", () => {
  it("requires a level 5 Tyrannomon for its alternate digivolution", () => {
    expect(runtimeCompiledCard("P-173")!.digivolutionRequirement).toEqual([
      { level: 5, names: ["Tyrannomon"], cost: 4, isAlternate: true },
    ]);
  });

  it("encodes Collision, Piercing, Blocker, and De-Digivolve 4", () => {
    const card = runtimeCompiledCard("P-173")!;
    expect(card.effects.flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Collision", raw: "＜Collision＞" },
      { keyword: "Piercing", raw: "＜Piercing＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        { kind: "DeDigivolve", amount: 4, target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } } },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          actions: [{ kind: "Unsuspend" }],
          fireCondition: {
            kind: "allOf",
            conditions: [
              { kind: "triggerRemovalCause", removalCause: "byBattle" },
              { kind: "triggerDeletedIsOpponent" },
            ],
          },
        },
      ],
    });
  });

  it("exposes Collision on the live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-173", as: "rust" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("rust"), "Collision")).toBe(true);
  });

  it("de-digivolves four opposing cards when it digivolves", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-046", as: "base" }],
        hand: [{ card: "P-173", as: "rust" }],
        deck: Array(20).fill("BT1-013"),
        security: ["BT1-090", "BT1-090"],
      },
      1: {
        battleArea: [{ card: "BT1-084", as: "opponent", under: ["BT1-009", "BT1-014", "BT1-020", "BT1-025"] }],
        deck: Array(20).fill("BT1-013"),
        security: ["BT1-090", "BT1-090"],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const rustId = s.inst("rust").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: rustId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "P-173" && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").topCard?.instanceId).toBe(rustId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(baseId);
    expect(s.perm("opponent").stack).toHaveLength(0);
    expect(s.perm("opponent").topCard?.cardId).toBe("BT1-009");
  });

  it("unsuspends once when opposing Digimon are deleted in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-173", as: "rust" }],
          hand: ["BT1-009"],
          deck: Array(20).fill("BT1-013"),
          security: ["BT1-090", "BT1-090", "BT1-090"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponentOne", suspended: true },
            { card: "BT1-009", as: "opponentTwo", suspended: true },
            { card: "BT1-009", as: "opponentThree", suspended: true },
          ],
          deck: Array(20).fill("BT1-013"),
          security: ["BT1-090", "BT1-090", "BT1-090", "BT1-090", "BT1-090"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opponentOnePermanentId = s.perm("opponentOne").permanentId;
    const opponentTwoPermanentId = s.perm("opponentTwo").permanentId;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rust").permanentId,
        target: { kind: "permanent", permanentId: opponentOnePermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === opponentOnePermanentId) &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("rust").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rust").permanentId,
        target: { kind: "permanent", permanentId: opponentTwoPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === opponentTwoPermanentId) &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("rust").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("opponentThree").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rust").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponentThree").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("rust").isSuspended).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("uses Piercing to check security after deleting a Digimon in a permanent battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-173", as: "rust" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent", suspended: true }],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opponentPermanentId = s.perm("opponent").permanentId;
    await s.ready();
    const piercingAttackResult = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("rust").permanentId,
      target: { kind: "permanent", permanentId: opponentPermanentId },
    });
    expect(piercingAttackResult).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentPermanentId),
    );
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentPermanentId)).toBe(
      false,
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not unsuspend when the opponent deletes your other Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-173", as: "rust", suspended: true },
            { card: "BT1-009", as: "victim", dp: 1000, suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const victimId = s.perm("victim").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === victimId));
    expect(s.perm("rust").isSuspended).toBe(true);
  });

  it("acts as a real Blocker and redirects an opponent's player attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-173", as: "rust" }], security: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      // Deleting the attacker in the block battle offers rust's own optional
      // unsuspend; decline it so the assertion below sees the ordinary suspended
      // Blocker outcome.
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("rust").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("rust").isSuspended).toBe(true);
  });
});
