import { observe } from "../../engine/testkit/observe.js";
import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./BT13-036.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./BT13-037.js";
import "./BT13-031.js";

describe("BT13-036 Liollmon", () => {
  it("gains memory on security removal and preserves the inherited security-count debuff", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenSecurityRemoved" })],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        expect.objectContaining({
          kind: "ModifyDP",
          amount: -2000,
          condition: expect.objectContaining({ kind: "totalSecurityCount", value: 6 }),
        }),
      ],
    });
  });

  it("gains memory from public own-security costs once per turn and resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-037", as: "host" },
            { card: "BT13-036", as: "lioll" },
          ],
          hand: [
            { card: "BT1-036", as: "garuru" },
            { card: "BT1-010", as: "spare" },
          ],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT13-031", as: "target" }],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const liollId = s.perm("lioll").permanentId;
    s.state.turnSeat = 0;
    s.state.memory = 9;
    await s.ready();
    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(10);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garuru").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(4);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(4);
    expect(s.perm("lioll").permanentId).toBe(liollId);
    expect(s.state.players[0]!.security).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("does not gain memory from its controller's security removal during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-036", as: "lioll" }], security: ["BT1-010"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const before = s.state.memory;

    await advance(s.engine).verb.trashFromSecurity(0, 1);

    expect(s.state.memory).toBe(before);
  });

  it("the inherited effect sums both security stacks, debuffs an opponent, and is once per turn (Q2288)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: [{ card: "BT13-036", as: "source" }] }],
          hand: [
            { card: "BT1-036", as: "garuru" },
            { card: "BT1-010", as: "spare" },
          ],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT13-031", as: "target" }],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    const baseDP = s.perm("target").currentDP;
    const sourceId = s.inst("source").instanceId;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(baseDP - 2000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garuru").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(4);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(baseDP - 2000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    expect(s.perm("target").currentDP).toBe(baseDP);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(baseDP - 2000);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(sourceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("the inherited effect does not debuff above six combined security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["BT13-036"] }],
          security: ["BT1-010", "BT1-009", "BT1-015", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT13-031", as: "target" }],
          security: ["BT1-009", "BT1-015", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    const baseDP = s.perm("target").currentDP;

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("target").currentDP).toBe(baseDP);
  });

  it("digivolves from a yellow level 2 for 0 memory", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-006", as: "base" }, hand: [{ card: "BT13-036", as: "lioll" }] },
    });
    s.state.memory = 3;
    const baseId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lioll").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-036");
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
  });
});
