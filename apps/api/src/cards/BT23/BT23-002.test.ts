import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./BT23-002.js";

describe("BT23-002 Yokomon", () => {
  it("matches the catalog and carries the printed inherited contract", () => {
    expect(getCardDefinition("BT23-002")).toMatchObject({
      cardId: "BT23-002",
      nameEn: "Yokomon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      attributes: ["-"],
      types: ["Bulb", "CS"],
      inheritedEffectText: "[When Attacking] [Once Per Turn] If this Digimon has the [CS] trait, ＜Draw 1＞",
    });
    expect(compiled.effects).toEqual([
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "Draw",
            controller: "mine",
            amount: 1,
            condition: {
              kind: "selfHasTrait",
              filter: { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
              raw: "this Digimon has the [CS] trait",
            },
          },
        ],
        isInherited: true,
        frequency: "OncePerTurn",
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("draws for a CS carrier, only once in the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT22-043", under: ["BT23-002"], as: "attacker", dp: 20_000 }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "target1", suspended: true },
          { card: "BT1-010", as: "target2", suspended: true },
        ],
      },
    });
    const attack = (target: "target1" | "target2") =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent" as const, permanentId: s.perm(target).permanentId },
      });

    expect(attack("target1")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1 && !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(attack("target2")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw when the carrier lacks the CS trait", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", under: ["BT23-002"], as: "attacker" }], deck: ["BT1-009"] },
      1: { security: ["BT1-001"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("tracks once-per-turn use independently for two Yokomon sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT22-043", under: ["BT23-002"], as: "first", dp: 20_000 },
          { card: "BT22-044", under: ["BT23-002"], as: "second", dp: 20_000 },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "target1", suspended: true },
          { card: "BT1-010", as: "target2", suspended: true },
        ],
      },
    });

    for (const [attacker, target] of [
      ["first", "target1"],
      ["second", "target2"],
    ] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(attacker).permanentId,
          target: { kind: "permanent", permanentId: s.perm(target).permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
    }

    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("publicly evolves a CS egg from breeding through the alternate recipe", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT23-002", as: "egg" }, hand: [{ card: "BT23-006", as: "host" }] },
    });
    await s.ready();
    s.state.memory = 0;
    const eggId = s.inst("egg").instanceId;
    const hostId = s.inst("host").instanceId;
    const permanentId = s.perm("egg").permanentId;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: hostId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === hostId);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.permanentId).toBe(permanentId);
    expect(s.state.players[0]!.breeding?.stack[0]!.instanceId).toBe(eggId);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(hostId);
  });

  it("resets the inherited draw on the next own turn through the public turn flow", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT22-043", under: ["BT23-002"], as: "attacker" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
      },
      1: {
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        security: ["BT1-001", "BT1-002", "BT1-003"],
      },
    });
    const attackPlayer = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const firstHand = s.state.players[0]!.hand.length;
    expect(attackPlayer()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand).toHaveLength(firstHand + 1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const secondHand = s.state.players[0]!.hand.length;
    expect(attackPlayer()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand).toHaveLength(secondHand + 1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
