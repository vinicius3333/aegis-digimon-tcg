import { EffectTiming, type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-086.js";

describe("BT2-086 Rina Shinomiya", () => {
  it("may suspend itself to give an attacking blue Digimon +1000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-086", as: "rina" },
            { card: "BT2-021", as: "attacker" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true },
    );
    const baseDP = s.perm("attacker").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rina").isSuspended && s.perm("attacker").currentDP === baseDP + 1000, 1_000);
    expect(s.perm("attacker").currentDP).toBe(baseDP + 1000);
  });

  it("may decline the attack bonus and keeps Rina unsuspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-086", as: "rina" },
            { card: "BT2-021", as: "attacker" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true },
    );
    const baseDP = s.perm("attacker").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking);

    expect(s.perm("rina").isSuspended).toBe(false);
    expect(s.perm("attacker").currentDP).toBe(baseDP);
  });

  it("does not activate for a non-blue attacker", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-086", as: "rina" },
          { card: "BT1-010", as: "attacker" },
        ],
      },
      1: { security: ["BT1-001"] },
    });
    const baseDP = s.perm("attacker").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking);

    expect(s.perm("rina").isSuspended).toBe(false);
    expect(s.perm("attacker").currentDP).toBe(baseDP);
  });

  it("adds a revealed Digimon with Vee in its name to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT2-086", as: "source" }],
          deck: [{ card: "BT2-021", as: "veemon" }, "BT2-022", "BT2-023"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const veemonId = s.inst("veemon").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === veemonId));
    expect(player.deck).toHaveLength(2);
    expect(player.deck.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT2-022", "BT2-023"]));
  });

  it("adds only a Digimon with Vee in its name from the revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT2-086", as: "source" }],
          deck: [
            { card: "BT2-026", as: "validVeedramon" },
            { card: "BT12-101", as: "veeOption" },
            { card: "BT1-009", as: "nonVeeDigimon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("validVeedramon").instanceId),
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("veeOption").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-086", as: "securityTamer", faceUp: true }] } });
    const instanceId = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
  });
});
