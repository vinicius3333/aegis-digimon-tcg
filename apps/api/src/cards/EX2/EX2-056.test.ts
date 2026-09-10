import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-056.js";
import "./EX2-009.js";
import "../EX3/EX3-016.js";
import "../EX3/EX3-019.js";

const INERT_DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];
const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

describe("EX2-056 Takato Matsuki", () => {
  it("matches the catalog and compiles the deletion, Blitz, and Security clauses", () => {
    expect(getCardDefinition("EX2-056")).toMatchObject({
      cardId: "EX2-056",
      nameEn: "Takato Matsuki",
      colors: ["Red"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      effectText:
        '[Your Turn] When an opponent\'s Digimon is deleted, you may suspend this Tamer to gain 1 memory.[Your Turn] When one of your Digimon would digivolve into a Digimon with [Gallantmon] or [Growlmon] in its name, that Digimon gains "[When Digivolving] ＜Blitz＞ (This Digimon can attack when your opponent has 1 or more memory.)" for the turn.',
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    const card = runtimeCompiledCard("EX2-056");
    expect(card).toBeDefined();
    expect(card).toEqual(compiled);
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "onDeletionOf",
            sourceFilter: { controller: "opponent", kind: ["Digimon"] },
            actions: [{ kind: "GainMemory", amount: 1 }],
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldDigivolve",
            into: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Gallantmon", "Growlmon"], match: "name" }],
            },
            actions: [
              {
                kind: "GainKeyword",
                target: { filter: {}, sourceRef: "triggerSubject", count: 1 },
                keyword: { keyword: "Blitz", raw: "＜Blitz＞" },
                duration: "forTheTurn",
              },
            ],
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
    ]);
  });

  it("suspends itself to gain 1 memory after a public opponent deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-009", as: "attacker" },
            { card: "EX2-056", as: "takato" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { battleArea: [{ card: "EX2-019", dp: 1000, as: "target" }], deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && s.perm("takato").isSuspended);
    expect(s.state.memory).toBe(4);
    expect(s.perm("takato").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("leaves memory and the Tamer unchanged when the deletion payoff is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-009", as: "attacker" },
            { card: "EX2-056", as: "takato" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { battleArea: [{ card: "EX2-019", dp: 1000, as: "target" }], deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(3);
    expect(s.perm("takato").isSuspended).toBe(false);
  });

  it("grants Blitz to a Digimon publicly evolving into Growlmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-008", as: "guilmon" },
            { card: "EX2-056", as: "takato" },
          ],
          hand: [{ card: "EX2-009", as: "growlmon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("guilmon").topCard.instanceId === s.inst("growlmon").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("guilmon"), "Blitz")).toBe(true);
  });

  it("uses granted Blitz for a public attack after memory crosses the gauge and resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-008", as: "guilmon" },
            { card: "EX2-056", as: "takato" },
          ],
          hand: [{ card: "EX2-009", as: "growlmon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 1;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("guilmon").permanentId,
          instanceId: s.inst("growlmon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.engine.hasAcceptedBlitzAttack(s.perm("guilmon").permanentId));
      expect(s.state.memory).toBe(-1);
      expect(s.engine.hasAcceptedBlitzAttack(s.perm("guilmon").permanentId)).toBe(true);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("guilmon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      advance(s.engine).endMainPhaseIfOpen(1);
      await advance(s.engine).waitForMainPhase(0);
      expect(observe(s.engine).hasKeyword(s.perm("guilmon"), "Blitz")).toBe(false);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("answers Q3348: grants Blitz before an inherited cost increase makes the evolution fail", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-020", as: "host", under: ["EX3-016", "EX3-019"] }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [
            { card: "EX2-008", as: "guilmon" },
            { card: "EX2-056", as: "takato" },
          ],
          hand: [{ card: "EX2-009", as: "growlmon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    // Seat 1 pays downward from -8: printed cost 2 reaches -10, while inherited cost 4 cannot.
    // Seed +8 so the real loop can complete seat 0's Main phase and passTurn reframes to -8.
    s.state.memory = 8;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      // The real pass-turn bonus normalizes the gauge to +3 for seat 1. Bound the public
      // action at -8 so printed cost 2 is payable while inherited cost 4 is not.
      s.state.memory = -8;
      expect(s.state.memory).toBe(-8);
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("guilmon").permanentId,
          instanceId: s.inst("growlmon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.perm("guilmon").topCard.cardId === "EX2-008" && observe(s.engine).hasKeyword(s.perm("guilmon"), "Blitz"),
      );
      expect(s.state.memory).toBe(-8);
      expect(s.perm("guilmon").topCard.cardId).toBe("EX2-008");
      expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("growlmon").instanceId);
      expect(observe(s.engine).hasKeyword(s.perm("guilmon"), "Blitz")).toBe(true);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(1, { type: "surrender" });
      await loop;
    }
  });

  it("does not grant Blitz to an unrelated red evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST1-03", as: "agumon" },
            { card: "EX2-056", as: "takato" },
          ],
          hand: [{ card: "ST1-07", as: "greymon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.instanceId === s.inst("greymon").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("agumon"), "Blitz")).toBe(false);
  });

  it("plays from Security without paying its cost through the public attack path", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-009", as: "attacker" }], deck: INERT_DECK, security: INERT_SECURITY },
        1: {
          deck: INERT_DECK,
          security: [{ card: "EX2-056", as: "securityTakato" }, ...INERT_SECURITY],
        },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("securityTakato").instanceId),
    );
    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("securityTakato").instanceId),
    ).toBe(true);
  });
});
