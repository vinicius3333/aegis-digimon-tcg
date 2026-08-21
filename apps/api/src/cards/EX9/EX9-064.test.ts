import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX9-064.js";
import "../index.js";

describe("EX9-064", () => {
  it("reduces play cost by two by trashing Cyborg or Ver.4 and deletes two low-cost Digimon after placing a trash source", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({ actions: [{ actions: [{ mode: "reduceCost", amount: 2, cost: { kind: "trash" } }] }] });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "Delete", target: { count: 2, filter: { playCostLte: 4 } }, cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } }, { kind: "CostModifier", amount: 1, scaling: { unit: "selfFaceDownDigivolutionCards" } }] });
  });
  it("inherits once-per-turn deletion of the lowest-level own Digimon by unsuspending itself", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Delete", target: { filter: { superlative: "lowestLevel" } }, cost: { kind: "unsuspend" } }] }));
  it("scales both play and digivolve deletion limits only from face-down sources", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 2 }, cost: { target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"] }, count: 1, from: ["trash"] }, destination: "digivolutionStack", position: "bottom", host: "self", faceDown: true } }, { kind: "CostModifier", scaling: { per: 1, unit: "selfFaceDownDigivolutionCards", filter: { controllerDefault: "mine", kind: ["Digimon"], faceDown: true } } }]);
  });
  it.each([
    ["OnPlay", EffectTiming.OnPlay],
    ["WhenDigivolving", EffectTiming.WhenDigivolving],
  ] as const)("%s places a trash Digimon face-down and deletes only opposing play-cost-four-or-lower Digimon", async (_label, timing) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-064", as: "source", under: [{ card: "EX9-015", faceUp: false }] }],
        trash: ["EX9-010"],
      },
      1: { battleArea: ["BT1-009", "BT1-010", "BT1-021"] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });

    await advance(s.engine).fireForPermanent(timing, s.perm("source"));
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.topCard?.cardId === "BT1-021"));

    expect(s.perm("source").stack).toHaveLength(2);
    expect(s.perm("source").stack[0]).toMatchObject({ cardId: "EX9-010", faceUp: false });
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX9-010")).toBe(false);
    expect(s.state.players[1]!.trash.filter((card) => ["BT1-009", "BT1-010"].includes(card.cardId))).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-021")).toBe(true);
  });
  it("unsuspends itself and deletes the lowest-level own Digimon at end of attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-073", as: "host", under: ["EX9-064"] }, "BT1-009"] },
      1: { battleArea: [{ card: "BT1-010", suspended: true }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });

    s.state.turnSeat = 0;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "permanent", permanentId: s.state.players[1]!.battleArea[0]!.permanentId } })).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended === false && s.state.players[0]!.battleArea.length === 1);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
  });
});
