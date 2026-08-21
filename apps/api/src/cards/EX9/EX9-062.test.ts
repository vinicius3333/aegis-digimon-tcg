import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX9-062.js";
import "../index.js";
import { getEffectModule } from "../../engine/effects/registry.js";

describe("EX9-062", () => {
  it("is treated as Kimeramon and on play or digivolution trashes sources based on face-down count then returns a DM Digimon", () => {
    expect(compiled.effects?.some((entry) => entry.trigger === "Static")).toBe(false);
    expect(compiled.coverage).toBe("full");
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Trash", scaling: { unit: "selfFaceDownDigivolutionCards", per: 1 } }, { kind: "Return", to: "hand", target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["DM"], match: "trait" }] } } }] });
  });
  it("plays a level-four-or-lower DM Digimon from trash as inherited text", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], target: { filter: { levelComparison: { op: "lte", value: 4 } } } }));
  it("scales deck trashing by face-down sources and returns only one own DM Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([{ kind: "Trash", target: { filter: { controller: "mine", zone: "deck" }, count: 1 }, scaling: { per: 1, unit: "selfFaceDownDigivolutionCards", filter: { controllerDefault: "mine", kind: ["Digimon"], faceDown: true } } }, { kind: "Return", to: "hand", optional: true, target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DM"], match: "trait" }] }, count: 1 } }]);
  });
  it.each([
    ["OnPlay", EffectTiming.OnPlay],
    ["WhenDigivolving", EffectTiming.WhenDigivolving],
  ] as const)("%s trashes one deck card per face-down source and returns one own DM Digimon", async (_label, timing) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-062", as: "source", under: [{ card: "EX9-010", faceUp: false }, { card: "BT1-009", faceUp: false }] }],
        deck: ["BT1-009", "BT1-010"],
        trash: ["EX9-010", "EX9-015"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });

    expect(s.perm("source").stack).toHaveLength(2);
    expect(s.perm("source").stack.every((card) => card.faceUp === false)).toBe(true);
    expect(getEffectModule("EX9-062")?.effectsForTiming(timing, s.perm("source") as never)).toHaveLength(1);
    await advance(s.engine).fireForPermanent(timing, s.perm("source"));
    await settle(() => s.state.players[0]!.deck.length === 0 && s.state.players[0]!.hand.some((card) => card.cardId === "EX9-010" || card.cardId === "EX9-015"));

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.filter((card) => ["BT1-009", "BT1-010"].includes(card.cardId))).toHaveLength(2);
    expect(s.state.players[0]!.hand.filter((card) => ["EX9-010", "EX9-015"].includes(card.cardId))).toHaveLength(1);
  });
});
