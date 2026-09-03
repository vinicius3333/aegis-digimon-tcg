import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-064.js";

describe("EX1-064 Piedmon", () => {
  it("deletes up to 4 unsuspended level-4-or-lower Digimon and draws only once for the simultaneous deletion", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-064", as: "piedmon" }],
          battleArea: [{ card: "EX1-056", as: "purpleSource" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "one" },
            { card: "BT1-010", as: "two" },
            { card: "BT1-011", as: "three" },
            { card: "BT1-012", as: "four" },
            { card: "EX1-061", as: "level5" },
            { card: "BT1-013", as: "suspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piedmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([
      s.perm("level5").permanentId,
      s.perm("suspended").permanentId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("deletes the available target when fewer than four legal targets exist", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-064", as: "piedmon" }],
          battleArea: [{ card: "EX1-056", as: "purpleSource" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "onlyTarget" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piedmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does nothing and draws nothing when there are no legal targets", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-064", as: "piedmon" }],
          battleArea: [{ card: "EX1-056", as: "purpleSource" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "EX1-061", as: "levelFive" },
            { card: "BT1-013", as: "suspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piedmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-064"));

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws only once for separate opponent deletions in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-064", as: "piedmon" }],
          battleArea: [
            { card: "EX1-056", as: "firstAttacker", dp: 10000 },
            { card: "BT1-011", as: "secondAttacker", dp: 10000 },
          ],
          deck: ["BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", suspended: true },
            { card: "BT1-010", as: "second", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piedmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-064"));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("first").instanceId));
    expect(s.state.players[0]!.deck).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("second").instanceId));
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
