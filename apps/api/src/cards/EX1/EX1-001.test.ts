import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./EX1-001.js";

describe("EX1-001 Agumon", () => {
  it("reveals 3 on attack and adds exactly 1 Tamer or Agumon to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-003", as: "attacker", under: ["EX1-001"] }],
          deck: [
            { card: "ST1-12", as: "validTamer" },
            { card: "BT1-010", as: "validAgumon" },
            { card: "BT1-009", as: "invalid" },
            { card: "BT1-012", as: "untouched" },
          ],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.hand.length === 1);

    expect(p0.hand[0]!.cardId).toBe("ST1-12");
    expect(p0.deck).toHaveLength(3);
    expect(p0.deck.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-010", "BT1-009", "BT1-012"]));
  });

  it("lets the player choose the order of the remaining revealed cards at the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-003", as: "attacker", under: ["EX1-001"] }],
          deck: [
            { card: "ST1-12", as: "validTamer" },
            { card: "BT1-010", as: "validAgumon" },
            { card: "BT1-009", as: "invalid" },
            { card: "BT1-012", as: "untouched" },
          ],
        },
        1: {},
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.options?.candidateInstanceIds).toEqual([
      s.inst("validAgumon").instanceId,
      s.inst("invalid").instanceId,
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "orderCards",
          order: [s.inst("invalid").instanceId, s.inst("validAgumon").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 3);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["ST1-12"]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("untouched").instanceId,
      s.inst("invalid").instanceId,
      s.inst("validAgumon").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("accepts a non-red Agumon-name card, rejects a near-match, and fires only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-003", as: "attacker", under: ["EX1-001"] }],
          hand: [{ card: "BT1-036", as: "unsuspender" }],
          deck: ["BT11-046", "BT1-009", "BT1-012", "BT1-013", "BT1-014", "BT1-010"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT11-046")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(false);

    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("unsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("attacker").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("rearms on the next own turn after a complete public turn loop", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-003", as: "attacker", under: ["EX1-001"] }],
          deck: ["ST1-12", "BT1-010", "ST1-12", "BT1-010", "ST1-12", "BT1-010", "ST1-12"],
        },
        1: {
          deck: ["BT1-009", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    expect(p0.hand.map((card) => card.cardId)).toEqual(["ST1-12"]);
    expect(p0.deck).toHaveLength(6);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(p0.hand).toHaveLength(2);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 2);
    expect(p0.hand).toHaveLength(3);
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-001"),
    ).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not add a card when none of the revealed cards match", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-003", as: "attacker", under: ["EX1-001"] }],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));

    expect(p0.hand).toHaveLength(0);
    expect(p0.deck).toHaveLength(4);
    expect(p0.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-012", "BT1-013", "BT1-014"]),
    );
  });

  it("works with a legal Agumon stack source and higher-level host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-001", as: "base", under: ["BT1-001"] }],
          hand: [{ card: "EX1-003", as: "host" }],
          deck: ["BT1-013", "BT1-014", "ST1-12", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-003");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013", "ST1-12"]);
  });

  it("publicly digivolves from a red Digi-Egg in breeding for the printed cost", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "egg" },
        hand: [{ card: "EX1-001", as: "rookie" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const eggInstanceId = s.perm("egg").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("rookie").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "EX1-001");

    expect(s.perm("egg").topCard.instanceId).toBe(s.inst("rookie").instanceId);
    expect(s.perm("egg").stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(3);
  });
});
