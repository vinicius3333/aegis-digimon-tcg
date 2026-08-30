import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT1-103.js";

describe("BT1-103 Testament", () => {
  it("matches the catalog and compiles both printed effects", () => {
    expect(getCardDefinition("BT1-103")).toMatchObject({ nameEn: "Testament", playCost: 3 });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "Main",
        actions: [
          {
            kind: "GainKeyword",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            keyword: { keyword: "Blocker" },
            duration: "untilOpponentTurnEnd",
          },
        ],
      },
      { trigger: "Security", actions: [{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "AddToHandSelf" }] },
    ]);
  });

  it("gives exactly one of your Digimon Blocker through the opponent's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-053", as: "chosen" },
            { card: "BT1-054", as: "other" },
          ],
          hand: [{ card: "BT1-103", as: "option" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { deck: ["BT1-003"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker"));

    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker")).toBe(false);
  });

  it("draws before returning itself to hand when revealed in security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT1-103", as: "securityOption", faceUp: true }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    const drawnId = s.inst("drawn").instanceId;
    const optionId = s.inst("securityOption").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId, optionId]);
  });
});
