import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-224.js";
import "../index.js";

describe("P-224 Kotone Amano", () => {
  it("places an Xros Heart or Twilight Digimon under this Tamer before the conditional draw", () => {
    const card = runtimeCompiledCard("P-224")!;
    for (const trigger of ["StartOfYourMainPhase", "OnPlay"] as const) {
      expect(
        card.effects.find((effect) => effect.trigger === trigger),
      ).toMatchObject({
        actions: [
          {
            kind: "CostGatedBlock",
            optional: true,
            abortOnDecline: true,
            actions: [
              {
                kind: "Draw",
                amount: 1,
                condition: { kind: "handAtMost", value: 7 },
              },
            ],
            cost: {
              kind: "place",
              target: {
                count: 1,
                from: ["hand", "trash"],
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    { tokens: ["Xros Heart", "Twilight"], match: "trait" },
                  ],
                },
              },
            },
          },
        ],
      });
    }
  });

  it("suspends itself to play a level 5 or higher Xros Heart Digimon from under any Tamer at cost -1", () => {
    expect(
      runtimeCompiledCard("P-224")!.effects.find(
        (effect) => effect.trigger === "Main",
      ),
    ).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["underTamer"],
          payCost: true,
          reduceCostBy: 1,
          cost: {
            kind: "suspend",
            target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
          },
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "underTamer",
              levelComparison: { op: "gte", value: 5 },
              nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("plays itself without paying the cost in security", () => {
    expect(
      runtimeCompiledCard("P-224")!.effects.find(
        (effect) => effect.trigger === "Security",
      ),
    ).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          payCost: false,
          target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
        },
      ],
    });
  });
});
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("P-224 engine behavior", () => {
  it.each([false, true])(
    "offers Taiki materials after an earlier play (decline DigiXros=%s)",
    async (declineDigiXros) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "AD1-006", as: "earlierPlay" }],
            battleArea: [
              {
                card: "P-224",
                as: "kotone",
                under: [{ card: "BT19-014", as: "ex6" }],
              },
              {
                card: "BT10-087",
                as: "taiki",
                under: [{ card: "BT21-021", as: "omni" }],
              },
            ],
          },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          preferInstanceIds: preferred,
          declineDigiXros,
        },
      );
      preferred.push(s.inst("ex6").instanceId, s.perm("taiki").permanentId);
      s.state.memory = 30;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("earlierPlay").instanceId,
        }),
      ).toEqual({
        ok: true,
      });
      await settle();
      s.state.memory = 10;
      const effect = observe(s.engine).activatableEffects(s.perm("kotone"))[0]!;
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: s.inst("kotone").instanceId,
          effectKey: effect.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle();
      const played = s.state.players[0]!.battleArea.find(
        (p) => p.topCard.instanceId === s.inst("ex6").instanceId,
      );
      expect(played).toBeDefined();
      expect(played!.stack.map((c) => c.instanceId)).toEqual(
        declineDigiXros ? [] : [s.inst("omni").instanceId],
      );
      expect(s.perm("taiki").isSuspended).toBe(!declineDigiXros);
      expect(s.perm("taiki").stack.map((c) => c.instanceId)).toEqual(
        declineDigiXros ? [s.inst("omni").instanceId] : [],
      );
      expect(s.state.memory).toBe(declineDigiXros ? 0 : 2);
      expect(
        s.decisions.filter(
          ({ req }) => req.options?.digiXrosCardId === "BT19-014",
        ),
      ).toHaveLength(1);
    },
  );

  it("plays itself from Security through its Security effect", async () => {
    const s = setupEngine({
      0: { security: [{ card: "P-224", as: "kotone" }] },
    });
    await s.ready();
    await advance(s.engine).fireForInstance(
      EffectTiming.SecuritySkill,
      s.inst("kotone"),
    );
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (p) => p.topCard.instanceId === s.inst("kotone").instanceId,
      ),
    );
    expect(
      s.state.players[0]!.battleArea.some(
        (p) => p.topCard.instanceId === s.inst("kotone").instanceId,
      ),
    ).toBe(true);
  });

  it("uses its Main effect to suspend itself and play a level-5 Xros Heart Digimon from under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-224", as: "kotone" },
            {
              card: "BT10-087",
              under: [{ card: "BT10-012", as: "shoutmon" }],
              as: "taiki",
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    const effectKey = (
      observe(s.engine).activatableEffects(s.perm("kotone")) as Array<{
        effectKey: string;
      }>
    )[0]!;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("kotone").instanceId,
        effectKey: effectKey.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("kotone").isSuspended).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(
        (p) => p.topCard.instanceId === s.inst("shoutmon").instanceId,
      ),
    ).toBe(true);
  });
});

describe("P-224 Kotone Amano — KB Q&A rulings", () => {
  it.each([
    [9, false],
    [8, true],
  ] as const)(
    "activates its [Start of Your Main Phase] placement with %i cards in hand (Q6119)",
    async (handSize, draws) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "P-224", as: "kotone" }],
            hand: [
              { card: "BT19-014", as: "xrosHeart" },
              ...Array.from({ length: handSize - 1 }, () => "BT1-009"),
            ],
            deck: [{ card: "BT1-010", as: "deckTop" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      expect(s.state.players[0]!.hand).toHaveLength(handSize);

      await advance(s.engine).fire(
        EffectTiming.StartOfYourMainPhase,
        s.perm("kotone"),
      );
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.perm("kotone").stack.map((card) => card.instanceId)).toEqual([
        s.inst("xrosHeart").instanceId,
      ]);
      expect(s.state.players[0]!.hand).toHaveLength(
        draws ? handSize : handSize - 1,
      );
      expect(s.state.players[0]!.deck).toHaveLength(draws ? 0 : 1);
    },
  );
});
