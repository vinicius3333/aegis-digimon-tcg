import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-089.js";
import "./BT13-092.js";

describe("BT13-089 BT13-089", () => {
  it("matches the delayed and deletion play clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DelayedEffect",
          trigger: "nextEndOfOpponentTurn",
          optional: true,
          cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: {
            filter: { controller: "mine", nameOrTrait: [{ match: "nameExact", tokens: ["Falcomon", "Keenan Crier"] }] },
            count: 1,
          },
        },
      ],
    });
  });

  it("only plays Ravemon after deleting a Ravemon with a Bird or Avian stack card", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "DelayedEffect",
      trigger: "nextEndOfOpponentTurn",
      effect: {
        kind: "PlayWithoutCost",
        from: ["trash"],
        target: { filter: { controller: "mine", nameOrTrait: [{ match: "nameExact", tokens: ["Ravemon"] }] } },
      },
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: {
          nameOrTrait: [
            { match: "trait", tokens: ["Bird"] },
            { match: "trait", tokens: ["Avian"] },
          ],
        },
      },
    });
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-089", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-089");
  });

  it("naturally deletes an eligible Ravemon at own end and plays one from trash next opponent end", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-089", under: ["BT13-082"], as: "source" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceId = s.perm("source").permanentId;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === sourceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === sourceId)).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-089"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-089")).toBe(true);
  });

  it("plays an exact Falcomon from hand when deleted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-089", as: "ravemon" }], hand: [{ card: "BT13-079", as: "falcomon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("ravemon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-079"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-079")).toBe(true);
  });

  it("does not arm the delayed effect while Ravemon: Burst Mode is the end-of-turn top card (Q2335)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-089", as: "base" },
            { card: "BT13-102", as: "keenantamer" },
          ],
          hand: [{ card: "BT13-092", as: "burst" }],
        },
        1: { hand: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT13-092");
    s.state.turnSeat = 0;
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle(() => s.perm("base").stack.length === 0);
    expect(s.perm("base").topCard?.cardId).toBe("BT13-092");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT13-089");

    s.state.turnSeat = 1;
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("base").topCard?.cardId).toBe("BT13-092");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT13-089");
  });
});
