import { type Action, type CardEffect, type ZoneRef } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { createCardSource } from "../../../cards/CardSource.js";
import { setupEngine } from "../../../testkit/harness.js";
import { createCardStateLookup, createGameAccess } from "../../context.js";
import type { EffectContext } from "../../EffectContext.js";
import { modalHasAvailableOption, runModal } from "./modal.js";
import { registeredCompiledCards } from "../compiledCards.js";
import "../../../../cards/ST23/ST23-15.js";

function securityPaymentModal(from: ZoneRef[] = ["hand"], ceiling?: number): Extract<Action, { kind: "Modal" }> {
  return {
    kind: "Modal",
    choose: 1,
    cost: { kind: "securityToHand" },
    options: [
      [
        {
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", kind: ["Digimon", "Tamer"], playCostLte: ceiling }, count: 1 },
          from,
          payCost: true,
          reduceCostBy: 3,
        },
      ],
      [
        {
          kind: "UseOptionWithoutCost",
          filter: { controller: "mine", kind: ["Option"], playCostLte: ceiling },
          from,
          payCost: true,
          reduceCostBy: 3,
        },
      ],
    ],
  };
}

function availabilityContext(top: string, field = "ST23-04", prohibited = false) {
  const s = setupEngine({ 0: { battleArea: [{ card: field, as: "source" }], security: [top] } });
  const ctx = {
    source: createCardSource(s.perm("source").topCard, createCardStateLookup(s.state)),
    game: createGameAccess(s.state),
    trigger: {},
    fx: { isPlayProhibited: () => prohibited },
    ask: {},
  } as unknown as EffectContext;
  return { s, ctx };
}

describe("GitHub #5319 security-payment modal availability", () => {
  it.each([true, false])(
    "checks the printed waiver against the actual hand after payment (BEATBREAK %s)",
    async (beatbreak) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: beatbreak ? "ST23-04" : "BT1-009", as: "source" }],
          hand: [{ card: "ST23-15", as: "option" }],
        },
      });
      let used = 0;
      const ctx = {
        source: createCardSource(s.perm("source").topCard, createCardStateLookup(s.state)),
        game: createGameAccess(s.state),
        trigger: {},
        fx: {
          isPlayProhibited: () => false,
          useOptionFromHand: async (usingCtx: EffectContext) => {
            used += 1;
            usingCtx.lastOptionUsed = true;
            return [];
          },
        },
        ask: { selectCards: async () => [s.inst("option").instanceId] },
      } as unknown as EffectContext;
      await runModal(ctx, securityPaymentModal());
      expect(used).toBe(beatbreak ? 1 : 0);
      expect(ctx.lastOptionUsed === true).toBe(beatbreak);
      expect(s.state.players[0]!.hand).toHaveLength(1);
      expect(s.state.players[0]!.security).toHaveLength(0);
      expect(ctx.game.colorRequirementWaived?.(s.inst("option").instanceId)).toBe(false);
    },
  );

  it("evaluates effect and action conditions as the prospective Option's own source", () => {
    const previous = registeredCompiledCards.get("BT1-090");
    try {
      registeredCompiledCards.set("BT1-090", {
        effects: [
          {
            trigger: "Static",
            condition: { kind: "not", condition: { kind: "selfIsInBattleArea" } },
            actions: [
              { kind: "WaiveColorRequirement", condition: { kind: "not", condition: { kind: "selfIsInBattleArea" } } },
            ],
          },
        ],
        coverage: "full",
        residual: [],
      });
      expect(modalHasAvailableOption(availabilityContext("BT1-090").ctx, securityPaymentModal())).toBe(true);
    } finally {
      if (previous === undefined) registeredCompiledCards.delete("BT1-090");
      else registeredCompiledCards.set("BT1-090", previous);
    }
  });

  it.each([
    [
      "false effect condition",
      { trigger: "Static", condition: { kind: "isOpponentsTurn" }, actions: [{ kind: "WaiveColorRequirement" }] },
    ],
    [
      "false action condition",
      { trigger: "Static", actions: [{ kind: "WaiveColorRequirement", condition: { kind: "isOpponentsTurn" } }] },
    ],
    [
      "nonself waiver",
      {
        trigger: "Static",
        actions: [{ kind: "WaiveColorRequirement", target: { filter: { controller: "opponent" }, count: 1 } }],
      },
    ],
    [
      "mixed static body",
      { trigger: "Static", actions: [{ kind: "WaiveColorRequirement" }, { kind: "GainMemory", amount: 1 }] },
    ],
    ["on-play waiver", { trigger: "OnPlay", actions: [{ kind: "WaiveColorRequirement" }] }],
    ["alternative color only", { trigger: "Static", actions: [{ kind: "WaiveColorRequirement", color: "Yellow" }] }],
  ] satisfies [string, CardEffect][])("rejects %s", (_label, effect) => {
    const previous = registeredCompiledCards.get("BT1-090");
    try {
      registeredCompiledCards.set("BT1-090", { effects: [effect], coverage: "full", residual: [] });
      expect(modalHasAvailableOption(availabilityContext("BT1-090").ctx, securityPaymentModal())).toBe(false);
    } finally {
      if (previous === undefined) registeredCompiledCards.delete("BT1-090");
      else registeredCompiledCards.set("BT1-090", previous);
    }
  });

  it("evaluates the printed Option waiver without changing hand, security or color grants", () => {
    const { s, ctx } = availabilityContext("ST23-15");
    const top = s.state.players[0]!.security[0]!;
    expect(ctx.game.colorRequirementWaived?.(top.instanceId)).toBe(false);
    expect(modalHasAvailableOption(ctx, securityPaymentModal())).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([top.instanceId]);
    expect(ctx.game.colorRequirementWaived?.(top.instanceId)).toBe(false);
  });

  it("requires the printed BEATBREAK condition and retains ordinary Option color requirements", () => {
    expect(modalHasAvailableOption(availabilityContext("ST23-15", "BT1-009").ctx, securityPaymentModal())).toBe(false);
    expect(modalHasAvailableOption(availabilityContext("BT1-090").ctx, securityPaymentModal())).toBe(false);
  });

  it("applies cost ceilings, play prohibitions and the existing same-name restriction", () => {
    expect(modalHasAvailableOption(availabilityContext("ST23-02").ctx, securityPaymentModal(["hand"], 2))).toBe(false);
    expect(modalHasAvailableOption(availabilityContext("ST23-02", "ST23-04", true).ctx, securityPaymentModal())).toBe(
      false,
    );
    const { ctx } = availabilityContext("ST23-02", "ST23-02");
    ctx.effectRestrictions = new Set(["cannotPlaySameNameAsOwnDigimon"]);
    expect(modalHasAvailableOption(ctx, securityPaymentModal())).toBe(false);
  });

  it("does not project a bottom/opponent cost or a payload sourced from trash", () => {
    const { ctx } = availabilityContext("ST23-02");
    const bottom = securityPaymentModal();
    bottom.cost = { kind: "securityToHand", position: "bottom" };
    expect(modalHasAvailableOption(ctx, bottom)).toBe(false);
    const opponent = securityPaymentModal();
    opponent.cost = { kind: "securityToHand", controller: "opponent" };
    expect(modalHasAvailableOption(ctx, opponent)).toBe(false);
    expect(modalHasAvailableOption(ctx, securityPaymentModal(["trash"]))).toBe(false);
  });
});
