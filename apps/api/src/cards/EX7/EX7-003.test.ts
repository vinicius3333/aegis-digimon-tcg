import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-003.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("EX7-003 Kyaromon", () => {
  it("inherits -2000 DP to the opposing security Digimon battle value on your turn", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifySecurityDP", amount: -2000, controller: "opponent", duration: "permanent" }],
    }));

  it("applies -2000 to the opposing Security Digimon, but not an opposing battle-area Digimon or Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-045", under: ["EX7-003"], as: "host" },
          { card: "BT1-009", dp: 2000, as: "digimonAttacker" },
          { card: "BT1-009", dp: 2000, as: "secondDigimonAttacker" },
          { card: "BT1-009", dp: 2000, as: "tamerAttacker" },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-009", dp: 3000, as: "battleTarget" }],
        security: [
          { card: "BT1-009", as: "securityDigimon" },
          { card: "BT1-009", as: "secondSecurityDigimon" },
          { card: "EX7-064", as: "securityTamer" },
        ],
      },
    });
    const battleTarget = s.perm("battleTarget");
    await s.ready();

    expect(observe(s.engine).securityDp(1)).toBe(-2000);
    expect(battleTarget.currentDP).toBe(3000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("digimonAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009"));
    assertNoLoudGap(s);

    // A 2000 attacker survives the 3000-DP Security Digimon only because EX7-003 reduces it
    // to 1000 DP. The opposing battle-area Digimon remains exactly 3000 DP.
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("digimonAttacker").permanentId)).toBe(
      true,
    );
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(battleTarget.currentDP).toBe(3000);

    // The second check proves the same reduction applies to another Security Digimon.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondDigimonAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(
      s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("secondDigimonAttacker").permanentId),
    ).toBe(true);

    // The third check reveals a Tamer, not a Security Digimon. The neutral fixture is trashed,
    // and the third attacker is unaffected by the security-only modifier.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tamerAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("tamerAttacker").permanentId)).toBe(
      true,
    );
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityChecked", revealedCardId: "EX7-064", resolution: "trashed" }),
    );
    assertNoLoudGap(s);
  });

  it("does not reduce the owner's security Digimon during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-045", under: ["EX7-003"], as: "host" }],
        security: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-009", dp: 2000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).securityDp(1)).toBe(0);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("attacker").permanentId)).toBe(false);
    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "securityChecked",
        revealedCardId: "BT1-009",
        resolution: "battle",
        battle: { attackerDeleted: true, securityDigimonDeleted: false },
      }),
    );
    assertNoLoudGap(s);
  });

  it("carries the inherited effect through hatch -> zero-cost digivolve -> move, with the draw and source stack preserved", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "EX7-003", as: "egg" }],
          hand: [{ card: "BT1-045", as: "evolver" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013", "BT1-014"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX7-003");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    const deckBeforeDigivolve = s.state.players[0]!.deck.length;
    const bonusDrawInstanceId = s.state.players[0]!.deck[0]!.instanceId;

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-045");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.deck).toHaveLength(deckBeforeDigivolve - 1);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === bonusDrawInstanceId)).toBe(true);
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    const carrier = s.state.players[0]!.battleArea[0]!;
    expect(carrier.topCard?.cardId).toBe("BT1-045");
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect(observe(s.engine).securityDp(1)).toBe(-2000);

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: carrier.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === carrier.permanentId)).toBe(true);
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "securityChecked", resolution: "battle" }));
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("rejects the same yellow Lv.3 route from a non-yellow Digi-Egg source without paying or drawing", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "EX7-004", as: "wrongEgg" }],
        hand: [{ card: "BT1-045", as: "evolver" }],
        deck: ["BT1-013", "BT1-014"],
        security: ["BT1-013"],
      },
      1: { deck: ["BT1-013"], security: ["BT1-014"] },
    });
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX7-004");
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    const memoryBefore = s.state.memory;
    const deckBefore = s.state.players[0]!.deck.length;
    const handBefore = s.state.players[0]!.hand.length;

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("EX7-004");
    expect(s.state.players[0]!.breeding!.stack).toHaveLength(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
