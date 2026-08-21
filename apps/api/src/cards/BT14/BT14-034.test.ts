import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-034.js";

describe("BT14-034", () => {
  it("plays itself from security without paying", () => expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ actions: [{ kind: "PlayWithoutCost", payCost: false }] }));
  it("inherits -3000 DP to an opposing Digimon on deletion", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" }] }));

  it("plays itself when revealed in security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT14-034", as: "sukamon", faceUp: true }] } }, { autoOrderTriggers: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("sukamon"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT14-034"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT14-034")).toBe(true);
  });
});
