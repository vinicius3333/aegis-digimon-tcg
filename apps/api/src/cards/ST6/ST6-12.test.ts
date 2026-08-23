import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST6-12.js";

describe("ST6-12 VenomMyotismon", () => {
  it("gives up to 2 of your Digimon Retaliation through the opponent's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST6-11", as: "base" },
            { card: "ST6-11", as: "ally" },
          ],
          hand: [
            { card: "ST6-12", as: "evolving" },
            { card: "ST6-12", as: "allyEvolution" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Retaliation")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ally").permanentId,
        instanceId: s.inst("allyEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ally").topCard.instanceId === s.inst("allyEvolution").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation")).toBe(true);
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation")).toBe(true);
  });
});
