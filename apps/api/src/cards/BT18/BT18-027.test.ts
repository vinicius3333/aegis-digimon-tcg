import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-027.js";

describe("BT18-027 Mermaimon", () => {
  it("plays a blue level 3 Digimon from its digivolution cards when attacking", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, target: { filter: { controller: "mine", kind: ["Digimon", "Tamer"], colors: ["Blue"], levels: [3] } } }] });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-027", as: "mermaimon", under: ["BT1-030"] }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("mermaimon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-030")).toBe(true);
  });
});
