import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT26-030";

describe("BT26-030 Pumpkinmon", () => {
  it("uses the exact level-4 TS alternate evolution for cost 3", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 4,
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT26-022", as: "tsBase" }],
        hand: [{ card: CARD_ID, as: "pumpkinmon" }],
        deck: ["AD1-001"],
      },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsBase").permanentId,
        instanceId: legal.inst("pumpkinmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsBase").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT25-023", as: "wrongTrait" }],
        hand: [{ card: CARD_ID, as: "pumpkinmon" }],
      },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("wrongTrait").permanentId,
        instanceId: illegal.inst("pumpkinmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("Q6996: Security plays an eligible hand card before Pumpkinmon battles the attacker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-035", as: "attacker" }] },
        1: {
          hand: [{ card: "BT24-009", as: "eligible" }],
          security: [{ card: CARD_ID, as: "pumpkinSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-009"));
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId));

    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT26-035")).toBe(true);
  });

  it("Security may play an eligible Digimon from trash and excludes TS Options and cost-5 cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-035", as: "attacker" }] },
        1: {
          security: [{ card: CARD_ID, as: "pumpkinSecurity" }],
          trash: [
            { card: "BT24-009", as: "eligibleDigimon" },
            { card: "BT24-090", as: "tsOption" },
            { card: "BT24-027", as: "costFive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("eligibleDigimon").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-009"));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-009")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("tsOption").instanceId, s.inst("costFive").instanceId]),
    );
  });

  it("On Play trashes exactly one hand card before granting Execute and Ascension to an Iliad Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "pumpkinmon" },
            { card: "BT24-019", as: "iliad" },
          ],
          hand: [
            { card: "BT1-001", as: "discard" },
            { card: "BT1-002", as: "kept" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("discard").instanceId, s.perm("iliad").permanentId);
    const discardId = s.inst("discard").instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("pumpkinmon"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === discardId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("kept").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("iliad"), "Execute")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("iliad"), "Ascension")).toBe(true);
  });

  it("declining the optional hand-trash cost grants no keywords", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "pumpkinmon" },
            { card: "BT24-019", as: "iliad" },
          ],
          hand: [{ card: "BT1-001", as: "discard" }],
        },
      },
      { autoSelectCards: false },
    );
    const resolving = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("pumpkinmon"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("iliad"), "Execute")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("iliad"), "Ascension")).toBe(false);
  });
});
