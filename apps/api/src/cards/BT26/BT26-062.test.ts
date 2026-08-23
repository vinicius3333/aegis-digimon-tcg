import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-062.js";
import "../index.js";

describe("BT26-062 Ghostmon", () => {
  it("compiles the hand cost, draw, memory, and inherited DP effects", () => {
    expect(digivolutionRequirementsFor("BT26-062")).toContainEqual({
      level: 2,
      traits: ["NSo"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects[0]!.actions.map((a) => a.kind)).toEqual(["Draw", "GainMemory"]);
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", isInherited: true });
  });
  it("trashes a Ghost card before drawing and gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-062", as: "ghostmon" }],
          hand: [{ card: "BT26-062", as: "cost" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("ghostmon"));
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawn").instanceId));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("cost").instanceId }),
    );
  });
  it("gives its evolution host the inherited 2000 DP during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-064", as: "host", under: ["BT26-062"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(4000);
  });
});
