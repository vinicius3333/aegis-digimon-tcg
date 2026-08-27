import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-104.js";
import "./BT13-095.js";

describe("BT13-104 Final Shining Burst", () => {
  it("reduces one opposing Digimon by 12000 through the opponent's turn, then may play Marcus Damon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions ?? [];
    expect(actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -12000,
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Marcus Damon"] }] }, count: 1 },
    });
  });

  it("activates its Main effect in security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
      kind: "ActivateMain",
    });
  });

  it("reduces an opposing Digimon and plays Marcus Damon from hand without paying", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-012", as: "redDigimon" },
            { card: "BT13-036", as: "yellowDigimon" },
          ],
          hand: [
            { card: "BT13-104", as: "option" },
            { card: "BT13-095", as: "marcus" },
          ],
        },
        // Marcus's optional On Play suspension applies a further -3000 DP after
        // Final Shining Burst. Start high enough to observe both modifiers.
        1: { battleArea: [{ card: "BT13-111", as: "target", dp: 16000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-095"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("marcus").instanceId)).toBe(false);
    expect(s.perm("target").currentDP).toBe(1000);
  });

  it("activates the same Main effect when revealed from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-012", as: "redDigimon" },
            { card: "BT13-036", as: "yellowDigimon" },
          ],
          security: [{ card: "BT13-104", as: "securityOption", faceUp: true }],
          hand: [{ card: "BT13-095", as: "marcus" }],
        },
        1: { battleArea: [{ card: "BT13-111", as: "target", dp: 16000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-095"));
    expect(s.perm("target").currentDP).toBe(1000);
  });
});
