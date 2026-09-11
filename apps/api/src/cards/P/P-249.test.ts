import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./P-249.js";
import "../index.js";

// P-249 Strabimon — Yellow Lv.3 Hybrid Beastkin.
//
// [Start of Your Main Phase] By placing 1 card with the [Hybrid] trait from your hand or trash
// as this Digimon's bottom digivolution card or under any of your Tamers with inherited effects,
// that Digimon or Tamer may digivolve into a [Hybrid] trait Digimon card in the hand with the
// cost reduced by 2.
// [Inherited] [On Deletion] You may play 1 Tamer card with inherited effects from your hand
// without paying the cost.
//
// source: printed card text. The card is announced but not yet distributed (Official Store
// Tournament 2026 Vol.4, street date 2026-10-01), so the local rules KB has no P-249 entries;
// every clause below is unambiguous as printed and needs no ruling.
//
// FAILS-WHEN-REVERTED: drop the StartOfYourMainPhase effect and the Hybrid card stays where it
// is, no host gains a bottom digivolution card, and no reduced-cost digivolution happens. Drop
// `reduceCost: 2` and the reduced-cost assertions read the full printed cost. Drop
// `underOrFilters` and a Tamer can never host the placement. Drop `hasInheritedEffects` and a
// Tamer without inherited effects becomes a legal host. Drop the inherited OnDeletion effect and
// the Tamer stays in hand when the stack's host is deleted.

// Hybrid-trait fixtures. "Hybrid" is a FORM, and the engine's trait set is
// [...types, ...forms, ...attributes], so these match `match: "trait"`.
const HYBRID_PLACEMENT_CARD = "BT4-025"; // Lobomon, Blue Lv.4 Hybrid; static text only.
const HYBRID_COST_3 = "BT7-036"; // Zephyrmon, Yellow Lv.4 Hybrid, Yellow Lv.3 digivolve cost 3.
const HYBRID_COST_2 = "BT7-035"; // Kazemon, Yellow Lv.4 Hybrid, Yellow Lv.3 digivolve cost 2.
const NON_HYBRID_CARD = "BT1-009"; // Monodramon; no Hybrid form, no triggered effects.
const TAMER_WITH_INHERITED = "BT7-088"; // Zoe Orimoto, Yellow Tamer with an inherited effect.
const TAMER_WITHOUT_INHERITED = "BT2-087"; // Kari Kamiya, Yellow Tamer, no inherited effect.
const TAMER_WITH_INHERITED_NO_ON_PLAY = "BT18-094"; // Koichi Kimura, Purple/Yellow, inherited.

describe("P-249 IR", () => {
  it("gates the optional Hybrid digivolution behind the printed placement cost", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        destination: "digivolutionStack",
        position: "bottom",
        host: "target",
        bindHostAs: "p249PlacementHost",
        target: {
          count: 1,
          from: ["hand", "trash"],
          filter: { nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
        },
        underFilter: { isSelfRef: true },
        underOrFilters: [{ controller: "mine", kind: ["Tamer"], hasInheritedEffects: true }],
      },
      actions: [
        {
          kind: "Digivolve",
          target: { fromSelectionRef: "p249PlacementHost", filter: { kind: ["Digimon", "Tamer"] } },
          into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
          from: ["hand"],
          payCost: true,
          reduceCost: 2,
          optional: true,
        },
      ],
    });
  });

  it("carries the inherited On Deletion Tamer play and claims full coverage", () => {
    const inherited = compiled.effects.find((entry) => entry.trigger === "OnDeletion");
    expect(inherited).toMatchObject({ isInherited: true });
    expect(inherited?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { count: 1, filter: { controller: "mine", kind: ["Tamer"], hasInheritedEffects: true } },
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});

describe("P-249 [Start of Your Main Phase] placement cost and reduced Hybrid digivolution", () => {
  it("places the Hybrid card under itself and digivolves for the printed cost minus 2", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-249", as: "strabimon" }],
          hand: [{ card: HYBRID_COST_3, as: "zephyrmon" }],
          trash: [{ card: HYBRID_PLACEMENT_CARD, as: "lobomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    await s.ready();
    preferred.push(s.inst("lobomon").instanceId, s.perm("strabimon").permanentId);

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("strabimon"));
    await settle(() => s.perm("strabimon").topCard.instanceId === s.inst("zephyrmon").instanceId);

    expect(s.perm("strabimon").topCard.cardId).toBe(HYBRID_COST_3);
    // Bottom-most digivolution card first: the paid placement sits under the original P-249.
    expect(s.perm("strabimon").stack.map((card) => card.cardId)).toEqual([HYBRID_PLACEMENT_CARD, "P-249"]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("lobomon").instanceId)).toBe(false);
    // Printed Yellow Lv.3 digivolution cost 3, reduced by 2, so exactly 1 memory is paid.
    expect(s.state.memory).toBe(4);
  });

  it("floors the reduction at the printed cost rather than refunding memory", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-249", as: "strabimon" }],
          hand: [{ card: HYBRID_COST_2, as: "kazemon" }],
          trash: [{ card: HYBRID_PLACEMENT_CARD, as: "lobomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    await s.ready();
    preferred.push(s.inst("lobomon").instanceId, s.perm("strabimon").permanentId);

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("strabimon"));
    await settle(() => s.perm("strabimon").topCard.instanceId === s.inst("kazemon").instanceId);

    expect(s.perm("strabimon").topCard.cardId).toBe(HYBRID_COST_2);
    // Printed cost 2 reduced by 2 is 0; the reduction never becomes a memory gain.
    expect(s.state.memory).toBe(5);
  });

  it("places under a Tamer with inherited effects and digivolves that Tamer instead", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-249", as: "strabimon" },
            { card: TAMER_WITH_INHERITED, as: "zoe" },
          ],
          hand: [{ card: HYBRID_COST_2, as: "kazemon" }],
          trash: [{ card: HYBRID_PLACEMENT_CARD, as: "lobomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    await s.ready();
    preferred.push(s.inst("lobomon").instanceId, s.perm("zoe").permanentId);

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("strabimon"));
    await settle(() => s.perm("zoe").topCard.instanceId === s.inst("kazemon").instanceId);

    expect(s.perm("zoe").topCard.cardId).toBe(HYBRID_COST_2);
    expect(s.perm("zoe").stack.map((card) => card.cardId)).toEqual([HYBRID_PLACEMENT_CARD, TAMER_WITH_INHERITED]);
    // The source Digimon is untouched when the controller routes the placement to a Tamer.
    expect(s.perm("strabimon").topCard.cardId).toBe("P-249");
    expect(s.perm("strabimon").stack).toHaveLength(0);
  });

  it("offers the source Digimon and inherited-effect Tamers as hosts but never a plain Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-249", as: "strabimon" },
            { card: TAMER_WITH_INHERITED, as: "zoe" },
            { card: TAMER_WITHOUT_INHERITED, as: "kari" },
          ],
          hand: [{ card: HYBRID_COST_2, as: "kazemon" }],
          trash: [{ card: HYBRID_PLACEMENT_CARD, as: "lobomon" }],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 5;
    await s.ready();

    const firing = advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("strabimon"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const activation = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: activation.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const placement = s.state.pendingDecision!;
    const placementRequest = s.decisions.find(({ req }) => req.decisionId === placement.decisionId)?.req;
    expect(placementRequest?.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("lobomon").instanceId, s.inst("kazemon").instanceId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placement.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("lobomon").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const host = s.state.pendingDecision!;
    const hostRequest = s.decisions.find(({ req }) => req.decisionId === host.decisionId)?.req;
    expect(hostRequest?.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("strabimon").permanentId, s.perm("zoe").permanentId]),
    );
    expect(hostRequest?.options?.candidateInstanceIds).not.toContain(s.perm("kari").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: host.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("zoe").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const digivolution = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: digivolution.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await firing;

    expect(s.perm("zoe").stack.map((card) => card.cardId)).toEqual([HYBRID_PLACEMENT_CARD]);
    expect(s.perm("strabimon").stack).toHaveLength(0);
  });

  it("does not activate at all when no Hybrid-trait card is available to place", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-249", as: "strabimon" }],
          hand: [{ card: NON_HYBRID_CARD, as: "plain" }],
          trash: [{ card: NON_HYBRID_CARD, as: "plainTrash" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("strabimon"));
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("plain").instanceId)).toBe(true);
    expect(s.perm("strabimon").stack).toHaveLength(0);
    expect(s.perm("strabimon").topCard.cardId).toBe("P-249");
    expect(s.state.memory).toBe(5);
  });

  it("keeps the paid placement when the controller declines the optional digivolution", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-249", as: "strabimon" }],
          hand: [{ card: HYBRID_COST_2, as: "kazemon" }],
          trash: [{ card: HYBRID_PLACEMENT_CARD, as: "lobomon" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    await s.ready();
    preferred.push(s.inst("lobomon").instanceId, s.perm("strabimon").permanentId);

    const firing = advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("strabimon"));
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 1);
    const activation = s.decisions.filter(({ req }) => req.kind === "optional")[0]!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: activation.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 2);
    const digivolution = s.decisions.filter(({ req }) => req.kind === "optional")[1]!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: digivolution.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await firing;

    // The cost is paid before the "may" is offered, so the placement stands and the Hybrid
    // Digimon stays in hand.
    expect(s.perm("strabimon").topCard.cardId).toBe("P-249");
    expect(s.perm("strabimon").stack.map((card) => card.cardId)).toEqual([HYBRID_PLACEMENT_CARD]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("kazemon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(5);
  });

  it("declining the whole clause leaves the board untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-249", as: "strabimon" }],
          hand: [{ card: HYBRID_COST_2, as: "kazemon" }],
          trash: [{ card: HYBRID_PLACEMENT_CARD, as: "lobomon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("strabimon"));
    await settle();

    expect(s.perm("strabimon").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("lobomon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("kazemon").instanceId)).toBe(true);
  });
});

describe("P-249 inherited [On Deletion] Tamer play", () => {
  it("plays a Tamer with inherited effects for free when the stack host is deleted", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HYBRID_COST_2, as: "host", under: [{ card: "P-249", as: "source" }] }],
          hand: [
            { card: TAMER_WITH_INHERITED_NO_ON_PLAY, as: "koichi" },
            { card: TAMER_WITHOUT_INHERITED, as: "kari" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    await s.ready();
    preferred.push(s.inst("koichi").instanceId);

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === TAMER_WITH_INHERITED_NO_ON_PLAY),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("koichi").instanceId),
    ).toBe(true);
    // Free play: no memory changes hands.
    expect(s.state.memory).toBe(5);
    // A Tamer without inherited effects is not an eligible choice.
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("kari").instanceId)).toBe(true);
  });

  it("plays nothing when the only Tamer in hand has no inherited effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HYBRID_COST_2, as: "host", under: [{ card: "P-249", as: "source" }] }],
          hand: [{ card: TAMER_WITHOUT_INHERITED, as: "kari" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("kari").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
