import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-008.js";
import "../BT8/BT8-104.js";
import "../BT6/BT6-017.js";
import "../ST1/ST1-07.js";

describe("EX1-008 MetalGreymon", () => {
  it("deletes an opposing Digimon with 4000 DP or less when attacking a player", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-008", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "small", dp: 4000 },
            { card: "BT1-011", as: "large", dp: 5000 },
          ],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const smallId = s.perm("small").topCard.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === smallId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not delete an opposing Digimon when the attack targets a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-008", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 8000, suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("deletes the eligible target before the public Blocker response (Q3197)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-008", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "ST18-07", as: "smallBlocker", dp: 4000 },
            { card: "BT1-072", as: "remainingBlocker" },
          ],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("smallBlocker").permanentId, s.perm("smallBlocker").topCard.instanceId);
    const deletedId = s.perm("smallBlocker").topCard.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === deletedId));
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("remainingBlocker").permanentId],
    });
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("remainingBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
  });

  it("grants inherited Piercing to a Machine host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-066", as: "machine", under: ["EX1-008"] }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("machine"))).toBe(true);
  });

  it("grants inherited Piercing through the Dragonkin alternative", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-025", as: "dragon", under: ["EX1-008"] }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("dragon"))).toBe(true);
  });

  it("uses the Dragonkin alternative in a real battle and Piercing security check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-025", as: "dragon", under: ["EX1-008"] }] },
      1: { battleArea: [{ card: "BT1-070", as: "target", dp: 3000, suspended: true }], security: ["BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dragon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("keeps Piercing's already-open second check after source loss while Security Attack +1 remains (Q3196)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-017", as: "attacker", under: ["ST1-07", "EX1-008"] }] },
        1: {
          battleArea: [{ card: "BT1-070", as: "target", dp: 3000, suspended: true }],
          security: ["BT8-104", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(2);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.perm("attacker").topCard.cardId).toBe("EX1-008");
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT6-017")).toBe(true);
  });

  it("stops the next Piercing check when De-Digivolve removes Security Attack +1 (Q3196)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-017", as: "attacker", under: ["EX1-008"] }] },
        1: {
          battleArea: [{ card: "BT1-070", as: "target", dp: 3000, suspended: true }],
          security: ["BT8-104", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("attacker").topCard.cardId).toBe("EX1-008");
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);
  });

  it("limits inherited Piercing to your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-066", as: "machine", under: ["EX1-008"] }], hand: ["BT1-009"], deck: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-070" }], hand: ["BT1-009"], deck: ["BT1-001"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("machine"))).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("uses real battle resolution to pierce security after attacking a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-066", as: "attacker", under: ["EX1-008"] }] },
      1: {
        battleArea: [{ card: "BT1-070", as: "target", dp: 3000, suspended: true }],
        security: ["BT1-001", "BT1-001"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });
});
