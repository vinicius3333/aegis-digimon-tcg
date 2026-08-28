import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-052.js";

describe("BT11-052 Tyrannomon", () => {
  it("maps the two-color champion and both free-Tamer plus inherited DP clauses", () => {
    expect(getCardDefinition("BT11-052")).toMatchObject({ cardId: "BT11-052", colors: ["Green", "Red"], level: 4, playCost: 5, dp: 5000, types: ["Dinosaur"] });
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "PlayWithoutCost" }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "PlayWithoutCost" }] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "YourTurn", isInherited: true });
  });

  it("plays a cost-3-or-less Tamer from hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT11-052", as: "tyrannomon" },
            { card: "BT11-091", as: "eligible" },
            { card: "BT11-092", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tyrannomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("eligible").instanceId),
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("tooExpensive").instanceId);
  });

  it("plays a cost-3-or-less Tamer from hand when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-046", as: "base" }],
          hand: [
            { card: "BT11-052", as: "tyrannomon" },
            { card: "BT11-091", as: "tamer" },
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
        instanceId: s.inst("tyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("tamer").instanceId),
    );

    expect(s.perm("base").topCard.cardId).toBe("BT11-052");
  });

  it("inherited effect gives its host +2000 DP on its turn while a Tamer is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-065", as: "host", under: ["BT11-052"] }, "BT1-086"],
      },
    });

    await advance(s.engine).recompute();

    expect(s.perm("host").currentDP).toBe(6000);
  });
});
