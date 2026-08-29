import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-066.js";

describe("BT9-066 Alphamon", () => {
  it("matches catalog and trash-placement plus once-per-turn De-Digivolve IR", () => {
    expect(getCardDefinition("BT9-066")).toMatchObject({
      cardId: "BT9-066", nameEn: "Alphamon", colors: ["Black"], kinds: ["Digimon"], level: 6,
      playCost: 12, dp: 11000, evoCosts: [{ color: "Black", level: 5, memoryCost: 3 }], forms: ["Mega"],
      attributes: ["Vaccine"], types: ["Holy Warrior", "Royal Knight", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "WhenDigivolving", actions: [{ kind: "PlaceUnder", position: "bottom", target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] } } }] },
        { trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards", actions: [{ kind: "DeDigivolve", amount: 1 }] }] },
      ],
    });
  });

  it("places an X Antibody card from trash under itself when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", as: "base", under: ["BT9-065"] }],
          hand: [{ card: "BT9-066", as: "evolving" }, { card: "BT9-068", as: "handDecoy" }],
          trash: [{ card: "BT9-068", as: "source" }],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target", under: ["BT1-010"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.perm("base").stack.some((card) => card.instanceId === s.inst("source").instanceId) &&
      s.perm("target").stack.length === 0,
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("handDecoy").instanceId)).toBe(true);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT9-068", "BT9-065", "BT10-013"]);
    expect(s.perm("target").stack).toHaveLength(0);
  });
});
