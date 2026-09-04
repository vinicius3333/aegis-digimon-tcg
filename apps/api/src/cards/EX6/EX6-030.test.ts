import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-030.js";

describe("EX6-030 Dominimon", () => {
  it("contains the security search/play and Angel protection clauses in typed IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("SearchSecurity");
    expect(text).toContain("PlayWithoutCost");
    expect(text).toContain("trashSecurityTop");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "SearchSecurity", then: { optional: true } },
      { kind: "ModifyDP", amount: -7000, duration: "untilEachTurnEnd" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      affectsAll: true,
      leaveCause: "otherThanBattle",
    });
  });

  it("publicly reduces an opposing Digimon by 7000 on digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-030", as: "dom" }], security: ["EX6-019"] },
        1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const before = s.perm("opponent").currentDP;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dom"));
    expect(s.perm("opponent").currentDP).toBe(before - 7000);
  });

  it("publicly prevents an Angel's non-battle deletion by trashing security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-030", as: "dom" },
            { card: "EX6-019", as: "angel" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("angel").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("angel").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("still applies the DP reduction when no eligible Angel is found in security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-030", as: "dom" }], security: ["BT1-093"] },
        1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const before = s.perm("opponent").currentDP;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dom"));
    expect(s.perm("opponent").currentDP).toBe(before - 7000);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("publicly exposes Dominimon's Rule-granted Angel trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-030", as: "dom" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("dom"), "Angel")).toBe(true);
  });

  it("does not replace a battle deletion with the security payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-030", as: "dom" },
            { card: "EX6-017", as: "angel" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("angel").permanentId], "byBattle");
    await settle(() =>
      s.state.players[0]!.battleArea.every((perm) => perm.topCard?.instanceId !== s.inst("angel").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("angel").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("publicly protects simultaneous Angel deletions with one security payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-030", as: "dom" },
            { card: "EX6-019", as: "angelOne" },
            { card: "EX6-019", as: "angelTwo" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent(
      [s.perm("angelOne").permanentId, s.perm("angelTwo").permanentId],
      "byEffect",
    );
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("angelOne").instanceId),
    ).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("angelTwo").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
