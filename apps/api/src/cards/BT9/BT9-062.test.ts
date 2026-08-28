import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-062.js";

describe("BT9-062 Raptordramon", () => {
  it("matches catalog and Alphamon-name, play-cost-5 inherited deletion IR", () => {
    expect(getCardDefinition("BT9-062")).toMatchObject({
      cardId: "BT9-062", nameEn: "Raptordramon", colors: ["Black"], kinds: ["Digimon"], level: 4,
      playCost: 5, dp: 6000, evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }], forms: ["Champion"],
      attributes: ["Vaccine"], types: ["Cyborg", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [{ trigger: "EndOfAttack", isInherited: true, actions: [{ kind: "Delete", target: { filter: { playCostLte: 5 } }, condition: { kind: "selfHasNameContaining", names: ["Alphamon"] } }] }],
    });
  });

  it("deletes a play-cost-5-or-less Digimon at end of attack while hosted by Alphamon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-066", as: "alphamon", under: ["BT9-062"] }] },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("alphamon"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
