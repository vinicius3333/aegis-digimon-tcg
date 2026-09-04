import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-011.js";
import "../index.js";

describe("EX5-011 Pajiramon", () => {
  it("draws and plays a unique Deva into breeding on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", controller: "mine", amount: 1 },
      {
        kind: "PlayWithoutCost",
        breeding: true,
        optional: true,
        notSameNameAs: ["battleArea", "trash"],
        from: ["hand"],
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Tamer"] } },
    });
  });
  it("gains Security Attack plus one with Four Sovereigns or God Beast", () => {
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

  it("draws and plays a unique Deva into breeding, while rejecting a duplicate name", async () => {
    const resolve = async (candidate: string) => {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "EX5-011", as: "pajiramon" },
              { card: candidate, as: "candidate" },
            ],
            deck: [{ card: "BT1-010", as: "drawn" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 7;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pajiramon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId, 500);
      return s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId;
    };

    expect(await resolve("EX5-009")).toBe(true);
    expect(await resolve("EX5-011")).toBe(false);
  });

  it("gains memory on deletion only while the opponent has a Tamer", async () => {
    const withTamer = setupEngine({
      0: { battleArea: [{ card: "EX5-011", as: "source" }] },
      1: { battleArea: [{ card: "EX5-065", as: "tamer" }] },
    });
    await withTamer.ready();
    withTamer.state.memory = 0;
    await advance(withTamer.engine).verb.deletePermanent([withTamer.perm("source").permanentId], "byEffect");
    await settle(() => withTamer.state.memory === 1, 500);
    expect(withTamer.state.memory).toBe(1);

    const withoutTamer = setupEngine({
      0: { battleArea: [{ card: "EX5-011", as: "source" }] },
      1: { battleArea: [{ card: "BT1-009", as: "digimon" }] },
    });
    await withoutTamer.ready();
    withoutTamer.state.memory = 0;
    await advance(withoutTamer.engine).verb.deletePermanent([withoutTamer.perm("source").permanentId], "byEffect");
    await settle(() => false, 20);
    expect(withoutTamer.state.memory).toBe(0);
  });

  it("grants inherited Security Attack only to a Four Sovereigns or God Beast host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-013", as: "qualified", under: ["EX5-011"] },
          { card: "BT1-009", as: "plain", under: ["EX5-011"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("qualified"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("plain"), "SecurityAttack")).toBe(0);
  });
});
