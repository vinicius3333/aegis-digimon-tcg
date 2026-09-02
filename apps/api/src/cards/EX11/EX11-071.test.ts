import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-071.js";

describe("EX11-071 Cool Boy", () => {
  it("preserves the printed Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-071")).toMatchObject({
      nameEn: "Cool Boy",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("reveals three cards and adds an Omekamon and Royal Knight", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX11-071", as: "cool" }], deck: ["EX11-053", "AD1-008", "BT1-009"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cool").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "EX11-053") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "AD1-008") &&
        s.state.players[0]!.deck.some((card) => card.cardId === "BT1-009"),
      600,
    );
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX11-053")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-008")).toBe(true);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    assertNoLoudGap(s);
  });

  it("returns itself to deck bottom and pays a LIBERATOR card's play cost reduced by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-071", as: "cool" }],
          hand: [{ card: "AD1-008", as: "royalKnight" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    const source = s.inst("cool");
    const effectKey = effectsOf(
      EffectTiming.OnDeclaration,
      (s.engine as unknown as { cardSourceOf(instance: typeof source): Parameters<typeof effectsOf>[1] }).cardSourceOf(
        source,
      ),
    )[0]!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      { ok: true },
    );
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "AD1-008"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("EX11-071");
    assertNoLoudGap(s);
  });

  it("rejects a play-cost-3 card before paying the self-return cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-071", as: "cool" }],
          hand: [{ card: "BT18-060", as: "cheapLiberator" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    const source = s.inst("cool");
    const effectKey = effectsOf(
      EffectTiming.OnDeclaration,
      (s.engine as unknown as { cardSourceOf(instance: typeof source): Parameters<typeof effectsOf>[1] }).cardSourceOf(
        source,
      ),
    )[0]!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      { ok: true },
    );
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("cool").topCard.cardId).toBe("EX11-071");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT18-060");
    assertNoLoudGap(s);
  });

  it("keeps the Tamer on the board when the self-return cost is declined (CR 15-7-4)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-071", as: "cool" }],
          hand: [{ card: "AD1-008", as: "royalKnight" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const source = s.inst("cool");
    const effectKey = effectsOf(
      EffectTiming.OnDeclaration,
      (s.engine as unknown as { cardSourceOf(instance: typeof source): Parameters<typeof effectsOf>[1] }).cardSourceOf(
        source,
      ),
    )[0]!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      { ok: true },
    );
    await settle(() => s.state.pendingDecision === undefined);

    // `abortOnDecline`: refusing the return must not still play the Royal Knight.
    expect(s.perm("cool").topCard.cardId).toBe("EX11-071");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("AD1-008");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "AD1-008")).toBe(false);
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });

  it("leaves a revealed card matching neither add slot on the bottom of the deck", async () => {
    // BT1-009 Monodramon is [Mini Dragon] with no LIBERATOR/Royal Knight trait and is not one
    // of the two named cards, so neither slot may take it.
    const s = setupEngine(
      { 0: { hand: [{ card: "EX11-071", as: "cool" }], deck: ["BT1-009", "BT1-010", "BT1-011", "EX11-053"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cool").instanceId })).toEqual({ ok: true });
    // The three revealed cards go to the bottom, so the untouched fourth card surfaces.
    await settle(() => s.state.players[0]!.deck[0]?.cardId === "EX11-053");

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(
      s.state.players[0]!.deck.slice(1)
        .map(({ cardId }) => cardId)
        .sort(),
    ).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
    assertNoLoudGap(s);
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX11-071", as: "cool", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("cool"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-071")).toBe(true);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR with the play floor and folded reduction", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    // Bracketed card-name refs are exact names (KB Q1231/Q1232), not substrings.
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "RevealAdd",
        revealCount: 3,
        rest: "deckBottom",
        add: [
          {
            filter: { nameOrTrait: [{ tokens: ["Omekamon", "Omnimon (X Antibody)"], match: "nameExact" }] },
            count: 1,
            to: "hand",
          },
          {
            filter: { nameOrTrait: [{ tokens: ["Royal Knight", "LIBERATOR"], match: "trait" }] },
            count: 1,
            to: "hand",
          },
        ],
      },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions).toMatchObject([
      {
        kind: "PlayWithoutCost",
        target: { filter: { playCostGte: 4 } },
        from: ["hand"],
        payCost: true,
        reduceCostBy: 2,
        cost: { kind: "return", to: "deckBottom" },
      },
    ]);
  });
});
