import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-054.js";

describe("BT11-054 Panjyamon", () => {
  it("is also treated as having Leomon in its name", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-054", as: "panjyamon" }] } });

    await advance(s.engine).recompute();

    expect(observe(s.engine).effectiveNames(s.perm("panjyamon"))).toEqual(
      expect.arrayContaining(["panjyamon", "leomon"]),
    );
  });

  it("plays a green or blue Tamer costing 4 or less when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-050", as: "base" }],
          hand: [
            { card: "BT11-054", as: "panjyamon" },
            { card: "BT1-086", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("panjyamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("tamer").instanceId),
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("tamer").instanceId);
  });

  it("inherited effect grants Rush when another own Digimon is played by an effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-018", as: "host", under: ["BT11-054"] }],
          hand: [{ card: "BT1-009", as: "played" }],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.playInstances([s.inst("played").instanceId]);
    await settle(() => observe(s.engine).hasKeyword(s.perm("host"), "Rush"));

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Rush")).toBe(true);
  });
});
