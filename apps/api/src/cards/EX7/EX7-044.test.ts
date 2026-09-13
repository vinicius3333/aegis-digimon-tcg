import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-044.js";
import "../index.js";

async function chooseRevealRest(s: ReturnType<typeof setupEngine>, optionIndex: number): Promise<void> {
  await settle(() => s.state.pendingDecision?.kind === "chooseOption");
  const destination = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: destination.decisionId,
      response: { kind: "chooseOption", optionIndex },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "orderCards");
  const ordering = s.state.pendingDecision!;
  expect(ordering.kind).toBe("orderCards");
  const payload = JSON.parse(ordering.payloadJson) as { candidateInstanceIds?: string[] };
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: ordering.decisionId,
      response: { kind: "orderCards", order: payload.candidateInstanceIds ?? [] },
    }),
  ).toEqual({ ok: true });
}

const reveal = {
  kind: "RevealAdd",
  revealCount: 4,
  add: [
    {
      filter: {
        controllerDefault: "mine",
        kind: ["Option"],
        nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
      },
      count: 1,
      to: "placeUnder",
      underFilter: { isSelfRef: true },
    },
  ],
  rest: "deckTopOrBottom",
} as const;

const deletion = {
  kind: "Delete",
  target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], playCostLte: 3 }, count: 1 },
  condition: { kind: "ifThisEffectActed", raw: "this effect placed" },
} as const;

describe("EX7-044 Gigadramon", () => {
  it("matches the catalog, Q4578, complete IR, alternate route, and registration", () => {
    expect(getCardDefinition("EX7-044")).toMatchObject({
      cardId: "EX7-044",
      nameEn: "Gigadramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Cyborg"],
      effectText:
        "[Digivolve]Lv.4 w/[Three Musketeers]\u00a0in its text: Cost 3 \n\n[On Play] [When Digivolving] Reveal the top 4 cards of your deck. Place 1 Option card with the [Three Musketeers]\u00a0trait among them as this Digimon's bottom digivolution card. Return the rest to the top or bottom of the deck. If this effect placed, delete 1 of your opponent's Digimon or Tamers with a play cost of 3 or less.",
      inheritedEffectText:
        "＜Collision＞ (During this Digimon's attack, all of your opponent's Digimon gain ＜Blocker＞, and must block if possible).",
    });
    expect(digivolutionRequirementsFor("EX7-044")).toContainEqual({
      level: 4,
      texts: ["Three Musketeers"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled).toEqual({
      effects: [
        { trigger: "OnPlay", actions: [reveal, deletion] },
        { trigger: "WhenDigivolving", actions: [reveal, deletion] },
        {
          trigger: "Static",
          actions: [],
          isInherited: true,
          keywords: [{ keyword: "Collision", raw: "＜Collision＞" }],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 4, texts: ["Three Musketeers"], cost: 3, isAlternate: true }],
    });
    expect(hasRegisteredCompiledCard("EX7-044")).toBe(true);
  });

  it("publicly reveals, places the exact Option under itself, and deletes a low-cost Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-044", as: "giga" }],
          deck: [
            { card: "EX7-066", as: "option" },
            { card: "BT1-009", as: "miss1" },
            { card: "BT1-010", as: "miss2" },
            { card: "BT1-011", as: "miss3" },
            { card: "BT1-012", as: "tail" },
          ],
        },
        1: { battleArea: [{ card: "BT10-058", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 10;
    await s.ready();
    const targetId = s.perm("target").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("giga").instanceId })).toEqual({ ok: true });
    await chooseRevealRest(s, 1);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    const giga = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX7-044")!;
    expect(s.state.memory).toBe(3);
    expect(giga.stack.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
  });

  it("returns every nonselected revealed card to the chosen deck destination", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-044", as: "giga" }],
          deck: [
            { card: "EX7-066", as: "option" },
            { card: "BT1-009", as: "miss1" },
            { card: "BT1-010", as: "miss2" },
            { card: "BT1-011", as: "miss3" },
            { card: "BT1-012", as: "tail" },
          ],
        },
        1: { battleArea: [{ card: "BT10-058", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("giga").instanceId })).toEqual({ ok: true });
    await chooseRevealRest(s, 1);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT10-058"));
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("tail").instanceId,
      s.inst("miss1").instanceId,
      s.inst("miss2").instanceId,
      s.inst("miss3").instanceId,
    ]);
  });

  it("alternate-evolves from an off-color text peer and deletes a low-cost Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-010", as: "base" }],
          hand: [{ card: "EX7-044", as: "giga" }],
          deck: [
            { card: "BT1-038", as: "drawn" },
            { card: "EX7-066", as: "option" },
            "BT1-009",
            "BT1-010",
            "BT1-014",
            { card: "BT1-045", as: "tail" },
          ],
        },
        1: { battleArea: [{ card: "EX7-065", as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 6;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const gigaId = s.inst("giga").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: gigaId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await chooseRevealRest(s, 0);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "EX7-065"));
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.instanceId).toBe(gigaId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId, baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("does not delete when the reveal contains no qualifying Option", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-044", as: "giga" }], deck: ["BT1-009", "BT1-010", "BT1-014", "BT1-038", "BT1-045"] },
        1: { battleArea: [{ card: "BT10-058", as: "target" }] },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("giga").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX7-044"));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual([
      "BT1-009",
      "BT1-010",
      "BT1-014",
      "BT1-038",
      "BT1-045",
    ]);
    expect(s.perm("target").topCard.cardId).toBe("BT10-058");
    expect(s.decisions.filter((decision) => decision.req.kind === "optional")).toHaveLength(0);
  });

  it("rejects an off-color level 4 without Three Musketeers text", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-028", as: "base" }],
        hand: [{ card: "EX7-044", as: "giga" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("giga").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").topCard.cardId).toBe("EX7-028");
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("trashes Shotmon when public evolution invalidates its link requirement (Q4578)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-059", as: "base", linked: [{ card: "BT21-054", as: "shotmon" }] }],
        hand: [{ card: "EX7-044", as: "giga" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 6;
    await s.ready();
    const linkId = s.inst("shotmon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("giga").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX7-044");
    expect(s.perm("base").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(linkId);
  });

  it("forces an opposing non-Blocker to block through inherited Collision", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-064", as: "attacker", dp: 8000, under: ["EX7-044"] }], security: ["BT1-009"] },
      1: { battleArea: [{ card: "BT1-009", as: "defender", dp: 3000 }], security: ["BT1-011"] },
    });
    await s.ready();
    const defenderId = s.perm("defender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    const opened = s.events.find((event) => event.kind === "blockWindowOpened");
    expect(opened && "eligibleBlockerIds" in opened ? opened.eligibleBlockerIds : []).toContain(defenderId);
    expect(opened && "mustBlock" in opened ? opened.mustBlock : undefined).toBe(true);
    expect(s.engine.applyIntent(1, { type: "declineBlock" }).ok).toBe(false);
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: defenderId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === defenderId));
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
