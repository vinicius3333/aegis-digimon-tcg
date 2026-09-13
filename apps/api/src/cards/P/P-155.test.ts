import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-155.js";

const DECK = Array(20).fill("BT1-009");
const SECURITY = Array(20).fill("BT1-009");

describe("P-155 Pawn Device", () => {
  it("encodes Main Draw 1 followed by placing itself in the battle area", () => {
    const main = runtimeCompiledCard("P-155")!.effects.find((effect) =>
      effect.actions.some((action) => action.kind === "PlaceInBattleAreaSelf"),
    )!;
    expect(main).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("encodes Delay's non-red Option trash cost and Security deletion/hand return", () => {
    const compiled = runtimeCompiledCard("P-155")!;
    const delay = compiled.effects.find((effect) => effect.keywords?.some((keyword) => keyword.keyword === "Delay"))!;
    expect(delay).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", kind: ["Option"], excludeColors: ["Red"] }, count: 1 },
          },
        },
      ],
    });
    const waiver = compiled.effects.find((effect) => effect.trigger === "Static")!;
    expect(waiver.actions[0]).toMatchObject({
      condition: {
        kind: "youHaveNone",
        filter: { nameOrTrait: [{ tokens: ["Pawn Device"], match: "nameExact" }] },
      },
    });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 11000 } },
                count: 1,
              },
            },
            { kind: "AddToHandSelf" },
          ],
        }),
      ]),
    );
  });

  it.each([
    [11000, true],
    [12000, false],
  ] as const)("resolves from a public attack at %i DP and returns the checked card (%s)", async (dp, deletes) => {
    const s = setupEngine(
      {
        0: { hand: ["BT1-009"], deck: DECK, security: [{ card: "P-155", as: "pawn" }, ...SECURITY] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp }], deck: DECK, security: SECURITY },
      },
      { autoSelectCards: true },
    );
    const pawnId = s.inst("pawn").instanceId;
    const attackerId = s.perm("attacker").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined && s.state.players[0]!.hand.some((card) => card.instanceId === pawnId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(pawnId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(pawnId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).not.toContain(pawnId);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(!deletes);
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("runs Main from hand, draws one card, and places this Option in the battle area", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "P-155", as: "pawn" }], deck: [{ card: "BT1-009", as: "drawn" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pawn").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("pawn").instanceId));
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("pawn").instanceId)).toBe(true);
  });

  it("uses Delay on the next natural own Main by trashing a non-red Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-151", as: "cost" }],
          hand: [{ card: "P-155", as: "pawn" }, "BT1-009"],
          deck: DECK,
          security: SECURITY,
        },
        1: { hand: ["BT1-009"], deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const pawnId = s.inst("pawn").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: pawnId })).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(8);
    expect(JSON.parse(s.inst("pawn").activatableEffectsJson || "[]")).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const ability = JSON.parse(s.perm("pawn").activatableEffectsJson) as { effectKey: string }[];
    expect(ability).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("pawn").instanceId,
        effectKey: ability[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("pawn").instanceId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
