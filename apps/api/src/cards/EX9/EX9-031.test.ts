import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-031.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-031", () => {
  it("reduces Ver.3 digivolution cost and has Security A. +1", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.actions.length > 0)).toMatchObject({ actions: [{ kind: "Replacement", actions: [{ mode: "reduceCost", amount: 1 }] }] });
    expect(compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "SecurityAttack"))?.keywords).toContainEqual({ keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" });
  });
  it("recovers on digivolving or attacking by trashing a bottom face-down source", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SecurityManipulation", op: "addTop", amount: 1, cost: { kind: "trash", target: { filter: { zone: "digivolutionCards", faceDown: true, position: "bottom" } } } }] });
  });
  it("inherits an opposing -4000 DP response when security is removed", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved" }] }));

  it("trashes the bottom face-down card and recovers the deck top on attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-031", as: "source", under: [{ card: "BT1-009", faceUp: false }] }], deck: ["BT1-090"], security: ["BT1-001"] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.turnSeat = 0;
    const source = s.perm("source");
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: source.permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0].security.length === 2);
    expect(source.stack).toHaveLength(0);
    expect(s.state.players[0].security).toHaveLength(2);
    expect(s.state.players[0].deck).toHaveLength(0);
    expect(s.state.players[0].trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
