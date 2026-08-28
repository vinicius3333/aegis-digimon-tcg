import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
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
    expect(inherited).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      ],
    });
  });

  it("deletes an opposing level 3 Digimon when played", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT13-081", as: "porcupamon" }] },
        1: { battleArea: [{ card: "BT13-078", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("porcupamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT13-078");
  });

  it("deletes an opposing level 3 Digimon when this card is deleted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-081", as: "porcupamon" }] }, 1: { battleArea: [{ card: "BT13-078", as: "target" }] } },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("porcupamon").permanentId]);
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT13-078"));
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT13-078");
  });

  it("draws then trashes one card at the opponent's turn end from its inherited stack", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-081"] }], deck: ["BT1-001"] } },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001"));
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-001");
  });
});
