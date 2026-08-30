import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-049.js";

describe("BT18-049 Zephyrmon", () => {
  it("gives exactly one own Digimon +3000 DP on play and has Piercing", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Piercing" }] },
      { trigger: "OnPlay", actions: [{ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" }] },
      {
        trigger: "WhenDigivolving",
        actions: [{ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" }],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Piercing" }] },
    ]);
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-049", as: "zephyrmon" }], battleArea: [{ card: "BT1-030", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("target").topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zephyrmon").instanceId })).toEqual({
      ok: true,
    });
    await s.ready();
    const zephyrmon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT18-049")!;
    expect(observe(s.engine).hasPierce(zephyrmon)).toBe(true);
    await settle(() => s.perm("target").currentDP === 6000);

    expect(s.perm("target").currentDP).toBe(6000);
    assertNoLoudGap(s);
  });

  it.each([
    ["Zoe Orimoto", "BT18-090", 3, 2],
    ["Kazemon", "BT18-048", 1, 4],
  ])("digivolves from %s for the named cost and preserves the source", async (_name, baseCard, _cost, memoryLeft) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT18-049", as: "zephyrmon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zephyrmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-049");

    expect(s.state.memory).toBe(memoryLeft);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe(baseCard);
    assertNoLoudGap(s);
  });

  it("gives exactly one friendly Digimon +3000 DP when digivolving", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-048", as: "base" },
            { card: "BT1-030", as: "target" },
          ],
          hand: [{ card: "BT18-049", as: "zephyrmon" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-030", as: "opponent" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("target").topCard!.instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zephyrmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 10000);

    expect([s.perm("base").currentDP, s.perm("target").currentDP].sort((a, b) => a - b)).toEqual([6000, 7000]);
    expect(s.perm("opponent").currentDP).toBe(3000);
    assertNoLoudGap(s);
  });

  it("grants inherited Piercing only to its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-030", as: "host", under: ["BT18-049"] },
          { card: "BT1-030", as: "other" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("other"))).toBe(false);
    assertNoLoudGap(s);
  });
});
