import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-022.js";
import "./EX2-022.js";
import "../index.js";

const inertSecurity = ["BT1-009", "BT1-010"];

describe("EX2-022 Antylamon", () => {
  it("matches the catalog and compiled alternate evolution and attack effect", () => {
    expect(getCardDefinition("EX2-022")).toMatchObject({
      cardId: "EX2-022",
      nameEn: "Antylamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Holy Beast", "Deva"],
      effectText:
        "If you have [Shu-Chong Wong] in play, your [Lopmon] can digivolve into this card in your hand for a digivolution cost of 3, ignoring its digivolution requirements.[When Attacking][Once Per Turn] You may trash the top card of your security stack to unsuspend this Digimon.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenAttacking",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "Unsuspend",
              optional: true,
              cost: {
                kind: "trash",
                target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [
        {
          namesExact: ["Lopmon"],
          cost: 3,
          controllerControls: { kind: ["Tamer"], namesExact: ["Shu-Chong Wong"], min: 1 },
          isAlternate: true,
        },
      ],
    });
  });

  it("digivolves from exact Lopmon for 3 only while Shu-Chong Wong is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-020", as: "lopmon" },
          { card: "EX2-059", as: "shu" },
        ],
        hand: [{ card: "EX2-022", as: "antylamon" }],
        deck: ["BT1-011"],
        security: inertSecurity,
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lopmon").permanentId,
        instanceId: s.inst("antylamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lopmon").topCard.cardId === "EX2-022");
    expect(s.state.memory).toBe(0);
    expect(s.perm("lopmon").stack.map((card) => card.cardId)).toEqual(["EX2-020"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-011");
  });

  it("rejects the Lopmon shortcut without Shu-Chong Wong", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-020", as: "lopmon" }], hand: [{ card: "EX2-022", as: "antylamon" }] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lopmon").permanentId,
        instanceId: s.inst("antylamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("supports the printed yellow level-4 evolution with paid cost, stack, and draw", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-051", as: "source" }],
        hand: [{ card: "EX2-022", as: "antylamon" }],
        deck: [{ card: "BT1-011", as: "draw" }],
        security: inertSecurity,
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("antylamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX2-022");
    expect(s.state.memory).toBe(2);
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT1-051"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("draw").instanceId);
  });

  it("rejects Lopmon (X Antibody) even with Shu-Chong Wong", () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-067", as: "lopmonX" },
          { card: "EX2-059", as: "shu" },
        ],
        hand: [{ card: "EX2-022", as: "antylamon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lopmonX").permanentId,
        instanceId: s.inst("antylamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("may trash its top security to unsuspend once when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-022", as: "antylamon" }], security: inertSecurity },
        1: { security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("antylamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("antylamon").isSuspended);
    expect(s.perm("antylamon").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("antylamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("antylamon").isSuspended);
    expect(s.perm("antylamon").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("may decline trashing security and remains suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-022", as: "antylamon" }], security: inertSecurity },
        1: { security: ["BT1-011"] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("antylamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("antylamon").isSuspended);
    expect(s.perm("antylamon").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("resets the attack unsuspend cost on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-022", as: "antylamon" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-011", "BT1-012"], security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("antylamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3 && !s.perm("antylamon").isSuspended);
    expect(s.state.players[0]!.security).toHaveLength(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("antylamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("antylamon").isSuspended);
    expect(s.state.players[0]!.security).toHaveLength(3);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("antylamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2 && !s.perm("antylamon").isSuspended);
    expect(s.state.players[0]!.security).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
