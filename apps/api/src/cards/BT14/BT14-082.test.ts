import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-082.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-082", () => {
  it("gives a Vaccine Digimon +2000 DP at the start of main phase", () => expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 2000, target: { filter: { nameOrTrait: [{ tokens: ["Vaccine"], match: "trait" }] } } }));
  it("plays itself from security", () => expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] }));
  it("plays from the security stack without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT14-082", as: "securityTai", faceUp: true }] } }, { autoOrderTriggers: true, autoSelectCards: true, autoAcceptOptional: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTai"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-082"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-082")).toBe(true);
  });
});
