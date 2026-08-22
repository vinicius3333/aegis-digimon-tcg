import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-049.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT26-049 Rosemon", () => {
  it("encodes the shared suspend budget and both All Turns reaction routes", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenDigivolving", frequency: "OncePerTurn", actions: [{ kind: "Suspend", target: { count: 2, upTo: true } }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenAttacking", sharedUseKey: "bt26-049-suspend" });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [
      { kind: "SubTrigger", event: "whenSuspended", actions: [{ kind: "PlayWithoutCost", playCostCeiling: { base: 3, raise: 1, per: 1, unit: "cards" }, target: { filter: { kind: ["Digimon", "Tamer", "Option"] } } }] },
      { kind: "SubTrigger", event: "whenDigivolutionTrashed", actions: [{ kind: "PlayWithoutCost", playCostCeiling: { base: 3, raise: 1, per: 1, unit: "cards" } }] },
    ] });
    expect(compiled.effects?.[2]?.actions?.[0]?.actions?.[0]?.target?.filter).not.toHaveProperty("playCostLte");
  });

  it("uses an Option after two opposing suspensions raise the DATA SQUAD ceiling to five", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-049", as: "rosemon" }], hand: [{ card: "BT26-098", as: "option" }] },
      1: { battleArea: [{ card: "BT1-085", as: "suspendedOne", suspended: true }, { card: "BT1-086", as: "suspendedTwo", suspended: true }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", { suspendedPermanentId: s.perm("suspendedOne").permanentId });
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
