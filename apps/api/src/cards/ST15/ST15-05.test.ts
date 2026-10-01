import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST15-05 ToyAgumon", () => {
  it("has Blocker and loses 2 memory when attacking the opponent player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-05", as: "toy" }] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("toy"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("toy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("does not lose memory when attacking a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-05", as: "toy" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 1000 }] },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("toy").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(5);
  });

  it("does not lose memory when another Digimon attacks a player", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST15-05", as: "toy" },
          { card: "BT1-009", as: "other" },
        ],
      },
      1: { security: ["BT1-010"] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(5);
  });
});

describe("ST15-05 ToyAgumon — KB Q&A rulings", () => {
  it("still loses 2 memory when its attack on the player is then blocked (Q810)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-05", as: "toy" }] },
      1: {
        battleArea: [{ card: "ST15-05", dp: 1000, as: "blocker" }],
        security: ["BT1-001"],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("toy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    const eventIndex = (kind: string) => s.events.findIndex((event) => event.kind === kind);
    const memoryLossIndex = s.events.findIndex(
      (event) => event.kind === "memoryChanged" && event.from === 5 && event.to === 3,
    );
    expect(memoryLossIndex).toBeGreaterThanOrEqual(0);
    expect(memoryLossIndex).toBeLessThan(eventIndex("blocked"));
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(3);
  });
});
