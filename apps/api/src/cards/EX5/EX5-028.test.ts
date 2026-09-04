import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-028.js";
import "../index.js";

describe("EX5-028 Kudamon", () => {
  it("plays a yellow Tamer when both security stacks total six or fewer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      optional: true,
      condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
      target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Yellow"] }, count: 1 },
    });
  });
  it("inherits -2000 DP on attack under the same combined-security condition", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });

  it("plays a yellow Tamer for free when combined security is exactly six", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-028", as: "kudamon" },
            { card: "BT1-087", as: "tk" },
          ],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-087"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-087")).toBe(true);
  });

  it("does not play the Tamer when combined security exceeds six", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-028", as: "kudamon" },
            { card: "BT1-087", as: "tk" },
          ],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-087")).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-087");
  });

  it("applies the inherited DP reduction only at six or fewer combined security cards", async () => {
    const qualifying = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-028"] }],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    await qualifying.ready();
    await advance(qualifying.engine).fire(EffectTiming.OnUseAttack, qualifying.perm("host"));
    await settle(() => qualifying.perm("target").currentDP === 3000);
    expect(qualifying.perm("target").currentDP).toBe(3000);

    const overLimit = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-028"] }],
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    await overLimit.ready();
    await advance(overLimit.engine).fire(EffectTiming.OnUseAttack, overLimit.perm("host"));
    await settle();
    expect(overLimit.perm("target").currentDP).toBe(5000);
  });
});
