import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-065.js";
import "./BT6-109.js";

describe("BT6-065 Gundramon", () => {
  it("has Blocker and may use a revealed cost-7 Option without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-065", under: ["BT6-061"], as: "gundramon" }],
          deck: [{ card: "BT6-109", as: "option" }, "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT6-030", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gundramon"));

    expect(observe(s.engine).hasKeyword(s.perm("gundramon"), "Blocker")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("publishes all five revealed card identities before using the selected Option", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-065", under: ["BT6-061"], as: "gundramon" }],
        deck: [
          { card: "BT6-109", as: "option" },
          { card: "BT1-010", as: "otherOne" },
          { card: "BT1-011", as: "otherTwo" },
          { card: "BT1-012", as: "otherThree" },
          { card: "BT1-013", as: "otherFour" },
        ],
      },
      1: { battleArea: [{ card: "BT6-030", as: "target" }] },
    });
    const resolution = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gundramon"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const selection = s.decisions.at(-1)!.req;
    expect(selection.sourceCardId).toBe("BT6-065");
    expect(selection.options?.visibleCards).toEqual([
      { instanceId: s.inst("option").instanceId, cardId: "BT6-109" },
      { instanceId: s.inst("otherOne").instanceId, cardId: "BT1-010" },
      { instanceId: s.inst("otherTwo").instanceId, cardId: "BT1-011" },
      { instanceId: s.inst("otherThree").instanceId, cardId: "BT1-012" },
      { instanceId: s.inst("otherFour").instanceId, cardId: "BT1-013" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("option").instanceId] },
      }),
    ).toEqual({ ok: true });
    await resolution;

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("deletes an opposing play-cost-4-or-lower Digimon when the Option use is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-065", under: ["BT6-061"], as: "gundramon" }],
          deck: [{ card: "BT6-109", as: "option" }, "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    const targetInstanceId = s.perm("target").topCard!.instanceId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gundramon"));

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(targetInstanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).not.toContain(
      targetInstanceId,
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
