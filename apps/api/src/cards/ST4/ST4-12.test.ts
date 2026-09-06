import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST4-12.js";

describe("ST4-12 Rosemon", () => {
  it("stops an opposing Digimon from attacking or blocking when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST4-10", as: "base" }],
          hand: [{ card: "ST4-12", as: "evolving" }],
          security: ["ST4-03"],
          deck: ["ST1-02", "ST1-02"],
        },
        1: {
          battleArea: [{ card: "ST4-10", as: "target" }],
          hand: [{ card: "ST4-12", as: "targetEvolution" }],
          deck: ["ST1-02", "ST1-02"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("target"), "attack") &&
        observe(s.engine).isRestricted(s.perm("target"), "block"),
    );
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("targetEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.instanceId === s.inst("targetEvolution").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(false);
  });
});
