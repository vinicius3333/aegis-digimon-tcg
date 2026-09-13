import { beforeEach, describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { settle, setupEngine } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";
import { cite } from "./_kb.js";

describe("Unblockable public attack consumer", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0151",
      "12-1: an attack that cannot be blocked proceeds to its declared target",
      "1c4e669751a989f9da2bdc3b1b198b4c2c4a03210f54b17ac1f6ba87faa9a566",
    );
  });
  it("skips an otherwise eligible blocker and reaches security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-042", as: "attacker" }] },
      1: { battleArea: [{ card: "AD1-005", as: "blocker" }], security: [{ card: "BT1-009", as: "security" }] },
    });
    await s.ready();
    const securityId = s.inst("security").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(securityId);
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(s.perm("blocker").isSuspended).toBe(false);
  });

  it("allows a plain Agumon attack to be blocked by the same printed blocker", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      1: { battleArea: [{ card: "AD1-005", as: "blocker" }], security: [{ card: "BT1-009", as: "security" }] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    const attackerInstanceId = s.perm("attacker").topCard.instanceId;
    const blockerId = s.perm("blocker").permanentId;
    const securityId = s.inst("security").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === attackerInstanceId));
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === attackerInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === blockerId)).toBe(true);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([securityId]);
  });

  it("grants Unblockable to a matching Knightmon recipient through the public attack path", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-042", as: "source" },
          { card: "EX4-021", as: "knight" },
        ],
      },
      1: { battleArea: [{ card: "AD1-005", as: "blocker" }], security: [{ card: "BT1-009", as: "security" }] },
    });
    await s.ready();
    const securityId = s.inst("security").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("knight").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(securityId);
    expect(s.perm("blocker").isSuspended).toBe(false);
  });

  it("keeps a nonmatching recipient blockable on the same granted board", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-042", as: "source" },
          { card: "BT1-009", as: "plain" },
        ],
      },
      1: { battleArea: [{ card: "AD1-005", as: "blocker" }], security: [{ card: "BT1-009", as: "security" }] },
    });
    await s.ready();
    const plainId = s.perm("plain").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plain").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === plainId));
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("security").instanceId]);
  });

  it("expires EX4-042's matching-name grant at the natural opponent turn boundary", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-042", as: "source" },
          { card: "AD1-005", as: "blocker" },
        ],
        security: [{ card: "BT1-009", as: "security0" }],
        deck: ["BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [{ card: "EX4-040", as: "knight" }],
        security: [{ card: "BT1-009", as: "security1" }],
        deck: ["BT1-009", "BT1-009"],
      },
    });
    await s.ready();
    const knightId = s.perm("knight").topCard.instanceId;
    const blockerId = s.perm("blocker").permanentId;
    const securityId = s.inst("security0").instanceId;
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(observe(s.engine).isRestricted(s.perm("knight"), "cantBeBlocked")).toBe(true);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(observe(s.engine).isRestricted(s.perm("knight"), "cantBeBlocked")).toBe(false);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("knight").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
      expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(knightId);
      expect(
        s.state.players[0]!.battleArea.some(({ permanentId, isSuspended }) => permanentId === blockerId && isSuspended),
      ).toBe(true);
      expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([securityId]);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await loop;
    }
  });
});
