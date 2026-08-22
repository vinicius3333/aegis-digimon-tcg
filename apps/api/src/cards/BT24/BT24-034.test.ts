import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_034 } from "./BT24-034.js";
import "../index.js";

describe("BT24-034 Aegiomon", () => {
  it("uses the executable top-security-to-hand cost for all three entry timings", () => {
    for (const trigger of ["WhenMoving", "OnPlay", "WhenDigivolving"]) {
      const action = BT24_034.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0] as any;
      expect(action).toMatchObject({
        kind: "CostGatedBlock",
        optional: true,
        cost: { kind: "securityToHand" },
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            target: { filter: { excludeSameNameAsOwnTamers: true } },
          },
        ],
      });
    }
  });
  it("keeps Barrier as both normal and inherited keyword", () => {
    expect(BT24_034.effects?.filter((entry) => entry.keywords?.[0]?.keyword === "Barrier")).toHaveLength(2);
  });

  it("uses an exact Elecmon evolution route", () => {
    expect(BT24_034.digivolutionRequirement).toContainEqual({ namesExact: ["Elecmon"], cost: 2, isAlternate: true });
  });

  it("may pay the security cost and decline the Tamer play (Q5613)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-034", as: "aegiomon" }],
          security: [{ card: "BT1-001", as: "cost" }],
          hand: [{ card: "BT24-083", as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("aegiomon"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("cost").instanceId, s.inst("tamer").instanceId]),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("plays a differently named TS Tamer but excludes an exact duplicate", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-034", as: "aegiomon" },
            { card: "BT24-083", as: "existing" },
          ],
          security: [{ card: "BT1-001", as: "cost" }],
          hand: [
            { card: "BT24-083", as: "duplicate" },
            { card: "BT24-085", as: "different" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("duplicate").instanceId, s.inst("different").instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("aegiomon"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("different").instanceId,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("duplicate").instanceId);
  });

  it("allows Dan Yuki beside Dan Yuki & Kanan Yuki because the names differ (Q6713)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-034", as: "aegiomon" },
            { card: "BT24-085", as: "combined" },
          ],
          security: [{ card: "BT1-001", as: "cost" }],
          hand: [{ card: "BT25-086", as: "dan" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("aegiomon"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("dan").instanceId,
    );
  });

  it("exposes both printed and inherited Barrier", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-034", as: "aegiomon" },
          { card: "BT24-035", as: "host", under: ["BT24-034"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("aegiomon"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
  });
});
