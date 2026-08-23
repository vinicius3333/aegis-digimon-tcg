import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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
          security: [{ card: "BT1-009", as: "cost" }],
          hand: [{ card: "BT24-083", as: "tamer" }],
        },
      },
      { autoSelectCards: false },
    );

    const resolution = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("aegiomon"));
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const payPrompt = s.decisions.find(({ req }) => req.kind === "optional")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: payPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 2);
    const playPrompt = s.decisions.filter(({ req }) => req.kind === "optional")[1]!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playPrompt.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolution;

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
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
          security: [{ card: "BT1-009", as: "cost" }],
          hand: [
            { card: "BT24-083", as: "duplicate" },
            { card: "BT24-085", as: "different" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("different").instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("aegiomon"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT24-085");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT24-083");
  });

  it("allows Dan Yuki beside Dan Yuki & Kanan Yuki because the names differ (Q6713)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-034", as: "aegiomon" },
            { card: "BT24-085", as: "combined" },
          ],
          security: [{ card: "BT1-009", as: "cost" }],
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

  it("pays security and plays a TS Tamer in the When Moving window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-034", as: "aegiomon" }],
          security: [{ card: "BT1-009", as: "cost" }],
          hand: [{ card: "BT24-083", as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnMove, s.perm("aegiomon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
  });

  it.each([
    ["exact Elecmon", "BT1-028", 0],
    ["level 3 TS", "BT24-009", 1],
  ])("digivolves from %s for cost 2", async (_label, baseCard, alternateRequirementIndex) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT24-034", as: "aegiomon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("aegiomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("aegiomon").instanceId);

    expect(s.state.memory).toBe(3);
  });
});
