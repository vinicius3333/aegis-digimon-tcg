import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT2/BT2-013.js";
import "../ST4/ST4-08.js";
import "./ST4-04.js";

describe("ST4-04 Palmon", () => {
  it("gives its host +2000 DP when attacking an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST4-10", under: ["ST4-04"], as: "host" }] },
      1: { battleArea: [{ card: "ST4-03", as: "target", suspended: true }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === 9000);
    expect(s.perm("host").currentDP).toBe(9000);
  });

  it("does not activate when the declared target is the opposing player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST4-10", under: ["ST4-04"], as: "host" }] },
      1: { security: ["ST4-03"] },
    });
    const baseDp = s.perm("host").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("host").currentDP).toBe(baseDp);
  });

  it("does not activate when a player attack is redirected by Blocker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST4-10", under: ["ST4-04"], as: "host" }] },
        1: { battleArea: [{ card: "ST4-08", as: "blocker" }], security: ["ST4-03"] },
      },
      { autoSelectCards: true },
    );
    const baseDp = s.perm("host").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("host").currentDP).toBe(baseDp);
  });
});

describe("ST4-04 Palmon — KB Q&A rulings", () => {
  it("does not activate when the opponent blocks an attack declared against the player (Q647)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST4-10", under: ["ST4-04"], as: "host" }] },
        1: { battleArea: [{ card: "ST4-08", as: "blocker" }], security: ["ST4-03"] },
      },
      { autoSelectCards: true },
    );
    const baseDp = s.perm("host").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.perm("host").currentDP).toBe(baseDp);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("host").currentDP).toBe(baseDp);

    const declaredAgainstDigimon = setupEngine({
      0: { battleArea: [{ card: "ST4-10", under: ["ST4-04"], as: "host" }] },
      1: { battleArea: [{ card: "ST4-08", as: "blocker", suspended: true }], security: ["ST4-03"] },
    });
    expect(
      declaredAgainstDigimon.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: declaredAgainstDigimon.perm("host").permanentId,
        target: { kind: "permanent", permanentId: declaredAgainstDigimon.perm("blocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => declaredAgainstDigimon.perm("host").currentDP === baseDp + 2000);
    expect(declaredAgainstDigimon.perm("host").currentDP).toBe(baseDp + 2000);
  });

  it.fails("activates when attacking an opponent's Digimon even if another effect deletes that Digimon first (Q648)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST4-10", under: ["BT2-013", "ST4-04"], as: "host" }] },
        1: { battleArea: [{ card: "ST4-03", as: "target", suspended: true }] },
      },
      { autoSelectCards: true, preferTriggerKeys: ["BT2-013"] },
    );
    const baseDp = s.perm("host").currentDP;
    const targetInstanceId = s.perm("target").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === targetInstanceId));
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("host").currentDP).toBe(baseDp + 2000);
  });
});
