import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../AD1/AD1-018.js";
import "./BT12-071.js";

describe("BT12-071 AncientWisemon", () => {
  it("reveals 3 on an opponent attack, plays a black cost-6 card, and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-071", as: "ancient" }], deck: ["BT12-066", "BT1-009", "BT1-010"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-066"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-066")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010"]),
    );
  });

  it("resolves the reveal from a public opponent attack intent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-071", as: "ancient" }], deck: ["BT12-066", "BT1-009", "BT1-010"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-066"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-066")).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010"]),
    );
  });

  it("plays a black level-4 Hybrid from hand on deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-071", as: "ancient" }], hand: [{ card: "BT12-066", as: "hybrid" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-066"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-066")).toBe(true);
  });

  it("may decline its deletion play and does not play a non-Hybrid near-match", async () => {
    const declined = setupEngine(
      { 0: { battleArea: [{ card: "BT12-071", as: "ancient" }], hand: [{ card: "BT12-066", as: "hybrid" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).verb.deletePermanent([declined.perm("ancient").permanentId]);
    expect(declined.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      declined.inst("hybrid").instanceId,
    ]);

    const nearMatch = setupEngine(
      { 0: { battleArea: [{ card: "BT12-071", as: "ancient" }], hand: [{ card: "BT1-015", as: "greymon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(nearMatch.engine).verb.deletePermanent([nearMatch.perm("ancient").permanentId]);
    expect(nearMatch.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      nearMatch.inst("greymon").instanceId,
    ]);
  });

  it("can play a qualifying black Tamer from the reveal", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-071", as: "ancient" }], deck: ["BT12-094", "BT1-009", "BT1-010"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-094"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-094")).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010"]),
    );
  });

  it("uses printed play cost and trashes a black cost-7 near-match", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-071", as: "ancient" }], deck: ["BT10-065", "BT1-009", "BT1-010"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.players[0]!.trash.length === 3);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT12-071"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT10-065");
  });

  it("may decline revealing and leaves the deck untouched", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-071", as: "ancient" }], deck: ["BT12-066", "BT1-009", "BT1-010"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const deckBefore = s.state.players[0]!.deck.map(({ instanceId }) => instanceId);
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(deckBefore);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("resolves the opponent-attack reveal at most once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-071", as: "ancient" }],
          deck: ["BT12-066", "BT1-009", "BT1-010", "BT12-066", "BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT12-066").length === 1,
    );
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT12-066")).toHaveLength(1);
  });
});

describe("BT12-071 AncientWisemon — KB Q&A rulings", () => {
  it("cannot play a revealed cost-7+ card even when another effect would reduce its cost to 6 (Q2211)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-071", as: "ancient" }],
          deck: [{ card: "AD1-018", as: "lordKnightmon" }, "BT1-009", "BT1-010"],
          trash: ["AD1-018", "AD1-018", "AD1-018", "AD1-018"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const lordKnightmonId = s.inst("lordKnightmon").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT12-071"]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(lordKnightmonId);
    const offeredLordKnightmon = s.decisions.some(
      ({ req }) => req.kind === "selectCards" && JSON.stringify(req.options).includes(lordKnightmonId),
    );
    expect(offeredLordKnightmon).toBe(false);

    const reducedFromHand = setupEngine(
      {
        0: {
          hand: [{ card: "AD1-018", as: "lordKnightmon" }],
          trash: ["AD1-018", "AD1-018", "AD1-018", "AD1-018"],
        },
      },
      { autoDeclineOptional: true, declineDigiXros: true },
    );
    reducedFromHand.state.memory = 6;
    await reducedFromHand.ready();
    expect(
      reducedFromHand.engine.applyIntent(0, {
        type: "playCard",
        instanceId: reducedFromHand.inst("lordKnightmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => reducedFromHand.state.players[0]!.battleArea.length === 1);
    expect(reducedFromHand.state.memory).toBe(0);
  });
});
