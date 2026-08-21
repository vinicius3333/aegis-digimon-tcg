import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-028.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-028", () => {
  it("plays a yellow or NSp Digimon costing 4 or less from hand on deletion", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { count: 1, filter: { colors: ["Yellow"], playCostLte: 4 }, orFilters: [{ nameOrTrait: [{ tokens: ["NSp"] }] }] } }));
  it("inherits a once-per-turn attack effect that gives an opposing Digimon -4000 DP", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -4000 }] }));

  it("plays a qualifying yellow Digimon from hand on deletion", async () => {
    const s = setupEngine({ 0: { hand: ["BT1-045"], battleArea: [{ card: "EX7-028", as: "pix" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("pix").permanentId]);
    await settle(() => s.state.players[0].battleArea.some((permanent) => permanent.topCard.cardId === "BT1-045"));
    expect(s.state.players[0].battleArea.some((permanent) => permanent.topCard.cardId === "BT1-045")).toBe(true);
  });
});
