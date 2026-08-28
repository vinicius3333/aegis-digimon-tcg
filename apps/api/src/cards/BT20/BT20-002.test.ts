import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT20-002.js";

describe("BT20-002 Bebydomon", () => {
  it("proves the inherited once-per-turn draw gate checks Dracomon or Examon text", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    const action = effect?.actions[0];

    expect(effect).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(action).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      condition: {
        kind: "selfTopHasText",
        filter: { nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }] },
      },
    });
  });

  it("draws once when its Dracomon host attacks and not for an unrelated host", async () => {
    const matching = setupEngine({
      0: {
        battleArea: [{ card: "BT20-007", as: "dracomon", under: ["BT20-002"] }],
        deck: ["BT20-003", "BT20-004"],
      },
      1: { security: ["BT20-003"] },
    });
    const matchingHandBefore = matching.state.players[0]!.hand.length;

    expect(
      matching.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: matching.perm("dracomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => matching.state.players[0]!.hand.length === matchingHandBefore + 1);

    // No public intent can make the same suspended Digimon attack again in the same turn;
    // fire the production timing seam directly to prove the inherited counter is consumed.
    await advance(matching.engine).fire(EffectTiming.OnUseAttack, matching.perm("dracomon"));
    expect(matching.state.players[0]!.hand).toHaveLength(matchingHandBefore + 1);

    const nonMatching = setupEngine({
      0: {
        battleArea: [{ card: "BT20-010", as: "ryudamon", under: ["BT20-002"] }],
        deck: ["BT20-003"],
      },
      1: { security: ["BT20-003"] },
    });
    const nonMatchingHandBefore = nonMatching.state.players[0]!.hand.length;
    expect(
      nonMatching.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: nonMatching.perm("ryudamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);
    expect(nonMatching.state.players[0]!.hand).toHaveLength(nonMatchingHandBefore);
  });
});
