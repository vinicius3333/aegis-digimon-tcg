import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-101.js";
import "../index.js";

describe("BT26-101 compiled fidelity", () => {
  it("preserves the TS waiver, conditional grant, modal, and Security play with the DP seam explicit", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave" } }],
    });
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: { filter: { playCostLte: 4, nameOrTrait: [{ tokens: ["TS"], match: "trait" }] } },
        },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "Main")?.actions).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "Blocker" } },
      { kind: "ModifyDP", amount: 3000 },
      { kind: "Modal", choose: 1, options: [[{ kind: "SelectBind" }, { kind: "Delete" }], [{ kind: "Unsuspend" }]] },
    ]);
  });

  it("publicly plays an eligible TS card from hand during the Security effect", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT26-101", as: "option", faceUp: true }],
          hand: [{ card: "BT26-009", as: "tsCard" }],
          battleArea: [{ card: "BT26-030", as: "tsSource" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-009");
  });

  it("Q7182: resolves the chosen modal effect without the named Tamer and grants no bonus", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-101", as: "option" }],
          battleArea: [{ card: "BT26-009", as: "tsDigimon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 2000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;
    await s.ready();
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId));

    expect(s.perm("tsDigimon").keywords).not.toContain("Blocker");
    expect(s.perm("tsDigimon").currentDP).toBe(2000);
  });
});
