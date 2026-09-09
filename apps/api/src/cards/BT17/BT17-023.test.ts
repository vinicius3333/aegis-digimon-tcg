import { describe, expect, it } from "vitest";
import { EffectTiming, effectiveStaticNames, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT4/BT4-030.js";
import { compiled } from "./BT17-023.js";
import "./index.js";

describe("BT17-023", () => {
  it("matches the catalog printed text, evolution costs and requirement", () => {
    expect(getCardDefinition("BT17-023")).toMatchObject({
      cardId: "BT17-023",
      nameEn: "KendoGarurumon",
      colors: ["Blue", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      forms: ["Hybrid"],
      types: ["Cyborg"],
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
      inheritedEffectText: "[When Attacking] If you have 7 or fewer cards in your hand, ＜Draw 1＞.",
    });
    const printed = getCardDefinition("BT17-023")!.effectText!;
    expect(printed).toContain("[Digivolve][Koji Minamoto]: Cost 2");
    expect(printed).toContain("[Digivolve][Lobomon]: Cost 1");
    expect(printed).toContain(
      "You may digivolve this card from your hand onto one of your yellow Tamers as if that card is a level 3 yellow Digimon.",
    );
    expect(printed).toContain("[When Attacking] ＜Draw 1＞");
    expect(printed).toContain(
      "[When Attacking] This Digimon may digivolve into a Digimon card with the [Hybrid] trait in the hand with the digivolution cost reduced by 1.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("compiles four effects in printed order with exact IR", () => {
    // Clause 1: static digivolve onto a yellow Tamer as a level 3 yellow Digimon. It is NOT
    // optional — once digivolution into this card is declared you cannot decline it (Q4660).
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "Digivolve", asLevel: 3, payCost: true, target: { count: 1, filter: { kind: ["Tamer"] } } }],
    });
    expect(compiled.effects?.[0]?.actions?.[0]).not.toHaveProperty("optional");
    // Clause 2: [When Attacking] ＜Draw 1＞.
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      keywords: [{ keyword: "Draw", amount: 1 }],
    });
    // Clause 3: [When Attacking] optional digivolve into a [Hybrid] in hand for 1 less. It carries
    // no requirement-bypass flag, so the digivolution requirements still apply (Q2768).
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          costDelta: -1,
          optional: true,
          into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
        },
      ],
    });
    const attackingDigivolve = compiled.effects?.[2]?.actions?.[0] as unknown as Record<string, unknown>;
    expect(attackingDigivolve).not.toHaveProperty("ignoreRequirements");
    expect(attackingDigivolve).not.toHaveProperty("ignoreDigivolutionRequirement");
    // Clause 4 (inherited): conditional [When Attacking] ＜Draw 1＞ at 7 or fewer cards in hand.
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 7 } }],
    });
  });

  it("declares the named routes as exact names (coordinator route-name decision)", () => {
    // Printed "[Digivolve][X]: Cost N" (no "in name") is exact-name matching. The committed
    // effects.json record still uses a substring `names` gate (see the retained catalog-sync red);
    // the near-name negative the decision asks for is not constructible from the real catalog:
    // BT18-088 "Takuya Kanbara & Koji Minamoto" carries an exact "Koji Minamoto" alias, and every
    // "Lobomon"-containing name equals "Lobomon", so no card is a substring-but-not-exact match.
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Koji Minamoto"], cost: 2, isAlternate: true, baseIsTamer: true },
      { namesExact: ["Lobomon"], cost: 1, isAlternate: true },
    ]);
    expect(effectiveStaticNames(getCardDefinition("BT18-088")!)).toContain("Koji Minamoto");
  });

  it("selects the correct alternate route per base, and refuses an illegal source", () => {
    // Q2764: the [Koji Minamoto]: Cost 2 route (baseIsTamer) is chosen for a Koji Minamoto Tamer.
    expect(matchingAlternateDigivolutionRequirement("BT17-023", "BT17-083")).toMatchObject({
      cost: 2,
      baseIsTamer: true,
    });
    // The alias-bearing "Takuya Kanbara & Koji Minamoto" also takes the cost-2 route (Q2762 base).
    expect(matchingAlternateDigivolutionRequirement("BT17-023", "BT18-088")).toMatchObject({ cost: 2 });
    // The [Lobomon]: Cost 1 route (a Digimon base) is chosen for Lobomon.
    expect(matchingAlternateDigivolutionRequirement("BT17-023", "BT17-022")).toMatchObject({ cost: 1 });
    // A yellow Tamer with no named route takes the generic "onto a yellow Tamer as level 3" path.
    expect(matchingAlternateDigivolutionRequirement("BT17-023", "BT1-087")).toMatchObject({
      cost: 3,
      baseIsTamer: true,
    });
    // A blue Tamer is not a yellow Tamer and matches no named route.
    expect(matchingAlternateDigivolutionRequirement("BT17-023", "BT1-086")).toBeUndefined();
  });

  it("digivolves onto a yellow Tamer, taking the bonus draw and stacking the Tamer (Q2765, Q2767)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-086", as: "blueTamer" },
          { card: "BT1-087", as: "yellowTamer" },
        ],
        hand: [{ card: "BT17-023", as: "kendo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;
    const deckBefore = s.state.players[0]!.deck.length;
    const tamerId = s.inst("yellowTamer").instanceId;

    // Illegal source: the printed effect is yellow-Tamer only, so a blue Tamer is refused.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueTamer").permanentId,
        instanceId: s.inst("kendo").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowTamer").permanentId,
        instanceId: s.inst("kendo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowTamer").topCard?.cardId === "BT17-023");

    expect(s.state.memory).toBe(0); // cost 3 at the "as if" level 3 yellow evo cost
    expect(deckBefore - s.state.players[0]!.deck.length).toBe(1); // digivolution bonus draw (Q2765)
    expect(s.perm("yellowTamer").stack.map((card) => card.instanceId)).toEqual([tamerId]); // Tamer is now a digivolution card (Q2767)
  });

  it("digivolves through the printed [Lobomon]: Cost 1 route with a bonus draw and stacked source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-022", as: "lobomon" }],
        hand: [{ card: "BT17-023", as: "kendo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 1;
    const deckBefore = s.state.players[0]!.deck.length;
    const lobomonId = s.inst("lobomon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lobomon").permanentId,
        instanceId: s.inst("kendo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lobomon").topCard?.cardId === "BT17-023");

    expect(s.state.memory).toBe(0); // Lobomon route cost 1
    expect(deckBefore - s.state.players[0]!.deck.length).toBe(1);
    expect(s.perm("lobomon").stack.map((card) => card.instanceId)).toEqual([lobomonId]);
  });

  it("draws from its ＜Draw 1＞ [When Attacking] on a public attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-023", as: "kendo" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-012", as: "dummy", suspended: true }] },
      },
      { autoDeclineOptional: true },
    );
    const handBefore = s.state.players[0]!.hand.length;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kendo").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dummy").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === handBefore + 1);

    expect(s.state.players[0]!.hand).toHaveLength(handBefore + 1);
    expect(deckBefore - s.state.players[0]!.deck.length).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q2769: digivolving with the 2nd [When Attacking] first loses the 1st one", async () => {
    // "They trigger simultaneously, so the turn player chooses the effect to activate first.
    // However, if you activate the 2nd [When Attacking] effect first and digivolve, the 1st
    // [When Attacking] can no longer be activated." (CR §15-4-4-3: digivolving makes the
    // attacker's top card a digivolution card, so its pending trigger belongs to a card that
    // is no longer what it was when the effect triggered.)
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-023", as: "kendo" }],
          hand: [{ card: "BT4-030", as: "beowolfmon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    const deckBefore = s.state.players[0]!.deck.length;

    const attacking = advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("kendo"));
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const orderDecision = s.state.pendingDecision!;
    const keys = s.decisions.find(({ req }) => req.decisionId === orderDecision.decisionId)!.req.options?.triggerKeys;
    expect(keys).toHaveLength(2);
    // Index 1 is the digivolve effect; index 0 is the ＜Draw 1＞ one.
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: orderDecision.decisionId,
        response: { kind: "orderTriggers", order: [keys![1]!] },
      }),
    ).toEqual({ ok: true });
    await attacking;

    expect(s.perm("kendo").topCard.cardId).toBe("BT4-030");
    // Only the digivolution bonus draw happened: the pending ＜Draw 1＞ never activated.
    expect(deckBefore - s.state.players[0]!.deck.length).toBe(1);
  });

  it("Q6567: a host with this card beneath it draws from the inherited [When Attacking] at 7 or fewer cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "host", under: ["BT17-023"] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-012", as: "dummy", suspended: true }] },
      },
      { autoDeclineOptional: true },
    );
    const handBefore = s.state.players[0]!.hand.length; // 1 (<= 7)
    const deckBefore = s.state.players[0]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dummy").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === handBefore + 1);

    expect(s.state.players[0]!.hand).toHaveLength(handBefore + 1);
    expect(deckBefore - s.state.players[0]!.deck.length).toBe(1);
  });

  it("does not draw the inherited [When Attacking] with 8 cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "host", under: ["BT17-023"] }],
          hand: Array.from({ length: 8 }, () => ({ card: "BT1-009" })),
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-012", as: "dummy", suspended: true }] },
      },
      { autoDeclineOptional: true },
    );
    const handBefore = s.state.players[0]!.hand.length; // 8 (> 7)
    const deckBefore = s.state.players[0]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dummy").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);

    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.players[0]!.deck.length).toBe(deckBefore);
  });
});
