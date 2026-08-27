import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-015.js";

describe("BT5-015 MetalGreymon: Alterous Mode", () => {
  it("deletes a 4000 DP Digimon when MetalGreymon is in its sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-015", as: "base" }], hand: [{ card: "BT5-015", as: "evolving" }] },
        1: { battleArea: ["BT2-024"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not delete an opposing Digimon above 4000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-015", as: "base" }], hand: [{ card: "BT5-015", as: "evolving" }] },
        1: { battleArea: [{ card: "BT5-010", as: "target", dp: 4001 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-015");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("its inherited effect gives a qualifying Greymon host +2000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-016", as: "host", under: ["BT5-015"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });

  it("gives the bonus to Omnimon, excludes all printed names, and only on its owner's turn", async () => {
    for (const card of ["BT5-016", "BT5-086"]) {
      const s = setupEngine({ 0: { battleArea: [{ card, as: "host", under: ["BT5-015"] }] } });
      await s.ready();
      expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
    }

    for (const card of ["BT7-064", "BT4-013", "BT9-078"]) {
      const s = setupEngine({ 0: { battleArea: [{ card, as: "host", under: ["BT5-015"] }] } });
      await s.ready();
      expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
    }

    const opponentTurn = setupEngine({ 0: { battleArea: [{ card: "BT5-016", as: "host", under: ["BT5-015"] }] } });
    await opponentTurn.ready();
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    expect(opponentTurn.perm("host").currentDP).toBe(opponentTurn.perm("host").baseDP);
  });

  it("does not delete when no MetalGreymon source is present", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-010", as: "base" }], hand: [{ card: "BT5-015", as: "evolving" }] },
        1: { battleArea: ["BT2-024"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-015");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
