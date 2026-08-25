import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const PIPE_FOX = "TOKEN-Pipe-Fox";

describe("BT19-040 Sakuyamon", () => {
  it("has the cost-1 Sakuyamon: Maid Mode evolution route", () => {
    expect(digivolutionRequirementsFor("BT19-040")).toContainEqual({
      names: ["Sakuyamon: Maid Mode"], cost: 1, isAlternate: true,
    });
  });

  it("When Digivolving draws 2, then may freely use only an eligible single-color Option", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-040", as: "saku" }],
      deck: ["BT19-030", "BT19-031"],
      hand: [{ card: "BT1-102", as: "single" }, { card: "BT12-104", as: "multi" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("saku"));
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-102");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT12-104", "BT19-030", "BT19-031"]),
    );
    expect(s.state.memory).toBe(0);
  });

  it("still draws 2 when the optional Option use is declined", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-040", as: "saku" }], deck: ["BT19-030", "BT19-031"],
      hand: [{ card: "BT1-102", as: "option" }],
    } }, { autoDeclineOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("saku"));
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("a cost-2 Option use plays one 6000 DP Blocker token only once (Q5469/Q5472/Q5473)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-040", as: "saku" }] } }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 2, subjectPermanentId: "option-1" });
    const token = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === PIPE_FOX)!;
    expect(token.currentDP).toBe(6000);
    expect(observe(s.engine).hasKeyword(token, "Blocker")).toBe(true);
    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 7, subjectPermanentId: "option-2" });
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === PIPE_FOX)).toHaveLength(1);
  });

  it("rejects effective use cost 1 and does not trigger from a Security effect or opponent turn (Q5470/Q5471)", async () => {
    const lowCost = setupEngine({ 0: { battleArea: [{ card: "BT19-040", as: "saku" }] } });
    await lowCost.ready();
    await advance(lowCost.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 1, subjectPermanentId: "reduced" });
    expect(lowCost.state.players[0]!.battleArea).toHaveLength(1);

    const security = setupEngine({ 0: {
      battleArea: [{ card: "BT19-040", as: "saku" }], security: [{ card: "BT1-102", as: "option" }],
    } });
    await security.ready();
    await advance(security.engine).fireForInstance(EffectTiming.SecuritySkill, security.inst("option"));
    expect(security.state.players[0]!.battleArea).toHaveLength(1);

    const opponentTurn = setupEngine({ 0: { battleArea: [{ card: "BT19-040", as: "saku" }] } });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    await advance(opponentTurn.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 2, subjectPermanentId: "option" });
    expect(opponentTurn.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("triggers after a real cost-2 hand Option finishes resolving (Q5469)", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-040", as: "saku" }], hand: [{ card: "BT1-102", as: "option" }],
    } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === PIPE_FOX));
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-102");
  });
});
