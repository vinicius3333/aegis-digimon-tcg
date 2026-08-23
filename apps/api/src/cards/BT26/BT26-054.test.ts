import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-054.js";
import "../index.js";

describe("BT26-054 Andromon", () => {
  it("encodes CS Tamer play exclusion, CS stack-add digivolution, and inherited attack redirect", () => {
    expect(digivolutionRequirementsFor("BT26-054")).toContainEqual({
      level: 4,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "PlayWithoutCost", payCost: false, optional: true }],
    });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          addedDigivolutionCardFilter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
          actions: [{ kind: "Digivolve", from: ["hand"], payCost: false }],
        },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [{ kind: "RedirectAttack", optional: true }],
    });
  });

  it("publicly plays a CS Tamer from hand on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-054", as: "andromon" }], hand: [{ card: "BT22-083", as: "csTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("andromon"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT22-083");
  });
});
