import { EffectDuration, EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_014 } from "./BT25-014.js";
import "../index.js";

const CARD_ID = "BT25-014";

function mainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const source = observe(s.engine).cardSource(s.inst("meramon"));
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith(`${CARD_ID}/`))!
    .effectKey;
}

describe("BT25-014 Meramon", () => {
  it("requires trashing a Flame/TS hand card for the delete and draws only when no deletion occurred", () => {
    const main = BT25_014.effects?.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ frequency: "OncePerTurn" });
    expect(main?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
      cost: {
        kind: "trash",
        target: {
          filter: { controller: "mine", zone: "hand", nameOrTrait: [{ tokens: ["Flame", "TS"], match: "trait" }] },
          count: 1,
        },
      },
    });
    expect(main?.actions?.[1]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 2,
      condition: { kind: "ifThisEffectDidNotDelete" },
    });
  });

  it("preserves the inherited 4000 DP deletion", () => {
    const inherited = BT25_014.effects?.find((entry) => entry.isInherited);
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
    });
  });

  it("pays the Flame/TS cost, deletes exactly 4000 DP, and does not draw after success", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "meramon" }],
          hand: [
            { card: "BT25-008", as: "cost" },
            { card: "BT25-008", as: "secondCost" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim", dp: 4000 },
            { card: "AD1-001", as: "large", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("meramon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("large").permanentId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT25-008");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-001");
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("meramon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("requires an eligible deletion target when one exists (Q6259)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "meramon" }],
        hand: [{ card: "BT15-009", as: "cost" }],
        deck: ["BT1-001", "BT1-002"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", dp: 4000 },
          { card: "BT1-010", as: "second", dp: 3000 },
        ],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("meramon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    expect(decision.kind).toBe("chooseTargets");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [] },
      }),
    ).toMatchObject({ ok: false });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("first").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([s.perm("second").permanentId]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("activates with no eligible opponent and draws 2 after paying the cost (Q6258)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "meramon" }],
          hand: [{ card: "BT15-009", as: "cost" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("meramon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT15-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-001", "BT1-002"]));
  });

  it("allows choosing a deletion-immune target before drawing 2 (Q6260)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "meramon" }],
          hand: [{ card: "BT15-009", as: "cost" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "protected", dp: 4000 },
            { card: "BT1-019", as: "other", dp: 3000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    await s.ready();
    preferred.push(s.perm("protected").permanentId);
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("protected").permanentId,
      "beDeleted",
      EffectDuration.UntilEachTurnEnd,
    );
    await advance(s.engine).recompute();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("meramon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2 && s.state.players[0]!.deck.length === 0);

    const protectedId = s.perm("protected").permanentId;
    const targetDecision = s.decisions.find(({ req }) => {
      if (req.kind !== "chooseTargets") return false;
      return req.options?.candidateInstanceIds?.includes(protectedId) === true;
    });
    expect(targetDecision).toBeDefined();
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-001", "BT1-002"]));
  });

  it("evolves through a legal stack and uses the inherited deletion when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-008", as: "host" }],
          hand: [
            { card: CARD_ID, as: "meramon" },
            { card: "BT1-020", as: "ultimate" },
          ],
        },
        1: { security: ["BT1-001"], battleArea: [{ card: "BT1-009", as: "victim", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual(
      expect.arrayContaining([{ level: 3, traits: ["Flame", "TS"], cost: 2, isAlternate: true }]),
    );
    for (const alias of ["meramon", "ultimate"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("host").topCard.instanceId === s.inst(alias).instanceId);
      expect(s.perm("host").topCard.instanceId).toBe(s.inst(alias).instanceId);
    }
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT25-008", CARD_ID]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("victim").instanceId);
  });
});
