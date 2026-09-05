import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX6-008.js";

describe("EX6-008 ZubaEagermon", () => {
  it("pays 1 and places itself under a level 4 or Legend-Arms Digimon to give +4000 DP", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 4000,
      duration: "forTheTurn",
      target: { fromSelectionRef: "placementTarget", count: 1 },
      cost: { kind: "payMemory", memory: 1 },
      additionalCosts: [
        {
          kind: "place",
          bindHostAs: "placementTarget",
          position: "bottom",
          target: { from: ["hand"], filter: { isSelfRef: true } },
          underFilter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "eq", value: 4 } },
          underOrFilters: [
            { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Legend-Arms"] }] },
          ],
          destination: "digivolutionStack",
        },
      ],
    });
  });
  it("inherits +2000 DP and grants Raid and Piercing when a digivolution card is added", () => {
    expect(
      compiled.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)?.actions[0],
    ).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Raid", raw: "＜Raid＞" } },
        { kind: "GainKeyword", keyword: { keyword: "Piercing", raw: "＜Piercing＞" } },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
    });
  });

  it("pays 1 memory, places itself under a level-4 Digimon, and grants the turn buffs", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-015", as: "host" }], hand: [{ card: "EX6-008", as: "eager" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const [effect] = JSON.parse(s.inst("eager").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("eager").instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("eager").instanceId));
    expect(s.state.memory).toBe(4);
    expect(s.perm("host").currentDP).toBe(10000);
  });

  it("grants Raid and Piercing for the turn when another effect adds a card under itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-008", as: "host" }],
          hand: [{ card: "EX6-007", as: "added" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("added").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
  });

  it("does not offer the hand effect without a level-4 or Legend-Arms host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "ineligible" }], hand: [{ card: "EX6-008", as: "eager" }] },
    });
    await s.ready();
    expect(JSON.parse(s.inst("eager").activatableEffectsJson || "[]")).toHaveLength(0);
  });
});
