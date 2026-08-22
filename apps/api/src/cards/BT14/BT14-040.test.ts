import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-040.js";

describe("BT14-040", () => {
  it("may place a Tamer from hand as the top security card on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "SecurityManipulation", op: "placeAsSecurity", from: ["hand"], toTop: true, source: { filter: { kind: ["Tamer"] } } });
  });
  it("once per turn plays a level-three Digimon from hand when a Tamer is played", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { kind: ["Tamer"] }, actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, target: { filter: { levels: [3] } } }] }] }));

  it("places a Tamer from hand on top of security when played", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT14-040", as: "jijimon" }, { card: "BT14-082", as: "tamer" }], security: ["BT1-001"] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jijimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security[0]?.cardId === "BT14-082");
    expect(s.state.players[0]!.security[0]?.cardId).toBe("BT14-082");
  });
});
