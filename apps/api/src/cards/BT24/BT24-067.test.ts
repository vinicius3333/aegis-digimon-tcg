import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_067 } from "./BT24-067.js";
import "../index.js";

describe("BT24-067 Hackmon", () => {
  it("limits the linked Rei Katsura play to one or fewer Tamers", () => {
    const watcher = BT24_067.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0] as any;
    expect(watcher).toMatchObject({ event: "whenLinked", sourceFilter: { isSelfRef: true } });
    expect(watcher.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      target: { filter: { nameOrTrait: [{ tokens: ["Rei Katsura"], match: "nameExact" }] } },
      condition: { kind: "permanentCount", seat: "mine", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
      optional: true,
    });
  });

  it.each([
    ["normal purple level-2 requirement", "BT10-006", false],
    ["alternate Appmon level-2 requirement", "BT21-005", true],
  ])("uses the %s for cost 0", async (_label, baseCard, useAlternateCost) => {
    const s = setupEngine({
      0: {
        breeding: { card: baseCard, as: "base" },
        hand: [{ card: "BT24-067", as: "hackmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hackmon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("hackmon").instanceId);

    expect(s.state.memory).toBe(3);
  });

  it("models its cost-1 Appmon link and linked Retaliation", () => {
    expect(BT24_067.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
    expect(BT24_067.effects.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Retaliation" }],
    });
  });

  it("links for cost 1, adds 2000 DP, and grants Retaliation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host" }],
        hand: [{ card: "BT24-067", as: "hackmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const baseDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("hackmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("hackmon").instanceId));
    await settle(() => observe(s.engine).hasKeyword(s.perm("host"), "Retaliation"));

    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(baseDp + 2000);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
  });

  it("plays exact Rei Katsura when this Hackmon gets linked with at most one Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-067", as: "hackmon" }],
          hand: [
            { card: "BT24-053", as: "link" },
            { card: "BT1-009", as: "wrong" },
            { card: "BT24-087", as: "rei" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("hackmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rei").instanceId),
    );

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("wrong").instanceId);
  });

  it("does not play Rei when a neighboring Appmon gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-067", as: "hackmon" },
            { card: "BT21-009", as: "neighbor" },
          ],
          hand: [
            { card: "BT24-053", as: "link" },
            { card: "BT24-087", as: "rei" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("neighbor").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("neighbor").linked.some((card) => card.instanceId === s.inst("link").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("rei").instanceId);
  });
});
