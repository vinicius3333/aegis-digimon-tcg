import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX3-003.js";

describe("EX3-003 Sunarizamon", () => {
  it("matches the official errata identity and text", () => {
    expect(getCardDefinition("EX3-003")).toMatchObject({
      cardId: "EX3-003",
      nameEn: "Sunarizamon",
      colors: ["Red"],
      level: 3,
      playCost: 3,
      dp: 2000,
      types: ["Reptile"],
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      imageId: "EX3-003-Errata",
    });
    expect(getCardDefinition("EX3-003")!.effectText).toContain("[Dragon], [saur] or [Ceratopsian]");
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "WhenAttacking",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [
                {
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    traitContains: ["Dragon", "saur", "Ceratopsian"],
                  },
                  count: 1,
                  to: "hand",
                },
              ],
              rest: "deckBottom",
            },
          ],
        },
      ],
    });
  });
  it("reveals 3 on attack, adds a Dragon-trait Digimon and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-003", as: "attacker" }],
          deck: [{ card: "EX3-005", as: "dragon" }, { card: "EX3-006", as: "otherEligible" }, "BT1-085"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("dragon").instanceId) &&
        s.state.players[0]!.deck.every(({ faceUp }) => !faceUp),
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("dragon").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.deck.every(({ faceUp }) => !faceUp)).toBe(true);
    const selection = s.decisions.find(({ req }) => req.kind === "selectCards")?.req;
    expect(selection).toMatchObject({ sourceCardId: "EX3-003", options: { timing: "WhenAttacking", min: 1, max: 1 } });
    expect(selection?.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("dragon").instanceId, s.inst("otherEligible").instanceId]),
    );
  });

  it.each([
    ["Dragon", "EX3-005"],
    ["saur", "AD1-001"],
    ["Ceratopsian", "BT10-050"],
    ["Dragonkin (Q3370)", "EX3-008"],
  ])("matches %s through a Digimon trait and excludes a name-only Option", async (_family, eligible) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-003", as: "attacker" }],
          deck: [
            { card: eligible, as: "eligible" },
            { card: "BT12-099", as: "nameOnly" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("eligible").instanceId));
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("nameOnly").instanceId)).toBe(false);
  });

  it("handles a short no-match deck and honors explicit bottom order", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-003", as: "attacker" }],
          deck: [
            { card: "BT1-085", as: "first" },
            { card: "BT1-086", as: "second" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoOrderCards: false },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const order = [s.inst("second").instanceId, s.inst("first").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "orderCards", order },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-003"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(order);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
  });

  it("reveals exactly the top 3 and leaves a fourth card unrevealed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-003", as: "attacker" }],
          deck: [
            { card: "EX3-005", as: "eligible" },
            { card: "BT1-085", as: "firstRest" },
            { card: "BT1-086", as: "secondRest" },
            { card: "BT1-009", as: "outsideReveal" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("eligible").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("eligible").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("outsideReveal").instanceId,
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("outsideReveal").instanceId);
    expect(s.state.players[0]!.deck.every(({ faceUp }) => !faceUp)).toBe(true);
  });

  it("allows the printed red level-2 evolution and rejects an incompatible purple egg", async () => {
    const legal = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "redEgg" },
        hand: [{ card: "EX3-003", as: "sunarizamon" }],
      },
    });
    legal.state.memory = 0;
    await legal.ready();

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("redEgg").permanentId,
        instanceId: legal.inst("sunarizamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.state.players[0]!.breeding?.topCard.cardId === "EX3-003");
    // Permanent.stack contains only cards below the top card; the evolved card is topCard.
    expect(legal.state.players[0]!.breeding?.stack.map(({ cardId }) => cardId)).toEqual(["BT1-001"]);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: {
        breeding: { card: "BT10-006", as: "purpleEgg" },
        hand: [{ card: "EX3-003", as: "sunarizamon" }],
      },
    });
    illegal.state.memory = 0;
    await illegal.ready();

    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("purpleEgg").permanentId,
        instanceId: illegal.inst("sunarizamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(illegal.state.players[0]!.breeding?.topCard.cardId).toBe("BT10-006");
    expect(illegal.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX3-003");
  });
});
