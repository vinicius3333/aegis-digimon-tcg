import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-041.js";

describe("BT9-041 RizeGreymon (X Antibody)", () => {
  it("matches catalog and Q1835's exact-name, Tamer-scaled IR", () => {
    expect(getCardDefinition("BT9-041")).toMatchObject({
      cardId: "BT9-041", nameEn: "RizeGreymon (X Antibody)", colors: ["Yellow", "Red"], kinds: ["Digimon"], level: 5,
      playCost: 8, dp: 8000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 4 }, { color: "Red", level: 4, memoryCost: 4 }],
      forms: ["Ultimate"], attributes: ["Vaccine"], types: ["Cyborg", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["RizeGreymon"], cost: 1, isAlternate: true }],
      effects: [
        { trigger: "WhenDigivolving", actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }, { kind: "ModifyDP", amount: -2000, scaling: { unit: "cards" } }] },
        { trigger: "YourTurn", actions: [{ kind: "ModifyDP", amount: 1000, scaling: { unit: "cards" } }] },
      ],
    });
  });

  it("plays a red or yellow Tamer and gives -2000 DP per such Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-038", as: "base" }, "BT1-087"],
          hand: [
            { card: "BT9-041", as: "evolving" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-041"));
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("tamer").instanceId),
    ).toBe(true);
    expect(s.perm("target").currentDP).toBe(2000);
  });
});
