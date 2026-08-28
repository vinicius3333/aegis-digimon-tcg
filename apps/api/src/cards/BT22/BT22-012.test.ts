import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-012.js";

describe("BT22-012 RizeGreymon", () => {
  it("keeps Raid, the one-Tamer gate, the two Tamer options, and inherited Security Attack +1", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] }),
    );
    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      optional: true,
      condition: { kind: "permanentCount", seat: "mine", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
      target: {
        filter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Red", "Black"], playCostLte: 4 },
        orFilters: [{ controllerDefault: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] }],
        count: 1,
      },
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
      }),
    );
  });

  it("plays a blue CS Tamer for free when digivolving with at most one Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-012", under: ["BT22-010"], as: "rize" }],
          hand: [
            { card: "BT22-085", as: "csTamer" },
            { card: "BT1-086", as: "invalid" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("rize"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-085")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("invalid").instanceId]);
  });

  it("does not play a Tamer when two are already present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-012", as: "rize" },
            { card: "BT22-083", as: "firstTamer" },
            { card: "BT22-085", as: "secondTamer" },
          ],
          hand: [{ card: "BT22-089", as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("rize"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("candidate").instanceId]);
  });

  it("projects Raid and inherited Security Attack +1 to observable keyword state", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT22-012", as: "rize" },
          { card: "BT22-013", under: ["BT22-012"], as: "host" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("rize"), "Raid")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
