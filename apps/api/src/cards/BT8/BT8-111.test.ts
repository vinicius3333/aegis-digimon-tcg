import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-111.js";

describe("BT8-111 Creepymon", () => {
  it("mills 2 per opposing Digimon and may play a purple level-5-or-lower Digimon after milling at least 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "base" }],
          hand: [{ card: "BT8-111", as: "evolving" }],
          deck: ["BT1-009", { card: "BT8-080", as: "played" }, "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { battleArea: ["BT1-015", "BT1-016"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-111"));
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("played").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });
});
