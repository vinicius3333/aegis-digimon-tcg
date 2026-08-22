import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-038.js";

describe("BT14-038", () => {
  it("plays a level-six Etemon from hand from security when three Sukamon are in trash", () => expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], condition: { kind: "youHave", count: 3 }, target: { filter: { levels: [6], nameOrTrait: [{ tokens: ["Etemon"], match: "name" }] } } }));
  it("inherits placing an Etemon from trash as security on deletion", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", from: ["trash"] }] }));

  it("plays a level-six Etemon from hand from security when three Sukamon are trashed", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT14-038", as: "securityEtemon", faceUp: true }], hand: [{ card: "BT11-044", as: "handEtemon" }], trash: [{ card: "BT14-034" }, { card: "BT14-034" }, { card: "BT14-034" }] } }, { autoOrderTriggers: true, autoSelectCards: true, autoAcceptOptional: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityEtemon"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT11-044"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT11-044")).toBe(true);
  });
});
