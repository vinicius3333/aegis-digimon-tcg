import { compiledEffects, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX12-065.js";
// EX12-063 sits in the Q6866 stack; its inherited [On Deletion] must be registered to trigger.
import "./EX12-063.js";

const CARD_ID = "EX12-065";

describe("EX12-065 Kaguyamon", () => {
  it("maps the catalog, evolution, Fortitude, all-turns keywords, and shared once-per-turn windows", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual([
      { level: 5, traits: ["Puppet", "Shambala"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Fortitude",
      raw: "＜Fortitude＞",
    });

    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["trash"],
            payCost: false,
            optional: true,
            target: {
              count: 1,
              filter: {
                playCostLte: 5,
                nameOrTrait: [{ tokens: ["Puppet", "Shambala"], match: "trait" }],
              },
            },
          },
        ],
      });
    }

    expect(registeredCompiledCards.get(CARD_ID)).toEqual(compiled);
    expect(compiledEffects[CARD_ID]).toEqual(compiled);
  });

  it("plays only a matching low-cost Puppet from trash on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "source" }],
          trash: [
            { card: "BT1-038", as: "valid" },
            { card: "EX12-063", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-038"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      expect.arrayContaining([CARD_ID, "BT1-038"]),
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX12-063")).toBe(true);
  });

  it("may play a low-cost Shambala Tamer and may decline the shared play effect", async () => {
    const accepted = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }], trash: [{ card: "BT26-104", as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(accepted.engine).fire(EffectTiming.WhenDigivolving, accepted.perm("source"));
    await settle(() => accepted.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT26-104"));
    expect(accepted.state.players[0]!.trash).toHaveLength(0);

    const declined = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }], trash: [{ card: "BT1-038", as: "puppet" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const resolution = advance(declined.engine).fire(EffectTiming.WhenDigivolving, declined.perm("source"));
    await settle(() => declined.state.pendingDecision?.kind === "optional");
    expect(
      declined.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: declined.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolution;
    expect(declined.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-038"]);
  });

  it("shares the once-per-turn budget across play and attacking windows", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "source" }],
          trash: [
            { card: "BT1-038", as: "first" },
            { card: "BT11-035", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    const sourceInstanceId = s.inst("source").instanceId;
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-038") &&
        advance(s.engine).ledgers.tracker.count(sourceInstanceId, "EX12-065/ir-shared-0") === 1,
    );

    const source = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === CARD_ID)!;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, source);
    await settle(() => false, 40);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT11-035")).toBe(true);
  });

  it("grants Blocker and Retaliation to own Puppet/TB Digimon only", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "source" },
          { card: "BT1-038", as: "puppet" },
          { card: "EX12-061", as: "tb" },
          { card: "BT1-009", as: "other" },
        ],
      },
    });
    await s.ready();

    for (const keyword of ["Blocker", "Retaliation"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm("source"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("puppet"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("tb"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("other"), keyword)).toBe(false);
    }
  });

  it("keeps granting Blocker and Retaliation to a Puppet Digimon played after it, and never to the opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [{ card: "BT1-038", as: "latePuppet" }],
        },
        1: { battleArea: [{ card: "BT1-038", as: "opponentPuppet" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;

    for (const keyword of ["Blocker", "Retaliation"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm("opponentPuppet"), keyword)).toBe(false);
    }

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("latePuppet").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    const late = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("latePuppet").instanceId,
    )!;
    for (const keyword of ["Blocker", "Retaliation"] as const) {
      expect(observe(s.engine).hasKeyword(late, keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("opponentPuppet"), keyword)).toBe(false);
    }
  });

  it("stops granting the keywords once it leaves the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "BT1-038", as: "puppet" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("puppet"), "Blocker")).toBe(true);

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => !s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));

    for (const keyword of ["Blocker", "Retaliation"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm("puppet"), keyword)).toBe(false);
    }
  });

  it("returns the lowest level on real deletion and Fortitude replays itself when it had a source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source", under: ["EX12-063"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT1-010", as: "higher" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    const sourceId = s.perm("source").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([sourceId], "byEffect")).toBe(1);
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === CARD_ID),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-009");
    const replayed = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === CARD_ID)!;
    expect(replayed.permanentId).not.toBe(sourceId);
    expect(replayed.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX12-063")).toBe(true);
  });

  it.each([
    ["EX12-063", ["EX12-063", "EX12-065"]],
    ["EX12-065", ["EX12-065", "EX12-063"]],
  ])(
    "Q6866 lets the controller order the simultaneous on-deletion effects, taking %s first",
    async (firstCardId, expectedOrder) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: CARD_ID, as: "source", under: ["EX12-063"] }],
            trash: [{ card: "BT26-012", as: "fromTrash" }],
          },
          1: { battleArea: [{ card: "BT1-009", as: "lowest" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
      );
      await s.ready();

      // Fire-and-forget: the deletion cannot complete until the ordering decision is answered.
      const deletion = advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");

      const ordering = s.state.pendingDecision!;
      const request = s.decisions.find(({ req }) => req.decisionId === ordering.decisionId)!.req;
      const ids = request.options?.triggerCardIds ?? [];
      const keys = request.options?.triggerKeys ?? [];
      // Kaguyamon's own [On Deletion] and Karakurumon's inherited [On Deletion] trigger at the
      // same time. Fortitude is a third simultaneous trigger for the same deletion, so the
      // controller — not the engine — decides which resolves first.
      expect(ids).toHaveLength(3);
      expect(ids).toEqual(expect.arrayContaining(["EX12-063", CARD_ID, CARD_ID]));

      const firstKey = keys.find((key, index) => ids[index] === firstCardId && !key.includes("keyword/fortitude"));
      expect(firstKey).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: ordering.decisionId,
          response: { kind: "orderTriggers", order: [firstKey!] },
        }),
      ).toEqual({ ok: true });

      // The second order prompt contains the remaining printed effect and Fortitude. Select
      // the other printed effect; Fortitude then resolves last and may legitimately replay the
      // card's On Play effect.
      const secondCardId = firstCardId === "EX12-063" ? CARD_ID : "EX12-063";
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const secondOrdering = s.state.pendingDecision!;
      expect(secondOrdering.decisionId).not.toBe(ordering.decisionId);
      const secondRequest = s.decisions.find(({ req }) => req.decisionId === secondOrdering.decisionId)!.req;
      const secondIds = secondRequest.options?.triggerCardIds ?? [];
      const secondKeys = secondRequest.options?.triggerKeys ?? [];
      const secondKey = secondKeys.find(
        (key, index) => secondIds[index] === secondCardId && !key.includes("keyword/fortitude"),
      );
      expect(secondKey).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: secondRequest.decisionId,
          response: { kind: "orderTriggers", order: [secondKey!] },
        }),
      ).toEqual({ ok: true });
      await deletion;
      await settle();
      expect(s.state.pendingDecision).toBeUndefined();
      expect(
        s.events.filter(
          (event) =>
            event.kind === "effectResolved" && (event.sourceCardId === CARD_ID || event.sourceCardId === "EX12-063"),
        ).length,
      ).toBeGreaterThanOrEqual(2);

      expect(
        s.events
          .filter((event) => event.kind === "effectResolved")
          .map((event) => event.sourceCardId)
          .filter((cardId) => cardId === CARD_ID || cardId === "EX12-063")
          .slice(0, 2),
      ).toEqual(expectedOrder);
    },
  );

  it("Q6866: choosing Fortitude first strands both pending On Deletion effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source", under: ["EX12-063"], suspended: true }],
          trash: [{ card: "BT26-012", as: "fromTrash" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "lowest" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: false },
    );
    await s.ready();

    const sourceId = s.perm("source").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([sourceId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");

    const ordering = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === ordering.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    const fortitudeKey = keys.find((key) => key.includes("keyword/fortitude"));
    expect(fortitudeKey).toBeDefined();
    expect(request.options?.triggerKeys).toHaveLength(3);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderTriggers", order: [fortitudeKey!] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const replayOnPlay = s.state.pendingDecision;
    expect(replayOnPlay?.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: replayOnPlay!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await deletion;
    await settle();
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID)).toBe(true);

    // Fortitude replays the deleted top card, and replaying it first removes the deleted
    // source's own/inherited pending effects from the queue: no opponent return and no
    // inherited trash play may occur afterward.
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.deck.some(({ cardId }) => cardId === "BT1-009")).toBe(false);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-012")).toBe(true);
  });

  it("Q6866 also orders Fortitude before both On Deletion effects after a battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-057", as: "attacker" },
            { card: "BT1-009", as: "otherOpponent" },
          ],
        },
        1: {
          battleArea: [{ card: CARD_ID, as: "source", under: ["EX12-063"], suspended: true }],
          trash: [{ card: "BT26-012", as: "fromTrash" }],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: false },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("source").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");

    const ordering = s.state.pendingDecision!;
    const decision = s.decisions.find(({ req }) => req.decisionId === ordering.decisionId)!;
    const keys = decision.req.options?.triggerKeys ?? [];
    const fortitudeKey = keys.find((key) => key.includes("keyword/fortitude"));
    expect(decision.seat).toBe(1);
    expect(fortitudeKey).toBeDefined();
    expect(keys).toHaveLength(3);

    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderTriggers", order: [fortitudeKey!] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const replayOnPlay = s.state.pendingDecision;
    expect(replayOnPlay?.kind).toBe("optional");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: replayOnPlay!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID)).toBe(true);

    // Equal DP deletes both combatants in the same battle; the attacker has no surviving
    // permanent for Retaliation to delete.
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX12-057")).toBe(false);
    // The unrelated opponent Digimon proves Kaguyamon's pending On Deletion return effect was
    // stranded together with the inherited Karakurumon effect.
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT26-012")).toBe(false);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT26-012")).toBe(true);
  });

  it("stays deleted without a digivolution source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "source" }] } });
    await s.ready();
    const sourceId = s.perm("source").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([sourceId], "byEffect")).toBe(1);
    await settle();
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID)).toBe(false);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === CARD_ID)).toBe(true);
  });

  it("uses both normal colors and both alternate traits, rejects a nonmatch, and matches the catalog", async () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Kaguyamon",
      colors: ["Purple", "Green"],
      kinds: ["Digimon"],
      playCost: 12,
      dp: 12000,
      level: 6,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Puppet", "Sanmyojin", "Tentei Hachibushu", "Shambala", "TB"],
      evoCosts: [
        { color: "Purple", level: 5, memoryCost: 4 },
        { color: "Green", level: 5, memoryCost: 4 },
      ],
    });
    for (const [baseCardId, useAlternateCost, cost] of [
      ["EX12-064", false, 4],
      ["BT1-075", false, 4],
      ["BT1-038", true, 3],
      ["EX12-031", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: CARD_ID, as: "target" }] },
      });
      s.state.memory = 4;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.state.memory).toBe(4 - cost);
    }
    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "base" }], hand: [{ card: CARD_ID, as: "target" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("target").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
