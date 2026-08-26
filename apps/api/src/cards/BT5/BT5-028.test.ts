import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { makeInstance, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-028.js";

describe("BT5-028 CrysPaledramon", () => {
  it("trashes the bottom source of every opposing Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-010", as: "base" },
            { card: "BT5-031", as: "own", under: ["AD1-010", "BT5-028"] },
          ],
          hand: [{ card: "BT5-028", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT5-031", under: ["AD1-010", "BT5-028"], as: "a" },
            { card: "BT5-028", under: ["AD1-010"], as: "b" },
            { card: "BT5-028", as: "sourceLess" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("a").stack.length === 1 && s.perm("b").stack.length === 0 && s.perm("sourceLess").stack.length === 0,
    );

    expect(s.perm("a").stack[0]?.cardId).toBe("BT5-028");
    expect(s.perm("own").stack).toHaveLength(2);
  });

  it("grants Security Attack +1 to its host while the opponent has a Digimon without sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-031", as: "host", under: ["BT5-028"] }] },
      1: { battleArea: [{ card: "BT5-020", as: "sourceLess" }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("does not grant Security Attack +1 when every opponent Digimon has a source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-031", as: "host", under: ["BT5-028"] }] },
      1: { battleArea: [{ card: "BT5-020", as: "sourceful", under: ["BT1-010"] }] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });

  it("updates the inherited condition as an opposing source appears or disappears and only on its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-031", as: "host", under: ["BT5-028"] }] },
      1: { battleArea: [{ card: "BT5-020", as: "opponent", under: ["BT1-010"] }] },
    });

    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
    s.perm("opponent").stack.pop();
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    s.perm("opponent").stack.push(makeInstance("BT1-010", 1, true));
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
    s.state.turnSeat = 1;
    s.perm("opponent").stack.pop();
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });

  it("makes the inherited Security Attack +1 observable as a second security check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-031", as: "host", under: ["BT5-028"] }] },
      1: { battleArea: [{ card: "BT5-020", as: "sourceLess" }], security: ["BT5-023", "BT5-023"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
