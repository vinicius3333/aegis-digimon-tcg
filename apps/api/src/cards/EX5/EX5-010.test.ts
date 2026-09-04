import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-010.js";
import "../index.js";

describe("EX5-010 Sandiramon", () => {
  it("draws and optionally plays a unique Deva into breeding on play", () => {
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
  });
  it("deletes an opposing Digimon at 5000 DP or less on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } } },
    });
  });
  it("grants Security Attack plus one to the inherited Digimon with the qualifying trait", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
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
              { card: "EX5-010", as: "sandiramon" },
              { card: candidate, as: "candidate" },
            ],
            deck: [{ card: "BT1-010", as: "drawn" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 7;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sandiramon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId, 500);
      return s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId;
    };

    expect(await resolve("EX5-009")).toBe(true);
    expect(await resolve("EX5-010")).toBe(false);
  });

  it("deletes an opposing Digimon at exactly 5000 DP but preserves one above the boundary", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-010", as: "sandiramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atBoundary", dp: 5000 },
            { card: "BT1-010", as: "aboveBoundary", dp: 5001 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const atBoundaryId = s.perm("atBoundary").permanentId;
    const aboveBoundaryId = s.perm("aboveBoundary").permanentId;
    await advance(s.engine).verb.deletePermanent([s.perm("sandiramon").permanentId], "byEffect");
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === atBoundaryId), 500);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === atBoundaryId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === aboveBoundaryId)).toBe(true);
  });

  it("grants inherited Security Attack only to a Four Sovereigns host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-013", as: "qualified", under: ["EX5-010"] },
          { card: "BT1-009", as: "plain", under: ["EX5-010"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("qualified"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("plain"), "SecurityAttack")).toBe(0);
  });
});
