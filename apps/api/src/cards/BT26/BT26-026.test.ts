import { describe, expect, it } from "vitest";
import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-026.js";
import "../index.js";

describe("BT26-026 Cougarmon", () => {
  it("models the printed evolution, Barrier, and alternate-cost choices", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Glowing Dawn"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] }),
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
        }),
        expect.objectContaining({
          trigger: "WhenAttacking",
          frequency: "OncePerTurn",
          actions: [
            expect.objectContaining({
              kind: "Modal",
              choose: 1,
              options: expect.arrayContaining([
                [
                  expect.objectContaining({
                    kind: "CostGatedBlock",
                    cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
                    actions: [
                      expect.objectContaining({ kind: "UseOptionWithoutCost", payCost: true, reduceCostBy: 2 }),
                    ],
                  }),
                ],
                [
                  expect.objectContaining({
                    kind: "CostGatedBlock",
                    cost: { kind: "trashSecurityTop", controller: "mine" },
                    actions: [
                      expect.objectContaining({ kind: "UseOptionWithoutCost", payCost: true, reduceCostBy: 2 }),
                    ],
                  }),
                ],
              ]),
            }),
          ],
        }),
      ]),
    );
  });

  it("publicly uses a Glowing Dawn Option after paying the security-top alternate cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-026", as: "cougarmon" }],
          hand: [
            { card: "P-236", as: "option" },
            { card: "BT1-090", as: "nonGlowingOption" },
          ],
          security: ["BT1-001"],
        },
        1: { security: ["BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const optionId = s.inst("option").instanceId;
    const nonGlowingOptionId = s.inst("nonGlowingOption").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cougarmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId) &&
        s.state.players[1]!.security.length === 1,
    );

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(nonGlowingOptionId);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId)).toBe(true);
  });

  it("uses the bottom face-down Tamer card as the alternate cost and reveals it in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-026", as: "cougarmon" },
            { card: "BT26-089", as: "tamer", under: [{ card: "BT1-001", as: "cost", faceUp: false }] },
          ],
          hand: [{ card: "P-236", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 1;

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("cougarmon"), {
      attackerPermanentId: s.perm("cougarmon").permanentId,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("option").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({
        instanceId: s.inst("cost").instanceId,
        faceUp: true,
      }),
    );
  });

  it("cannot use a higher face-down Tamer card when the bottom card is face up", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-026", as: "cougarmon" },
            {
              card: "BT26-089",
              as: "tamer",
              under: [
                { card: "BT1-001", as: "bottomFaceUp", faceUp: true },
                { card: "BT1-002", as: "higherFaceDown", faceUp: false },
              ],
            },
          ],
          hand: [{ card: "P-236", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 1;

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("cougarmon"), {
      attackerPermanentId: s.perm("cougarmon").permanentId,
    });

    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("bottomFaceUp").instanceId,
      s.inst("higherFaceDown").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("may pay the security cost and then decline the independent Option use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-026", as: "cougarmon" }],
          hand: [{ card: "P-236", as: "option" }],
          security: [{ card: "BT1-001", as: "securityCost" }],
        },
      },
      { autoChooseOption: true },
    );
    s.state.memory = 1;
    const resolving = advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("cougarmon"), {
      attackerPermanentId: s.perm("cougarmon").permanentId,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const costChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: costChoice.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const useChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: useChoice.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("publishes Barrier from the top card and as an inherited keyword", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-026", as: "top" },
          { card: "BT26-027", as: "host", under: [{ card: "BT26-026", as: "source" }] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
  });

  it("uses top-card Barrier to trash security and prevent battle deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-026", as: "cougarmon" }],
        security: [
          { card: "BT1-009", as: "barrierCost" },
          { card: "BT1-010", as: "remaining" },
        ],
      },
    });
    const cougarmonId = s.perm("cougarmon").permanentId;

    const deletion = advance(s.engine).verb.deletePermanent([cougarmonId], "byBattle");
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: cougarmonId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("barrierCost").instanceId);
  });

  it("does not activate Barrier for effect deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-026", as: "cougarmon" }],
        security: [{ card: "BT1-009", as: "barrierCost" }],
      },
    });
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("cougarmon").permanentId], "byEffect")).toBe(1);
    expect(s.events.some((event) => event.kind === "barrierPrompt")).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("does not pay the chosen alternate cost when no eligible Glowing Dawn Option exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-026", as: "cougarmon" }],
          hand: [{ card: "BT1-090", as: "nonGlowingOption" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 1;

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("cougarmon"), {
      attackerPermanentId: s.perm("cougarmon").permanentId,
    });

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("nonGlowingOption").instanceId,
    );
    expect(s.state.memory).toBe(1);
  });

  it("enforces the When Attacking Once Per Turn limit across repeated activations", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-026", as: "cougarmon" },
            { card: "BT26-089", as: "firstTamer", under: [{ card: "BT1-001", as: "firstCost", faceUp: false }] },
            { card: "BT26-089", as: "secondTamer", under: [{ card: "BT1-002", as: "secondCost", faceUp: false }] },
          ],
          hand: [
            { card: "P-236", as: "firstOption" },
            { card: "P-236", as: "secondOption" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    for (let index = 0; index < 2; index += 1) {
      await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("cougarmon"), {
        attackerPermanentId: s.perm("cougarmon").permanentId,
      });
    }

    expect(s.perm("firstTamer").stack).toHaveLength(0);
    expect(s.perm("secondTamer").stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.filter(({ cardId }) => cardId === "P-236")).toHaveLength(1);
  });

  it("uses the exact level-3 Glowing Dawn cost-2 evolution and rejects a near-match", async () => {
    expect(digivolutionRequirementsFor("BT26-026")).toContainEqual({
      level: 3,
      traits: ["Glowing Dawn"],
      cost: 2,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT26-025", as: "base" }],
        hand: [{ card: "BT26-026", as: "cougarmon" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("cougarmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === "BT26-026");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT26-025"]);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "BT26-026", as: "cougarmon" }],
      },
    });
    invalid.state.memory = 2;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("cougarmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
