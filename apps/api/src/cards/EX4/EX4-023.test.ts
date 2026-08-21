import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-023.js";
import "../index.js";

describe("EX4-023 Agumon Expert", () => {
  it("once per opponent turn reveals a same-level card from hand and places it as security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controller: "opponent", kind: ["Digimon"] }, actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", toTop: true, source: { filter: { zone: "hand", controller: "mine", level: "same" } }, cost: { kind: "reveal", target: { filter: { zone: "hand", controller: "mine", level: "same" } } } }] });
  });

  it("places the revealed same-level hand card on top of security when an opponent Digimon is played", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-023", as: "expert" }], hand: [{ card: "BT1-009", as: "revealed" }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-010", as: "played" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("played").permanentId });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("revealed").instanceId));

    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("revealed").instanceId);
  });
});
