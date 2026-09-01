import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT12-015.js";

const HAND_MAIN_EFFECT_KEY = "BT12-015/hand-main-stack-and-digivolve";

describe("BT12-015 Aldamon", () => {
  it("registers the hand effect as one compiled, bound, ordered operation", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        effectKey: HAND_MAIN_EFFECT_KEY,
        trigger: "Main",
        isFromHand: true,
        condition: expect.objectContaining({
          kind: "allOf",
          conditions: expect.arrayContaining([
            expect.objectContaining({ kind: "memoryAtLeast", controller: "mine", value: -7 }),
          ]),
        }),
        actions: [
          expect.objectContaining({
            kind: "SelectBind",
            target: expect.objectContaining({ bindAs: "bt12_015_takuya" }),
          }),
          expect.objectContaining({
            kind: "PlaceUnder",
            order: "any",
            underSelectionRef: "bt12_015_takuya",
            target: expect.objectContaining({
              requiredNamesExact: ["Agunimon", "BurningGreymon"],
            }),
          }),
          expect.objectContaining({
            kind: "Digivolve",
            source: "triggerSource",
            costOverride: 3,
            virtualBase: { level: 4, colors: ["Red"] },
            target: expect.objectContaining({ fromSelectionRef: "bt12_015_takuya" }),
          }),
        ],
      }),
      expect.objectContaining({
        effectKey: "BT12-015/return-takuya",
        trigger: "OnDeletion",
      }),
    ]);
  });

  it("uses its [Hand][Main] effect to stack both trash materials and digivolve Takuya", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-015", as: "aldamon" }],
          battleArea: [{ card: "BT12-088", as: "takuya" }],
          trash: [
            { card: "BT12-012", as: "agunimon" },
            { card: "BT12-013", as: "burning" },
          ],
          deck: ["BT1-009"],
        },
      },
      {
        autoSelectCards: true,
        autoOrderTriggers: true,
        autoOrderCards: false,
      },
    );
    s.state.memory = 3;
    await s.ready();
    const aldamon = s.inst("aldamon");
    const takuyaInstanceId = s.perm("takuya").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: aldamon.instanceId,
        effectKey: HAND_MAIN_EFFECT_KEY,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const order = s.state.pendingDecision!;
    const requestedOrder = [s.inst("burning").instanceId, s.inst("agunimon").instanceId];
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("BT12-015");
    expect(JSON.parse(order.payloadJson)).toMatchObject({
      candidateInstanceIds: expect.arrayContaining(requestedOrder),
      visibleInstanceIds: expect.arrayContaining(requestedOrder),
      min: 2,
      max: 2,
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderCards", order: requestedOrder },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("takuya").topCard.instanceId === aldamon.instanceId);

    expect(s.perm("takuya").topCard.cardId).toBe("BT12-015");
    expect(s.perm("takuya").stack.map(({ instanceId }) => instanceId)).toEqual([...requestedOrder, takuyaInstanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toEqual(
      expect.arrayContaining(requestedOrder),
    );
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === aldamon.instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(s.state.memory).toBe(0);
  });

  it("keeps both ordered materials under the Takuya selected by the controller", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-015", as: "aldamon" }],
          battleArea: [
            { card: "BT12-088", as: "first" },
            { card: "BT12-088", as: "second" },
          ],
          trash: [
            { card: "BT12-012", as: "agunimon" },
            { card: "BT12-013", as: "burning" },
          ],
        },
      },
      { autoOrderTriggers: true, autoOrderCards: false },
    );
    s.state.memory = 3;
    await s.ready();

    const aldamon = s.inst("aldamon");
    const secondInstanceId = s.perm("second").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: aldamon.instanceId,
        effectKey: HAND_MAIN_EFFECT_KEY,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const targetDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const orderDecision = s.state.pendingDecision!;
    const requestedOrder = [s.inst("burning").instanceId, s.inst("agunimon").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: orderDecision.decisionId,
        response: { kind: "orderCards", order: requestedOrder },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("second").topCard.instanceId === aldamon.instanceId);
    expect(s.perm("first").topCard.cardId).toBe("BT12-088");
    expect(s.perm("first").stack).toHaveLength(0);
    expect(s.perm("second").stack.map(({ instanceId }) => instanceId)).toEqual([...requestedOrder, secondInstanceId]);
    expect(s.perm("second").topCard.cardId).toBe("BT12-015");
    expect(s.state.memory).toBe(0);
  });

  it("does not activate or move the first material when BurningGreymon is absent", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT12-015", as: "aldamon" }],
        battleArea: [{ card: "BT12-088", as: "takuya" }],
        trash: [{ card: "BT12-012", as: "agunimon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const aldamon = s.inst("aldamon");

    expect(aldamon.activatableEffectsJson).toBe("");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: aldamon.instanceId,
        effectKey: HAND_MAIN_EFFECT_KEY,
      }).ok,
    ).toBe(false);
    await settle();

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("agunimon").instanceId);
    expect(s.perm("takuya").stack).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });

  it.each([
    ["Agunimon is absent", [{ card: "BT12-013", as: "burning" }], "BT12-088", 3],
    [
      "the only Tamer is not Takuya",
      [
        { card: "BT12-012", as: "agunimon" },
        { card: "BT12-013", as: "burning" },
      ],
      "BT12-089",
      3,
    ],
    [
      "the digivolution cost would exceed the memory gauge minimum",
      [
        { card: "BT12-012", as: "agunimon" },
        { card: "BT12-013", as: "burning" },
      ],
      "BT12-088",
      -8,
    ],
  ])("does not surface the hand effect when %s", async (_case, trash, tamer, memory) => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT12-015", as: "aldamon" }],
        battleArea: [{ card: tamer, as: "tamer" }],
        trash,
      },
    });
    s.state.memory = memory;
    await s.ready();
    expect(s.inst("aldamon").activatableEffectsJson).toBe("");
    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("does not expose the [Hand][Main] effect after Aldamon has entered the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-015", as: "aldamon" },
          { card: "BT12-088", as: "takuya" },
        ],
        trash: [
          { card: "BT12-012", as: "agunimon" },
          { card: "BT12-013", as: "burning" },
        ],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.inst("aldamon").activatableEffectsJson).toBe("");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("aldamon").instanceId,
        effectKey: HAND_MAIN_EFFECT_KEY,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.perm("takuya").stack).toHaveLength(0);
  });

  it("returns Takuya from trash to hand on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-015", as: "aldamon" }],
          trash: [{ card: "BT12-088", as: "takuya" }],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("aldamon").permanentId]);
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("takuya").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("takuya").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("takuya").instanceId);
  });
});
