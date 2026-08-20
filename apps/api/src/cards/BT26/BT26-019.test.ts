import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { definitionOf } from "../../engine/cards/cardData.js";
import { detachableLinkedCards } from "../../engine/effects/detach.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const CARD_ID = "BT26-019";

describe("BT26-019 Mailmon", () => {
  it("uses the exact Lv.2 [Appmon] cost-0 evolution path and rejects a same-level near-match", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 2,
      traits: ["Appmon"],
      cost: 0,
      isAlternate: true,
    });

    const legal = setupEngine({
      0: {
        breeding: { card: "BT21-005", as: "appmonEgg" },
        hand: [{ card: CARD_ID, as: "mailmon" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("appmonEgg").permanentId,
        instanceId: legal.inst("mailmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("appmonEgg").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("appmonEgg").stack.map(({ cardId }) => cardId)).toEqual(["BT21-005"]);

    const illegal = setupEngine({
      0: {
        breeding: { card: "BT1-007", as: "plainEgg" },
        hand: [{ card: CARD_ID, as: "mailmon" }],
      },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plainEgg").permanentId,
        instanceId: illegal.inst("mailmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("draws exactly 1 at the inclusive 7-card boundary when Mailmon attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "mailmon" }],
        hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007"],
        deck: [{ card: "BT1-008", as: "drawn" }],
      },
      1: { security: ["BT1-009"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mailmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not draw above 7 cards, and an empty deck is a safe no-op at the eligible boundary", async () => {
    const over = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "mailmon" }],
        hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007", "BT1-008"],
        deck: [{ card: "BT1-009", as: "notDrawn" }],
      },
    });
    await advance(over.engine).fire(EffectTiming.OnUseAttack, over.perm("mailmon"));
    expect(over.state.players[0]!.hand).toHaveLength(8);
    expect(over.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(over.inst("notDrawn").instanceId);

    const empty = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "mailmon" }],
        hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007"],
      },
    });
    await advance(empty.engine).fire(EffectTiming.OnUseAttack, empty.perm("mailmon"));
    expect(empty.state.players[0]!.hand).toHaveLength(7);
    expect(empty.state.players[0]!.deck).toHaveLength(0);
  });

  it("links only to an [Appmon] host through the public action and pays the exact cost 3", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "appmonHost" }],
        hand: [{ card: CARD_ID, as: "mailmonLink" }],
      },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: legal.inst("mailmonLink").instanceId,
        targetPermanentId: legal.perm("appmonHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("appmonHost").linked.length === 1);
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("appmonHost").linked[0]?.instanceId).toBe(legal.inst("mailmonLink").instanceId);
    expect(legal.perm("appmonHost").linked[0]?.faceUp).toBe(true);

    const wrongTrait = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "ordinaryDigimon" }],
        hand: [{ card: CARD_ID, as: "mailmonLink" }],
      },
    });
    wrongTrait.state.memory = 3;
    expect(
      wrongTrait.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: wrongTrait.inst("mailmonLink").instanceId,
        targetPermanentId: wrongTrait.perm("ordinaryDigimon").permanentId,
      }),
    ).toEqual(expect.objectContaining({ ok: false, reason: "link-requirement-unmet" }));
    expect(wrongTrait.state.memory).toBe(3);
    expect(wrongTrait.state.players[0]!.hand).toHaveLength(1);

    const underfunded = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "appmonHost" }],
        hand: [{ card: CARD_ID, as: "mailmonLink" }],
      },
    });
    underfunded.state.memory = -8;
    expect(
      underfunded.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: underfunded.inst("mailmonLink").instanceId,
        targetPermanentId: underfunded.perm("appmonHost").permanentId,
      }),
    ).toEqual(expect.objectContaining({ ok: false, reason: "insufficient-memory" }));
    expect(underfunded.state.memory).toBe(-8);
    expect(underfunded.state.players[0]!.hand).toHaveLength(1);
  });

  it("public When Linking selects only an opposing Digimon/Tamer and locks suspension through that turn end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", as: "appmonHost" },
            { card: "BT1-089", as: "ownTamer" },
          ],
          hand: [{ card: CARD_ID, as: "mailmonLink" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "opponentDigimon" },
            { card: "BT1-089", as: "opponentTamer" },
            { card: "P-236", as: "opponentOption" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 3;
    preferred.push(s.perm("opponentTamer").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("mailmonLink").instanceId,
        targetPermanentId: s.perm("appmonHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponentTamer"), "suspend"));

    const targetRequest = s.decisions.find(({ req }) => req.kind === "chooseTargets")?.req;
    expect(new Set(targetRequest?.options?.candidateInstanceIds)).toEqual(
      new Set([s.perm("opponentDigimon").permanentId, s.perm("opponentTamer").permanentId]),
    );
    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "suspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("ownTamer"), "suspend")).toBe(false);

    advance(s.engine).ledgers.continuous.sweep(s.state, "eachTurnEnd", 0);
    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "suspend")).toBe(true);
    advance(s.engine).ledgers.continuous.sweep(s.state, "eachTurnEnd", 1);
    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "suspend")).toBe(false);
  });

  it("joins the host's simultaneous whenLinked window when Mailmon is newly linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-051", as: "gomimonHost" }],
          hand: [{ card: CARD_ID, as: "mailmonLink" }],
        },
        1: { battleArea: [{ card: "BT1-089", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true, autoChooseOption: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("mailmonLink").instanceId,
        targetPermanentId: s.perm("gomimonHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "suspend"));

    expect(observe(s.engine).hasKeyword(s.perm("gomimonHost"), "Collision")).toBe(true);
    expect(s.perm("gomimonHost").currentDP).toBe(7000);
    expect(s.perm("gomimonHost").linked.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });

  it("does not retrigger an already-linked Mailmon when a different card is linked later", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", linked: [CARD_ID] }],
          hand: [{ card: "BT26-010", as: "otherLink" }],
        },
        1: { battleArea: [{ card: "BT1-089", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("otherLink").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some(({ cardId }) => cardId === "BT26-010"));

    expect(observe(s.engine).isRestricted(s.perm("target"), "suspend")).toBe(false);
    expect(s.decisions.some(({ req }) => req.sourceCardId === CARD_ID)).toBe(false);
  });

  it("exposes only linked [Seven Code] cards to the provisional Detach eligibility seam", () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT21-009",
            as: "host",
            linked: [
              { card: CARD_ID, as: "sevenCode" },
              { card: "P-190", as: "nearMatch" },
            ],
          },
        ],
      },
    });

    expect(
      detachableLinkedCards(s.perm("host"), ["Seven Code"], definitionOf).map(({ instanceId }) => instanceId),
    ).toEqual([s.inst("sevenCode").instanceId]);
  });
});
