import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-026.js";

describe("BT18-026 DaiPenmon", () => {
  it("deletes an opposing Digimon with no digivolution cards when digivolving", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Main", isFromHand: true, actions: [{ kind: "Digivolve", costOverride: 3, ignoreRequirements: true, additionalCosts: [{ kind: "place" }] }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "IceClad" }] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" } } }] });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-026", as: "dai" }] }, 1: { battleArea: [{ card: "BT1-030", as: "empty" }, { card: "BT1-030", as: "stacked", under: ["BT18-021"] }] } }, { autoSelectCards: true });
    await s.ready();
    const emptyId = s.perm("empty").permanentId;
    const stackedId = s.perm("stacked").permanentId;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dai"));
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === emptyId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === emptyId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === stackedId)).toBe(true);
  });
});
