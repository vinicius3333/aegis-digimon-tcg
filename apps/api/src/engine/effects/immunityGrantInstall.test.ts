import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

/**
 * Seam 1 `immunity-grant-not-installed`.
 *
 * "isn't affected by the effects of your opponent's Digimon" compiles to a `GrantStatic`
 * with `grant: "immuneToOpponentDigimonEffects"`, which installs a `beAffected` restriction
 * scoped to Digimon-sourced effects (KB Q5009). These three cards are the shapes the EX10
 * re-audit named: a continuous board-wide grant, a self-grant gated on being suspended, and
 * a paid activation.
 */
describe("immuneToOpponentDigimonEffects grant", () => {
  it("EX8-029: a continuous grant installs the Digimon-scoped beAffected restriction", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-013", as: "other" }] },
      1: { battleArea: [{ card: "EX8-029", as: "aegis" }] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasRestriction(s.perm("aegis"), "beAffected", "Digimon")).toBe(true);
  });

  it("BT15-047: the self-grant follows the suspended state it is gated on", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-047", as: "kabuterimon", suspended: true }] },
      1: { battleArea: [{ card: "BT1-013", as: "other" }] },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasRestriction(s.perm("kabuterimon"), "beAffected", "Digimon")).toBe(true);
  });

  it("BT25-042: the [On Play] activation pays its security-trash cost and grants the restriction", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-042", as: "clavis" }],
          security: ["BT1-009", "BT1-013"],
          battleArea: [{ card: "BT1-013", as: "other" }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "wall" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("clavis").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT25-042"));
    await settle(() => false, 40);

    const clavis = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT25-042")!;
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(observe(s.engine).hasRestriction(clavis, "beAffected", "Digimon")).toBe(true);
  });
});
