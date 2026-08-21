import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX9-072.js";

describe("EX9-072", () => {
  it("waives color requirements when there are no face-up security cards", () => expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({ actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHaveNone" } }] }));
  it("gives own DM Digimon +1000 DP per face-down digivolution card from security", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ isSecurity: true, actions: [{ kind: "ModifyDP", amount: 1000, scaling: { unit: "digivolutionCardsOfFiltered", per: 1, filter: { faceDown: true } } }] }));
  it("trades the bottom security card for this card as face-up bottom security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toEqual([{ kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: false }, { kind: "SecurityManipulation", op: "placeAsSecurity", controller: "mine", toTop: false, faceUp: true }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, target: { filter: { playCostLte: 5 } } }] });
  });
  it("adds the bottom security card to hand and places itself face-up at security bottom", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX9-072", as: "source" }], security: ["BT1-009", "BT1-010"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.at(-1)?.cardId === "EX9-072");

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "EX9-072"]);
    expect(s.state.players[0]!.security.at(-1)?.faceUp).toBe(true);
  });
  it("scales the security DM Digimon DP bonus from its face-down sources", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX9-072", as: "source", faceUp: true }], battleArea: [{ card: "EX9-007", as: "host", dp: 3000, under: [{ card: "BT1-009", faceUp: false }, { card: "BT1-010", faceUp: false }] }] },
    });
    expect(s.perm("host").stack).toHaveLength(2);
    expect(s.perm("host").stack.every((card) => card.faceUp === false)).toBe(true);
    await s.ready();
    expect(s.inst("source").faceUp).toBe(true);
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(5000);
  });
  it("plays a qualifying DM Digimon from hand when its security effect triggers", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX9-072", as: "source" }], hand: ["EX9-010"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.inst("source").faceUp = true;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("source"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-010"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-010")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-010")).toBe(false);
  });
});
