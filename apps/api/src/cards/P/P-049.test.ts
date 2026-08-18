import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-049.js";

describe("P-049 Phoenixmon", () => {
  it("gains Security Attack +1 for the turn when a Tamer is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-002", as: "base" }, { card: "BT1-089", as: "tamer" }], hand: [{ card: "P-049", as: "source" }], deck: ["BT1-009"] } }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack")).toBe(true);
  });

  it("does not gain Security Attack without a Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-002", as: "base" }], hand: [{ card: "P-049", as: "source" }], deck: ["BT1-009"] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => false, 30);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack")).toBe(false);
  });

  it("trashes the opponent's top security card when this Digimon is blocked", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-049", as: "attacker" }] },
      1: {
        battleArea: [{ card: "ST5-08", as: "blocker" }],
        security: [
          { card: "BT1-028", as: "security-top" },
          { card: "BT1-028", as: "security-bottom" },
        ],
      },
    });
    await s.ready();
    const topSecurityId = s.inst("security-top").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.trash.some((card) => card.instanceId === topSecurityId),
    );

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === topSecurityId)).toBe(true);
  });

  it("trashes security only once per turn even if it is blocked twice", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-049", as: "attacker" }] },
      1: {
        battleArea: [
          { card: "ST5-08", as: "blocker-a" },
          { card: "ST5-08", as: "blocker-b" },
        ],
        security: [
          { card: "BT1-028", as: "security-top" },
          { card: "BT1-028", as: "security-second" },
        ],
      },
    });
    await s.ready();
    const firstSecurityId = s.inst("security-top").instanceId;
    const secondSecurityId = s.inst("security-second").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker-a").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === firstSecurityId) &&
        s.events.filter((event) => event.kind === "combatResolved").length === 1,
    );
    await settle();

    await (s.engine as unknown as {
      primitives: { unsuspend(permanentIds: string[]): Promise<void> };
    }).primitives.unsuspend([s.perm("attacker").permanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "blockWindowOpened").length === 2);
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker-b").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "combatResolved").length === 2);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === firstSecurityId)).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.instanceId === secondSecurityId)).toBe(true);
  });
});
