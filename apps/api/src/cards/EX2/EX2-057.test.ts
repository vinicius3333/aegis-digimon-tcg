import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-057.js";
import "./EX2-014.js";

describe("EX2-057 Kenta Kitagawa", () => {
  it("may suspend when a blue Digimon is played to trash an opposing bottom source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-057", as: "kenta" }], hand: [{ card: "EX2-014", as: "blue" }] },
        1: {
          battleArea: [
            { card: "EX2-021", as: "target", under: ["EX2-003", "EX2-004"] },
            { card: "EX2-021", as: "untouched", under: ["EX2-003", "EX2-004"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blue").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("kenta").isSuspended && s.perm("target").stack.length === 1);
    expect(s.perm("kenta").isSuspended).toBe(true);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("untouched").stack).toHaveLength(2);
  });

  it("also trashes the bottom source of every opposing Digimon when MarineAngemon is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-057", as: "kenta" }], hand: [{ card: "EX2-018", as: "marineAngemon" }] },
        1: {
          battleArea: [
            { card: "EX2-021", as: "first", under: ["EX2-003", "EX2-004", "EX2-005"] },
            { card: "EX2-021", as: "second", under: ["EX2-003", "EX2-004", "EX2-005"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marineAngemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("kenta").isSuspended && s.perm("second").stack.length === 2);
    expect(s.perm("first").stack).toHaveLength(1);
    expect(s.perm("second").stack).toHaveLength(2);
  });

  it("reduces only a MarineAngemon played from hand by 1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-057", as: "kenta" }], hand: [{ card: "EX2-018", as: "marine" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("marine").instanceId),
    );
    expect(s.state.memory).toBe(0);
  });

  it("accumulates one passive reduction per matching Kenta watcher", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-057", as: "firstKenta" },
          { card: "EX2-057", as: "secondKenta" },
        ],
        hand: [{ card: "EX2-018", as: "marine" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("marine").instanceId),
    );
    expect(s.state.memory).toBe(1);
  });

  it("does not reduce another blue Digimon and can decline the suspension cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-057", as: "kenta" }], hand: [{ card: "EX2-014", as: "blue" }] },
        1: { battleArea: [{ card: "EX2-021", as: "target", under: ["EX2-003", "EX2-004"] }] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blue").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("blue").instanceId));
    expect(s.state.memory).toBe(6);
    expect(s.perm("kenta").isSuspended).toBe(false);
    expect(s.perm("target").stack).toHaveLength(2);
  });

  it("plays from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], security: ["BT1-001"] },
      1: { security: [{ card: "EX2-057", as: "securityKenta" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityKenta").instanceId),
    );
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityKenta").instanceId),
    ).toBe(true);
  });
});
