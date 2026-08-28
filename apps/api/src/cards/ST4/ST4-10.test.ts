import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST4-10.js";

describe("ST4-10 Lillymon", () => {
  it("reveals 5 and adds a level 6 Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST4-08", as: "base" }],
          hand: [{ card: "ST4-10", as: "evolving" }],
          deck: ["ST4-03", { card: "ST4-12", as: "found" }, "ST4-03", "ST4-04", "ST4-06", "ST4-08"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("found").instanceId));
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });
});
