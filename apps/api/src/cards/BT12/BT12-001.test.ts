import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-001.js";
import "../ST7/ST7-06.js";
import "../BT10/BT10-096.js";

describe("BT12-001 Gigimon", () => {
  it("raises an owner's printed DP-deletion ceiling by 1000", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", under: ["BT12-001"] }],
          hand: [{ card: "ST7-06", as: "removal" }],
        },
        1: { battleArea: [{ card: "BT12-038", as: "target", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not apply outside the inherited effect's owner's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", dp: 5000, under: ["BT12-001"] }], security: 1 },
        1: { battleArea: [{ card: "BT12-038", as: "target", dp: 5000 }], hand: [{ card: "ST7-06", as: "removal" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "ST7-06"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});

describe("BT12-001 Gigimon — KB Q&A rulings", () => {
  it("lets a printed 'DP or less' deletion reach 1000 DP above its printed maximum (Q2144)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", under: ["BT12-001"] }],
          hand: [{ card: "ST7-06", as: "removal" }],
        },
        1: {
          battleArea: [
            { card: "BT12-038", as: "raised", dp: 5000 },
            { card: "BT12-038", as: "beyond", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const raisedId = s.perm("raised").permanentId;
    const beyondId = s.perm("beyond").permanentId;
    preferred.push(beyondId, s.perm("beyond").topCard.instanceId);
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === raisedId));

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([beyondId]);
  });

  it("does not raise a deletion limit that compares against a Digimon's DP instead of a number (Q2145)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", as: "shoutmon", dp: 5000, under: ["BT12-001"] }],
          hand: [
            { card: "BT10-096", as: "option" },
            { card: "ST7-06", as: "numericRemoval" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT12-038", as: "equal", dp: 5000 },
            { card: "BT12-038", as: "raisedOnly", dp: 6000 },
            { card: "BT12-038", as: "numericProbe", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    const equalId = s.perm("equal").permanentId;
    const raisedOnlyId = s.perm("raisedOnly").permanentId;
    const numericProbeId = s.perm("numericProbe").permanentId;
    preferred.push(
      s.perm("shoutmon").permanentId,
      raisedOnlyId,
      s.perm("raisedOnly").topCard.instanceId,
      equalId,
      s.perm("equal").topCard.instanceId,
    );
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === equalId));

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      raisedOnlyId,
      numericProbeId,
    ]);

    // Control: on the same board the raise is active, so a numeric "4000 or less" deletion reaches 5000.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("numericRemoval").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === numericProbeId));

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([raisedOnlyId]);
  });
});
