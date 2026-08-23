import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_053 } from "./BT24-053.js";
import "../index.js";

describe("BT24-053 Protecmon", () => {
  it("has its printed Blocker keyword and Appmon level-2 evolution", () => {
    expect(BT24_053.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }],
    });
    expect(BT24_053.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
  });

  it("models its cost-1 Appmon link and linked Blocker", () => {
    expect(BT24_053.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
    expect(BT24_053.effects.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }],
    });
  });

  it("digivolves from a level-2 Appmon for cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-006", as: "egg" },
        hand: [{ card: "BT24-053", as: "protecmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("protecmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("protecmon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("also uses its normal black level-2 evolution requirement for cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT17-005", as: "egg" },
        hand: [{ card: "BT24-053", as: "protecmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("protecmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("protecmon").instanceId);

    expect(s.state.memory).toBe(3);
  });

  it("links to an Appmon for cost 1, adds 2000 DP, and grants Blocker", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host" }],
        hand: [{ card: "BT24-053", as: "protecmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const baseDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("protecmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("protecmon").instanceId));
    await settle(() => observe(s.engine).hasKeyword(s.perm("host"), "Blocker"));

    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(baseDp + 2000);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("rejects linking to a non-Appmon host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host" }],
        hand: [{ card: "BT24-053", as: "protecmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("protecmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: false, reason: "link-requirement-unmet" });
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("protecmon").instanceId)).toBe(true);
  });
});
