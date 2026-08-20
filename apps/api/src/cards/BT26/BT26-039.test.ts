import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT26-039";

describe("BT26-039 Sunflowmon", () => {
  it("uses the exact level-3 DATA SQUAD alternate evolution for cost 2", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 3,
      traits: ["DATA SQUAD"],
      cost: 2,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT26-036", as: "dataSquad" }],
        hand: [{ card: CARD_ID, as: "sunflowmon" }],
        deck: ["AD1-001"],
      },
    });
    legal.state.memory = 2;

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("dataSquad").permanentId,
        instanceId: legal.inst("sunflowmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("dataSquad").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "wrongTrait" }],
        hand: [{ card: CARD_ID, as: "sunflowmon" }],
      },
    });
    illegal.state.memory = 2;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("wrongTrait").permanentId,
        instanceId: illegal.inst("sunflowmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("On Play freely plays Yoshino with exactly one existing Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "sunflowmon" },
            { card: "BT1-085", as: "existingTamer" },
          ],
          hand: [{ card: "BT4-095", as: "yoshino" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sunflowmon"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT4-095")).toBe(true);
  });

  it("When Digivolving chooses exactly one among multiple Yoshino printings", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "sunflowmon" }],
          hand: [
            { card: "BT4-095", as: "firstYoshino" },
            { card: "BT13-100", as: "chosenYoshino" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("chosenYoshino").instanceId);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("sunflowmon"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-100")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("firstYoshino").instanceId]);
  });

  it("does not offer the free play with two Tamers or without Yoshino", async () => {
    const tooMany = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "sunflowmon" },
            { card: "BT1-085", as: "firstTamer" },
            { card: "BT1-087", as: "secondTamer" },
          ],
          hand: [{ card: "BT4-095", as: "yoshino" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(tooMany.engine).fire(EffectTiming.OnPlay, tooMany.perm("sunflowmon"));
    expect(tooMany.state.players[0]!.hand).toHaveLength(1);
    expect(tooMany.decisions.some(({ req }) => req.kind === "optional" || req.kind === "selectCards")).toBe(false);

    const noYoshino = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "sunflowmon" }],
        hand: ["AD1-001"],
      },
    });
    await advance(noYoshino.engine).fire(EffectTiming.WhenDigivolving, noYoshino.perm("sunflowmon"));
    expect(noYoshino.state.players[0]!.hand).toHaveLength(1);
  });

  it("inherited When Attacking locks one opponent Digimon, including an already suspended one", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-082", as: "host", under: [CARD_ID] }] },
        1: {
          battleArea: [{ card: "BT26-035", as: "target", suspended: true }],
          security: ["AD1-001"],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));

    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it("shares one inherited Once Per Turn budget across two attacks", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-082", as: "host", under: [CARD_ID] }] },
        1: {
          battleArea: [
            { card: "BT26-035", as: "first" },
            { card: "BT26-038", as: "second" },
          ],
          security: ["AD1-001", "AD1-002"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.phase === "Main" && !observe(s.engine).isAttacking());
    expect(observe(s.engine).isRestricted(s.perm("first"), "unsuspend")).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    preferred.splice(0, preferred.length, s.perm("second").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.phase === "Main" && !observe(s.engine).isAttacking());

    expect(observe(s.engine).isRestricted(s.perm("first"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("second"), "unsuspend")).toBe(false);
  });

  it("does not trigger Sunflowmon's inherited effect when another ally attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-082", as: "host", under: [CARD_ID] },
            { card: "BT26-035", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT26-038", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("ally"), {
      attackerPermanentId: s.perm("ally").permanentId,
    });

    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
  });
});
