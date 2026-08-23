import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-095.js";

describe("BT9-095 Gaia Force ZERO", () => {
  it("deletes an opposing Digimon at 13000 DP or less", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT9-007"], hand: [{ card: "BT9-095", as: "option" }] }, 1: { battleArea: ["BT9-032"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not reduce its cost for an X-Antibody-form source name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-016", as: "host", under: ["BT9-015"] }],
        hand: [{ card: "BT9-095", as: "option" }],
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.memory).toBe(-2);
  });

  it("reduces its cost when the exact X Antibody Option is in a Digimon's sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-016", as: "host", under: ["BT9-109"] }],
        hand: [{ card: "BT9-095", as: "option" }],
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.memory).toBe(0);
  });

  it("may make an unsuspended Greymon attack the player after deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-016", as: "greymon" }],
          hand: [{ card: "BT9-095", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT9-032", as: "deleteTarget" }],
          security: [{ card: "BT9-007", as: "security", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("greymon").isSuspended);

    expect(s.perm("greymon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
