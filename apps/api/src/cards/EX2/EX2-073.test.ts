import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT9/BT9-017.js";
import "./EX2-073.js";

describe("EX2-073 Gallantmon: Crimson Mode", () => {
  it("deletes every opposing Digimon tied for highest DP when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-011", as: "base" }], hand: [{ card: "EX2-073", as: "evolution" }] },
        1: { battleArea: ["EX2-029", "EX2-043", "EX2-019"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX2-043", "EX2-019"]);
  });

  it("uses the Gallantmon X line to reach 10 cards in trash and remove 2 security before the check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-017", as: "gallantmonX", under: ["EX2-011"] }],
          hand: [{ card: "EX2-073", as: "crimsonMode" }],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "highestA", dp: 10000 },
            { card: "BT2-047", as: "highestB", dp: 10000 },
            { card: "BT1-010", as: "lower", dp: 4000 },
          ],
          trash: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007", "BT1-008"],
          security: ["BT1-009", "BT1-011", "BT1-012", "BT1-013"],
          deck: ["BT1-014"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const highestIds = [s.perm("highestA").topCard.instanceId, s.perm("highestB").topCard.instanceId];

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gallantmonX").permanentId,
        instanceId: s.inst("crimsonMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      highestIds.every((instanceId) => s.state.players[1]!.trash.some((card) => card.instanceId === instanceId)),
    );
    expect(s.state.players[1]!.trash).toHaveLength(10);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallantmonX").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 1 &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
    );

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-010"]);
  });

  it("wins by the successful attack after its security trash reaches zero", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-017", as: "base", under: ["EX2-011"] }],
          hand: [{ card: "EX2-073", as: "attacker" }],
          deck: ["BT1-014"],
        },
        1: {
          trash: Array.from({ length: 10 }, () => "BT1-001"),
          security: ["EX2-070", "BT1-001"],
          deck: ["BT1-014"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("attacker").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX2-073");
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.gameOver === true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("EX2-070");
    expect(s.events.some((event) => event.kind === "effectActivated" && event.sourceCardId === "EX2-070")).toBe(false);
    expect(s.state.gameOver).toBe(true);
    expect(s.state.winnerSeat).toBe(0);
  });

  it("adds each complete ten-card trash group to its When Attacking security trash", async () => {
    const nineteen = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-017", as: "base", under: ["EX2-011"] }],
          hand: [{ card: "EX2-073", as: "attacker" }],
          deck: ["BT1-014"],
        },
        1: {
          trash: Array.from({ length: 19 }, () => "BT1-001"),
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
          deck: ["BT1-014"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    nineteen.state.memory = 6;
    expect(
      nineteen.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nineteen.perm("base").permanentId,
        instanceId: nineteen.inst("attacker").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => nineteen.perm("base").topCard.cardId === "EX2-073");
    await nineteen.ready();
    expect(
      nineteen.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: nineteen.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !(nineteen.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking);
    expect(nineteen.state.players[1]!.security).toHaveLength(2);

    const twenty = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-017", as: "base", under: ["EX2-011"] }],
          hand: [{ card: "EX2-073", as: "attacker" }],
          deck: ["BT1-014"],
        },
        1: {
          trash: Array.from({ length: 20 }, () => "BT1-001"),
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
          deck: ["BT1-014"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    twenty.state.memory = 6;
    expect(
      twenty.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: twenty.perm("base").permanentId,
        instanceId: twenty.inst("attacker").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => twenty.perm("base").topCard.cardId === "EX2-073");
    await twenty.ready();
    expect(
      twenty.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: twenty.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !(twenty.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking);
    expect(twenty.state.players[1]!.security).toHaveLength(1);
  });
});
