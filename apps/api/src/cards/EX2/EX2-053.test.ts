import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-053.js";

describe("EX2-053 ADR-08 Optimizer", () => {
  it("reveals three and plays a cost-10-or-lower D-Reaper with a loaded Mother", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-007", as: "mother", under: ["EX2-046", "EX2-046", "EX2-046", "EX2-046", "EX2-046"] },
          ],
          hand: [{ card: "EX2-053", as: "optimizer" }],
          deck: [{ card: "EX2-050", as: "played" }, "BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("optimizer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId),
    ).toBe(true);
  });

  it("does not reveal or play with only four Mother D-Reaper sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX2-007",
              as: "mother",
              under: ["EX2-046", "EX2-046", "EX2-046", "EX2-046"],
            },
          ],
          hand: [{ card: "EX2-053", as: "optimizer" }],
          deck: [{ card: "EX2-050", as: "candidate" }, "BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("optimizer").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("optimizer").instanceId,
      ),
    );

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("candidate").instanceId,
      ),
    ).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
  });
});
