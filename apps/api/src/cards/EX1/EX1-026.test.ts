import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./EX1-026.js";

describe("EX1-026 Gatomon", () => {
  it("gives exactly one opposing Digimon -2000 DP at the three-security threshold", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "host", under: ["BT1-006", "BT1-046", "EX1-026"] }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", dp: 5000 },
            { card: "BT1-010", as: "otherTarget", dp: 5000 },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.perm("otherTarget").currentDP).toBe(5000);
  });

  it("does not modify an opponent Digimon below three security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-057", as: "host", under: ["BT1-006", "BT1-046", "EX1-026"] }],
        security: ["BT1-009", "BT1-010"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], security: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("modifies only once across two player attacks in one turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-057", as: "host", under: ["BT1-006", "BT1-046", "EX1-026"] }],
        hand: [{ card: "BT1-036", as: "unsuspender" }],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    s.state.memory = 10;
    await s.ready();
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("unsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("expires the modifier at the end of the attacking player's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "host", under: ["BT1-006", "BT1-046", "EX1-026"] }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("resolves the inherited effect only after a legal evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-046", as: "source" }],
        hand: [
          { card: "EX1-026", as: "gatomon" },
          { card: "BT1-057", as: "host" },
        ],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], security: ["BT1-009"] },
    });
    s.state.memory = 7;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("gatomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX1-026");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.memory).toBe(5);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT1-057");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT1-046", "EX1-026"]);
    expect(s.state.memory).toBe(3);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("rejects an illegal non-yellow evolution without changing the source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "invalidSource" }], hand: [{ card: "EX1-026", as: "gatomon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("gatomon").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("invalidSource").topCard.cardId).toBe("BT1-009");
    expect(s.perm("invalidSource").stack).toHaveLength(0);
    expect(s.state.memory).toBe(5);
  });

  it("does not use Gatomon as an inherited effect while it is the top card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-026", as: "top" }], security: ["BT1-009", "BT1-010", "BT1-011"] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], security: ["BT1-009"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("top").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.perm("target").currentDP).toBe(5000);
  });
});
