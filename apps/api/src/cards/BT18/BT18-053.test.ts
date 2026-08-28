import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-053.js";

describe("BT18-053 JetSilphymon", () => {
  it("suspends the exact opponent and prevents its unsuspension when digivolving", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      {
        trigger: "Main",
        isFromHand: true,
        actions: [{ kind: "Digivolve", costOverride: 3, ignoreRequirements: true }],
      },
      { trigger: "Static", keywords: [{ keyword: "Raid" }] },
      {
        trigger: "WhenDigivolving",
        actions: [
          { kind: "SelectBind" },
          { kind: "Suspend", target: { fromSelectionRef: "suspendedTarget" } },
          { kind: "Restrict", target: { fromSelectionRef: "suspendedTarget" }, restriction: "unsuspend" },
        ],
      },
      { trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 2000 }] },
    ]);
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-048", as: "base" }], hand: [{ card: "BT18-053", as: "jetsilphymon" }] },
        1: {
          battleArea: [
            { card: "BT1-087", as: "opponentTarget" },
            { card: "BT1-030", as: "otherOpponent" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jetsilphymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponentTarget"), "unsuspend"));

    expect(s.state.memory).toBe(7);
    expect(s.perm("opponentTarget").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTarget"), "unsuspend")).toBe(true);
    expect(s.perm("otherOpponent").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("otherOpponent"), "unsuspend")).toBe(false);
    assertNoLoudGap(s);
  });

  it("pays both named trash placements and 3 memory for its hand Main evolution", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-090", as: "zoe" }],
          hand: [{ card: "BT18-053", as: "jetsilphymon" }],
          trash: [
            { card: "BT18-048", as: "kazemon" },
            { card: "BT18-049", as: "zephyrmon" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(
      s.perm("zoe").topCard!.instanceId,
      s.inst("kazemon").instanceId,
      s.inst("zephyrmon").instanceId,
    );
    s.state.memory = 5;

    await advance(s.engine).fireForInstance(EffectTiming.OnDeclaration, s.inst("jetsilphymon"));
    await settle(() => s.perm("zoe").topCard?.cardId === "BT18-053" && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(2);
    expect(s.perm("zoe").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT18-048", "BT18-049", "BT18-090"]),
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("cannot partially pay the hand Main cost without Zephyrmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-090", as: "zoe" }],
          hand: [{ card: "BT18-053", as: "jetsilphymon" }],
          trash: [{ card: "BT18-048", as: "kazemon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    await advance(s.engine).fireForInstance(EffectTiming.OnDeclaration, s.inst("jetsilphymon"));

    expect(s.perm("zoe").topCard?.cardId).toBe("BT18-090");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("kazemon").instanceId);
    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
  });

  it("has Raid and gives +2000 DP only to its inherited host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-053", as: "self" },
          { card: "BT1-030", as: "host", under: ["BT18-053"] },
          { card: "BT1-030", as: "other" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("self"), "Raid")).toBe(true);
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.perm("other").currentDP).toBe(3000);
    assertNoLoudGap(s);
  });
});
