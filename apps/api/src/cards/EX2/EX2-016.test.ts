import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-016.js";

describe("EX2-016 Gorillamon", () => {
  it("plays a level-3 source from one of its blue Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-014", as: "carrier", under: [{ card: "EX2-013", as: "source" }] }],
          hand: [{ card: "EX2-016", as: "gorillamon" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gorillamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId),
    ).toBe(true);
  });

  it("does not play a level-3 source from a non-blue Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-031", as: "carrier", under: [{ card: "EX2-013", as: "source" }] }],
          hand: [{ card: "EX2-016", as: "gorillamon" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gorillamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.perm("carrier").stack.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
  });

  it("may decline playing the eligible level-3 source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-014", as: "carrier", under: [{ card: "EX2-013", as: "source" }] }],
          hand: [{ card: "EX2-016", as: "gorillamon" }],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gorillamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.perm("carrier").stack.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
  });

  it("does not play a level-4 source even from a blue Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-014", as: "carrier", under: [{ card: "EX2-015", as: "source" }] }],
          hand: [{ card: "EX2-016", as: "gorillamon" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gorillamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.perm("carrier").stack.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
  });
});
