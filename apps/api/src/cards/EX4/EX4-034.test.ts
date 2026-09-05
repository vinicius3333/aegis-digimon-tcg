import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-034.js";
import "../BT17/BT17-049.js";
import "../BT23/BT23-041.js";

describe("EX4-034 Lopmon", () => {
  it("reveals four and adds a green two-color card plus Shu-Chong Wong", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 4,
      add: [
        { filter: { multicolor: true, colorCount: 2, colors: ["Green"] } },
        { filter: { kind: ["Tamer"], nameOrTrait: [{ match: "name", tokens: ["Shu-Chong Wong"] }] } },
      ],
      rest: "deckBottom",
      mandatory: true,
    });
  });
  it("may digivolve itself from hand with a two-cost reduction when suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          bySourceKeyword: "Alliance",
          actions: [{ kind: "Digivolve", costDelta: -2, from: ["hand"], optional: true }],
        },
      ],
    });
  });

  it("adds both mandatory reveal categories to hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX4-034", as: "lopmon" }],
          deck: [
            { card: "BT10-055", as: "multicolor" },
            { card: "EX2-059", as: "shuChong" },
            { card: "EX4-007", as: "wrongColor" },
            { card: "EX2-061", as: "wrongTamer" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const multicolorId = s.inst("multicolor").instanceId;
    const shuChongId = s.inst("shuChong").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lopmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === shuChongId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([multicolorId, shuChongId]),
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toEqual(
      expect.arrayContaining([s.inst("wrongColor").instanceId, s.inst("wrongTamer").instanceId]),
    );
  });

  it("digivolves itself from hand after a real Alliance attack suspends an ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-041", as: "host", under: ["EX4-034"] },
            { card: "BT1-064", as: "ally" },
          ],
          hand: [{ card: "BT17-049", as: "evolution" }],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target", suspended: true }], security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard?.cardId === "BT17-049", 5000);
    expect(s.perm("host").topCard?.cardId).toBe("BT17-049");
  });
});
