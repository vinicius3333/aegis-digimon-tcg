import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-052.js";

describe("EX2-052 ADR-06 Horn Striker", () => {
  it("has Rush during its turn while Mother D-Reaper is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-052", as: "striker" }, "EX2-007"] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("striker"), "Rush")).toBe(true);
  });

  it("can attack the player on the same turn it is played with Mother D-Reaper", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["EX2-007"],
        hand: [{ card: "EX2-052", as: "striker" }],
      },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("striker").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("striker").instanceId),
    );
    expect(observe(s.engine).hasKeyword(s.perm("striker"), "Rush")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("striker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("does not gain Rush without Mother D-Reaper and cannot attack that turn", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX2-052", as: "striker" }] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("striker").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("striker").instanceId),
    );
    expect(observe(s.engine).hasKeyword(s.perm("striker"), "Rush")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("striker").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
  });

  it("does not gain Rush during the opponent's turn even while Mother D-Reaper is in play", async () => {
    const s = setupEngine({
      0: { battleArea: ["EX2-007", { card: "EX2-052", as: "striker" }] },
      1: { deck: ["BT1-001"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("striker"), "Rush")).toBe(false);
  });
});
