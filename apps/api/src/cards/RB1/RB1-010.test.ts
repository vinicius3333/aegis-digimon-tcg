import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-010 Siriusmon", () => {
  it("places a Gammamon-text card as cost before deleting a qualifying opponent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-009", as: "base" }], hand: [{ card: "RB1-010", as: "sirius" }, "RB1-005"] },
        1: { battleArea: [{ card: "EX2-045", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sirius").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("sirius").stack.some((card) => card.cardId === "RB1-005")).toBe(true);
  });

  it("does not pay the placement cost or delete when the player declines", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-009", as: "base" }], hand: [{ card: "RB1-010", as: "sirius" }] },
        1: { battleArea: [{ card: "EX2-045", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sirius").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
