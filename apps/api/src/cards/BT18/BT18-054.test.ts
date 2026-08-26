import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-054.js";

describe("BT18-054 AncientKazemon", () => {
  it("suspends only opponent Digimon at or below its DP and restricts every opponent Digimon", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["Kazemon"] }, { names: ["Zephyrmon"] }], count: 2 },
    ]);
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-054", as: "ancientKazemon" }] },
        1: {
          battleArea: [
            { card: "BT1-030", as: "lowOpponent" },
            { card: "BT1-030", as: "highOpponent" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.perm("lowOpponent").baseDP = 5000;
    s.perm("lowOpponent").currentDP = 5000;
    s.perm("highOpponent").baseDP = 12000;
    s.perm("highOpponent").currentDP = 12000;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancientKazemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("highOpponent"), "unsuspend"));

    expect(s.perm("lowOpponent").isSuspended).toBe(true);
    expect(s.perm("highOpponent").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("lowOpponent"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("highOpponent"), "unsuspend")).toBe(true);
    assertNoLoudGap(s);
  });

  it("applies the same DP threshold and global unsuspend lock when digivolving", async () => {
    const s = setupEngine({
      0: {
        // Use a plain red level 5 so the 11,000 DP threshold is not changed by
        // an inherited effect before AncientKazemon's When Digivolving effect resolves.
        battleArea: [{ card: "BT1-021", as: "base" }],
        hand: [{ card: "BT18-054", as: "ancient" }],
        deck: ["BT1-001"],
      },
      1: {
        battleArea: [
          { card: "BT1-030", as: "low", dp: 11000 },
          { card: "BT1-030", as: "high", dp: 12000 },
        ],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ancient").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("high"), "unsuspend"));

    expect(s.state.memory).toBe(2);
    expect(s.perm("low").isSuspended).toBe(true);
    expect(s.perm("high").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("low"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("high"), "unsuspend")).toBe(true);
    assertNoLoudGap(s);
  });

  it("plays an eligible level-4 Hybrid from its own stack when leaving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-054", as: "ancient", under: ["BT1-030", "BT18-048"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hybridId = s.perm("ancient").stack.find(({ cardId }) => cardId === "BT18-048")!.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byRule")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === hybridId));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === hybridId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-030");
    assertNoLoudGap(s);
  });

  it("DigiXroses only with one Kazemon and one Zephyrmon for 4 less", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-054", as: "ancient" },
          { card: "BT18-048", as: "kazemon" },
          { card: "BT18-049", as: "zephyrmon" },
        ],
      },
    });
    s.state.memory = 12;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ancient").instanceId,
        digiXros: { materialInstanceIds: [s.inst("kazemon").instanceId, s.inst("zephyrmon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId).sort()).toEqual([
      "BT18-048",
      "BT18-049",
    ]);
    assertNoLoudGap(s);
  });

  it("rejects two Kazemon for the distinct DigiXros material slots", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-054", as: "ancient" },
          { card: "BT18-048", as: "kazemonA" },
          { card: "BT18-048", as: "kazemonB" },
        ],
      },
    });
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ancient").instanceId,
        digiXros: { materialInstanceIds: [s.inst("kazemonA").instanceId, s.inst("kazemonB").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    assertNoLoudGap(s);
  });
});
