import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-059.js";

describe("BT12-059 Agumon", () => {
  it("digivolves for 0 from Koromon and rejects another level 2", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT12-003", as: "koromon" }],
        hand: [{ card: "BT12-059", as: "agumon" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("koromon").permanentId,
        instanceId: valid.inst("agumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("koromon").topCard.cardId === "BT12-059");
    expect(valid.state.memory).toBe(0);
    expect(valid.perm("koromon").stack.map(({ cardId }) => cardId)).toEqual(["BT12-003"]);
    expect(valid.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT12-001", as: "gigimon" }], hand: [{ card: "BT12-059", as: "agumon" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("gigimon").permanentId,
        instanceId: invalid.inst("agumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("adds a Greymon Digimon and Tai Kamiya Tamer from the reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-059", as: "agumon" }],
          deck: ["BT1-015", "BT1-085", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT1-015", "BT1-085"]);
  });

  it.each(["BT1-015", "BT1-084"])("gives a Greymon or Omnimon host %s +1000 DP", async (host) => {
    const s = setupEngine({
      0: { battleArea: [{ card: host, as: "host", under: ["BT12-059"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not give an unrelated host +1000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-059"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("adds the eligible Greymon even when no Tai Kamiya is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-059", as: "agumon" }],
          deck: ["BT1-015", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT1-015"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-015");
  });

  it("adds a compound-name Tai Kamiya Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-059", as: "agumon" }],
          deck: ["BT5-093", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT5-093"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT5-093"]);
  });
});
