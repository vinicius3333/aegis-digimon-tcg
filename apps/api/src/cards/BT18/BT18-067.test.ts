import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-067.js";
import "./BT18-067.js";

describe("BT18-067 MetalKabuterimon", () => {
  it("de-digivolves one opponent card on play and has Blocker", async () => {
    expect(compiled.effects.slice(0, 2)).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Blocker" }] },
      { trigger: "OnPlay", actions: [{ kind: "DeDigivolve", amount: 1 }] },
    ]);
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-067", as: "metalKabuterimon" }] },
        1: { battleArea: [{ card: "BT18-064", as: "opponentTarget", under: [{ card: "BT1-009", as: "remaining" }] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const removed = s.perm("opponentTarget").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalKabuterimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-067"));
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === removed));
    await s.ready();

    expect(s.perm("opponentTarget").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("opponentTarget").stack.some((card) => card.instanceId === removed)).toBe(false);
    expect(s.state.players[1]!.trash.filter((card) => card.instanceId === removed)).toHaveLength(1);
    const metal = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-067")!;
    expect(observe(s.engine).hasKeyword(metal, "Blocker")).toBe(true);
    expect(s.state.memory).toBe(4);
    assertNoLoudGap(s);
  });

  it.each([
    ["black level 3", "BT18-059", false, 4],
    ["yellow level 3", "BT1-045", false, 4],
    ["J.P. Shibayama", "BT18-091", true, 3],
    ["Beetlemon", "BT18-063", true, 1],
  ])("digivolves from %s for the printed cost", async (_label, baseCard, useAlternateCost, cost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT18-067", as: "metalKabuterimon" }],
        deck: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT18-064", as: "target", under: ["BT1-009"] }] },
    });
    s.state.memory = 8;
    const removed = s.perm("target").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metalKabuterimon").instanceId,
        useAlternateCost,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === removed));

    expect(s.state.memory).toBe(8 - cost);
    expect(s.perm("base").topCard?.cardId).toBe("BT18-067");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain(baseCard);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-001");
    expect(s.perm("target").topCard?.cardId).toBe("BT1-009");
    assertNoLoudGap(s);
  });

  it("de-digivolves an opposing stack without touching a friendly stack or naked peer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-067", as: "metalKabuterimon" }],
          battleArea: [{ card: "BT18-064", as: "friendly", under: ["BT1-009"] }],
        },
        1: {
          battleArea: [
            { card: "BT18-064", as: "eligible", under: [{ card: "BT1-009", as: "remaining" }] },
            { card: "BT1-009", as: "naked" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const friendlyTop = s.perm("friendly").topCard!.instanceId;
    const eligibleTop = s.perm("eligible").topCard!.instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalKabuterimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === eligibleTop));
    expect(s.perm("friendly").topCard?.instanceId).toBe(friendlyTop);
    expect(s.perm("naked").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("eligible").topCard?.cardId).toBe("BT1-009");
    assertNoLoudGap(s);
  });

  it("grants inherited Blocker only to its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-030", as: "host", under: ["BT18-067"] },
          { card: "BT1-030", as: "other" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
    assertNoLoudGap(s);
  });
});
