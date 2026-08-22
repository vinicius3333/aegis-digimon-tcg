import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-081.js";

describe("BT13-081 Porcupamon", () => {
  it("deletes one opposing level 3 Digimon on play and deletion", () => {
    for (const trigger of ["OnPlay", "OnDeletion"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
      });
    }
  });

  it("draws 1 then trashes 1 as an inherited once-per-turn effect", () => {
    const inherited = compiled.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "EndOfOpponentsTurn", frequency: "OncePerTurn" });
    expect(inherited?.actions?.map((action) => action.kind)).toEqual(["Draw", "Trash"]);
  });

  it("deletes an opposing level 3 Digimon when played", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT13-081", as: "porcupamon" }] }, 1: { battleArea: [{ card: "BT13-078", as: "target" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("porcupamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT13-078");
  });
});
