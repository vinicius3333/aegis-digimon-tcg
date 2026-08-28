import { EffectTiming, getCardDefinition, getCompiledCard, type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import module from "./BT3-093.js";

// A3 for BT3-093 (Davis Motomiya, Blue Tamer).
//
// [On Play] Reveal the top 3 cards of your deck. Add 1 blue Digimon and 1 green
// Digimon among them to your hand. Place the remaining cards at the bottom of
// your deck in any order.
//
// FAILS-WHEN-REVERTED: The [On Play] clause in the original IR is an inert parser fallback
// (no-op). The hand-written module implements it: when Davis is played, if there
// is a blue Digimon among the top 3 revealed deck cards, it is added to hand.
// When reverted, nothing is added to hand and the deck top cards are not moved.
//
// Test: seat 0 plays Davis Motomiya; the top 3 of their deck include a blue Digimon
// (AD1-010 Garurumon) and a green Digimon (BT1-064 Goblimon). After the effect
// resolves, both are in hand.
//
// Cards:
//   BT3-093  — Davis Motomiya (the Tamer being tested)
//   AD1-010  — Garurumon (Blue Lv.4 Digimon — will be added to hand as "1 blue")
//   BT1-064  — Goblimon (Green Lv.3 Digimon — will be added to hand as "1 green")
//   BT1-090  — Gravity Crush (Blue Option — should NOT be added as the blue Digimon)

describe("BT3-093 Davis Motomiya [On Play] reveals deck and adds Digimon to hand", () => {
  it("matches official metadata and publishes separate typed triggers", () => {
    expect(module.cardId).toBe("BT3-093");
    expect(getCardDefinition("BT3-093")).toMatchObject({
      nameEn: "Davis Motomiya",
      colors: ["Blue"],
      playCost: 4,
      effectText: expect.stringContaining("Add 1 blue and 1 green Digimon card"),
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(getCompiledCard("BT3-093")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        { trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3 }] },
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [
                { filter: { colors: ["Blue"] }, optional: true },
                { filter: { colors: ["Green"] }, optional: true },
              ],
            },
          ],
        },
        { trigger: "Security", actions: [{ kind: "PlayWithoutCost" }] },
      ],
    });
  });

  it("sets memory to 3 at the start of the turn", async () => {
    const s = setup({ 0: { battleArea: [{ card: "BT3-093", as: "davis" }] } });
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("davis"));
    expect(s.state.memory).toBe(3);
  });

  it("playing Davis Motomiya adds 1 blue Digimon and 1 green Digimon from the top 3 to hand", async () => {
    const s = setup(
      {
        0: {
          // Build a deck whose top 3 cards are: Garurumon (Blue Lv.4), Goblimon (Green
          // Lv.3), and Gravity Crush (Blue Option — should NOT be picked as the "blue
          // Digimon"). Deck's top card is the LAST element (draws pop()), so the array
          // is written bottom-to-top, oldest first — same order as the original pushes.
          deck: [
            { card: "BT1-090", as: "optionCard", faceUp: true },
            { card: "BT1-064", as: "goblimon", faceUp: true },
            { card: "AD1-010", as: "garurumon", faceUp: true }, // top of deck
          ],
          hand: [{ card: "BT3-093", as: "davis" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const garurumon = s.inst("garurumon");
    const goblimon = s.inst("goblimon");
    const optionCard = s.inst("optionCard");
    const davis = s.inst("davis");
    s.state.memory = 5;

    const handBefore = p0.hand.length;

    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: davis.instanceId,
    });

    // Wait for [On Play] to resolve: both Garurumon and Goblimon end up in hand.
    await settle(
      () =>
        p0.hand.some((c) => c.instanceId === garurumon.instanceId) &&
        p0.hand.some((c) => c.instanceId === goblimon.instanceId),
    );

    // Davis is now on the battle area (played successfully).
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT3-093")).toBe(true);
    // The blue Digimon (Garurumon) was added to hand.
    expect(p0.hand.some((c) => c.instanceId === garurumon.instanceId)).toBe(true);
    // The green Digimon (Goblimon) was added to hand.
    expect(p0.hand.some((c) => c.instanceId === goblimon.instanceId)).toBe(true);
    // The Option card (not a Digimon) was not taken — should be in deck bottom.
    expect(p0.hand.some((c) => c.instanceId === optionCard.instanceId)).toBe(false);
    expect(p0.deck.some((c) => c.instanceId === optionCard.instanceId)).toBe(true);
    // Hand grew by 2 (blue + green Digimon), minus the Davis itself.
    expect(p0.hand.length).toBe(handBefore - 1 + 2);
  });

  it("keeps all three revealed identities visible through both color choices", async () => {
    const s = setup({
      0: {
        hand: [{ card: "BT3-093", as: "davis" }],
        deck: [
          { card: "AD1-010", as: "blue" },
          { card: "BT1-064", as: "green" },
          { card: "BT1-090", as: "option" },
        ],
      },
    });
    s.state.memory = 10;
    const visibleCards = [
      { instanceId: s.inst("blue").instanceId, cardId: "AD1-010" },
      { instanceId: s.inst("green").instanceId, cardId: "BT1-064" },
      { instanceId: s.inst("option").instanceId, cardId: "BT1-090" },
    ];

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("davis").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const blueDecision = s.decisions.at(-1)!.req;
    expect(blueDecision.options?.visibleCards).toEqual(visibleCards);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: blueDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("blue").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest !== undefined &&
        latest.decisionId !== blueDecision.decisionId &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "selectCards"
      );
    });

    const greenDecision = s.decisions.at(-1)!.req;
    expect(greenDecision.options?.visibleCards).toEqual(visibleCards);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: greenDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("green").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("green").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("blue").instanceId, s.inst("green").instanceId]),
    );
  });

  it("lets the UI decline both colors and order every revealed card on the deck bottom", async () => {
    const s = setup(
      {
        0: {
          hand: [{ card: "BT3-093", as: "davis" }],
          deck: [
            { card: "AD1-010", as: "blue" },
            { card: "BT1-064", as: "green" },
            { card: "BT1-090", as: "option" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("davis").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const blueDecision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: blueDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest?.kind === "selectCards" &&
        latest.decisionId !== blueDecision.decisionId &&
        latest.decisionId === s.state.pendingDecision?.decisionId
      );
    });
    const greenDecision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: greenDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.decisions.at(-1)!.req;
    const bottomOrder = [s.inst("option").instanceId, s.inst("blue").instanceId, s.inst("green").instanceId];
    expect(ordering.sourceCardId).toBe("BT3-093");
    expect(ordering.options?.visibleCards).toEqual([
      { instanceId: s.inst("blue").instanceId, cardId: "AD1-010" },
      { instanceId: s.inst("green").instanceId, cardId: "BT1-064" },
      { instanceId: s.inst("option").instanceId, cardId: "BT1-090" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: bottomOrder },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map((card) => card.instanceId).join(",") === bottomOrder.join(","),
    );

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(bottomOrder);
  });

  it("plays itself from security", async () => {
    const s = setup({ 0: { security: [{ card: "BT3-093", as: "securityTamer", faceUp: true }] } });
    const id = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === id)).toBe(true);
  });
});
