import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-106.js";

describe("BT13-106 Odin's Breath", () => {
  it("activates Main when directly trashed from security by an effect", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDiscardSecurity")?.actions?.[0]).toMatchObject({
      kind: "ActivateMain",
    });
  });

  it("reduces one opposing Digimon and conditionally grants Security Attack -1 to all opposing Digimon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions ?? [];
    expect(actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(actions[1]).toMatchObject({
      kind: "GainKeyword",
      duration: "untilOpponentTurnEnd",
      keyword: { keyword: "SecurityAttack", amount: -1 },
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
      condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
    });
  });

  it("applies the DP reduction and Security Attack -1 to every opposing Digimon at six total security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-036", as: "yellowDigimon" }],
          hand: [{ card: "BT13-106", as: "option" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT13-111", as: "first" },
            { card: "BT13-111", as: "second" },
          ],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("first").currentDP === 10000 &&
        observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack") === -1,
    );

    expect(s.perm("first").currentDP).toBe(10000);
    expect(s.perm("second").currentDP).toBe(13000);
    expect(observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("second"), "SecurityAttack")).toBe(-1);
  });

  it("activates Main when an effect directly trashes it from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-036", as: "yellowDigimon" }],
          security: [{ card: "BT13-106", as: "option", faceUp: true }],
          hand: [],
        },
        1: { battleArea: [{ card: "BT13-111", as: "target" }], security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.trash([s.inst("option").instanceId]);
    await settle(() => s.perm("target").currentDP === 10000);
    expect(s.perm("target").currentDP).toBe(10000);
  });
});
