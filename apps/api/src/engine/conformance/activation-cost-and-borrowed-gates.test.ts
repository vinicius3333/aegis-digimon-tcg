import { afterEach, describe, expect, it } from "vitest";
import { EffectDuration, EffectTiming } from "@aegis/shared";
import { beforePayCost } from "../effects/builders.js";
import { registerCard, unregisterCard } from "../effects/registry.js";
import type { EffectModule } from "../effects/EffectModule.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { internalsOf } from "../testkit/internals.js";
import "../../cards/BT19/BT19-030.js";
import { compiled as originalPaymentOption } from "../../cards/BT1/BT1-102.js";
import { registerIrCard } from "../effects/interpreter.js";
import { compiled as originalBorrower } from "../../cards/BT24/BT24-102.js";
import { compiled as originalLender } from "../../cards/BT24/BT24-101.js";

const PAYMENT_ONLY_OPTION = "BT1-102";

describe("activation cost and borrowed timing gates", () => {
  let originalPaymentModule: EffectModule | undefined;
  let paymentOverrideActive = false;

  afterEach(() => {
    if (paymentOverrideActive) {
      unregisterCard(PAYMENT_ONLY_OPTION);
      if (originalPaymentModule !== undefined) registerCard(originalPaymentModule);
      registerIrCard(PAYMENT_ONLY_OPTION, originalPaymentOption);
    }
    originalPaymentModule = undefined;
    paymentOverrideActive = false;
    registerIrCard("BT24-102", originalBorrower);
    registerIrCard("BT24-101", originalLender);
  });

  it("fires the cost threshold from printed use cost when payment-only reduction reaches zero (Q5462)", async () => {
    originalPaymentModule = unregisterCard(PAYMENT_ONLY_OPTION);
    paymentOverrideActive = true;
    registerCard({
      cardId: PAYMENT_ONLY_OPTION,
      effectsForTiming(timing, source) {
        if (timing !== EffectTiming.BeforePayCost) return [];
        return [
          beforePayCost({
            source,
            effectKey: `${PAYMENT_ONLY_OPTION}/payment-only-q5462`,
            description: "test payment-only use-cost reduction",
            // This deliberately changes only the amount paid. The use-cost projection is
            // read before this window and must continue to see BT1-102's printed cost (2).
            resolve: async (ctx) => {
              ctx.playCostDelta = 2;
            },
          }),
        ];
      },
    });

    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST22-03", under: ["BT19-030"], as: "renamonHost" }],
        hand: [{ card: PAYMENT_ONLY_OPTION, as: "option" }],
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-009", "BT1-010"],
      },
      1: { battleArea: [{ card: "BT1-019", as: "target", dp: 15000 }] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    // Payment was reduced from 2 to 0, but BT19-030's inherited threshold still fired.
    expect(s.state.memory).toBe(0);
    expect(s.perm("target").currentDP).toBe(13000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([false, true])("%s: blocks a borrowed When Digivolving effect at the lender (Q5543)", async (restricted) => {
    // Test-only IR overrides isolate the public activation/borrow path; production card modules
    // are restored after each case and remain unchanged.
    registerIrCard("BT24-101", {
      effects: [{ trigger: "WhenDigivolving", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] }],
      coverage: "full",
      residual: [],
    });
    registerIrCard("BT24-102", {
      effects: [
        {
          trigger: "Main",
          actions: [
            {
              kind: "ActivateForeignEffect",
              zone: "battleArea",
              fromTriggers: ["WhenDigivolving"],
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Olympos XII"], match: "trait" }],
              },
              count: 1,
              cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
              optional: false,
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-102", as: "borrower" },
            { card: "BT24-101", as: "lender" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-009"], security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    if (restricted) {
      const lender = s.perm("lender");
      internalsOf(s.engine).continuous.addRestriction(
        lender.permanentId,
        "cannotActivateWhenDigivolving",
        EffectDuration.Permanent,
      );
    }
    const effects = JSON.parse(s.perm("borrower").activatableEffectsJson ?? "[]") as { effectKey: string }[];
    expect(effects.length).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("borrower").instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("borrower").isSuspended);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(!restricted);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
