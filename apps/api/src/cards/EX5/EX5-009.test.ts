import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-009.js";
import "../index.js";

describe("EX5-009 Indramon", () => {
  it("draws and optionally plays a unique Deva into breeding on play", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "Draw", controller: "mine", amount: 1 });
    expect(actions?.[1]).toMatchObject({
      kind: "PlayWithoutCost",
      breeding: true,
      optional: true,
      notSameNameAs: ["battleArea", "trash"],
      from: ["hand"],
      target: {
        count: 1,
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Deva"] }] },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
    });
  });
  it("gains Security Attack plus one while it has Four Sovereigns or God Beast", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "Aura",
      target: { filter: { isSelfRef: true }, isSelf: true },
      effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
      while: {
        kind: "selfHasTrait",
        filter: { nameOrTrait: [{ match: "trait", tokens: ["Four Sovereigns", "God Beast"] }] },
      },
    });
  });

  it("draws and puts a unique Deva into breeding, while rejecting a duplicate name", async () => {
    const resolve = async (candidate: string) => {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "EX5-009", as: "indramon" },
              { card: candidate, as: "candidate" },
            ],
            deck: [{ card: "BT1-010", as: "drawn" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 7;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("indramon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId, 500);
      return s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId;
    };

    expect(await resolve("BT10-079")).toBe(true);
    expect(await resolve("EX5-009")).toBe(false);
  });

  it("grants inherited Security Attack only to a Four Sovereigns host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-013", as: "qualified", under: ["EX5-009"] },
          { card: "BT1-009", as: "plain", under: ["EX5-009"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("qualified"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("plain"), "SecurityAttack")).toBe(0);
  });
});
