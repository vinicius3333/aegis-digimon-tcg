import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX13-003.js";
import "../index.js";
import "../AD1/AD1-017.js";

// AD1-017 Dynasmon pays "[On Play] By trashing your top or bottom security card" — the public
// route that removes your OWN security stack during your OWN turn. Its play cost drops from 11
// to 6 with four [Lucemon]/[Witchelny] text cards in the trash.
const dynasmonTrash = ["AD1-018", "BT13-087", "BT13-090", "BT18-034"];
const automation = { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true };

describe("EX13-003 Kyaromon", () => {
  it("encodes the inherited once-per-turn own-security digivolution", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenSecurityRemoved",
            fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
            actions: [
              expect.objectContaining({
                kind: "Digivolve",
                target: expect.objectContaining({ isSelf: true, filter: { isSelfRef: true } }),
                into: expect.objectContaining({
                  kind: ["Digimon"],
                  nameOrTrait: [
                    { tokens: ["Kentaurosmon"], match: "name" },
                    { tokens: ["Holy Beast"], match: "trait" },
                  ],
                }),
                from: ["hand"],
                reduceCost: 1,
                payCost: true,
                optional: true,
              }),
            ],
          }),
        ],
      }),
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("digivolves the carrier into a [Holy Beast] hand card for the cost reduced by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-046", as: "host", under: ["EX13-003"] }],
          hand: [
            { card: "BT1-051", as: "holyBeast" },
            { card: "BT12-036", as: "beastOnly" },
            { card: "BT9-035", as: "nonMatch" },
            { card: "AD1-017", as: "remover" },
          ],
          trash: dynasmonTrash,
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      automation,
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("remover").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "BT1-051");

    // Reppamon (Holy Beast) was taken; the near-matching [Beast] card and the [Mutant] card stay.
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("holyBeast").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX13-003", "BT1-046"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("beastOnly").instanceId,
      s.inst("nonMatch").instanceId,
      s.state.players[0]!.hand[2]!.instanceId,
    ]);
    // Digivolution bonus draw from the deck.
    expect(s.state.players[0]!.hand[2]!.cardId).toBe("BT1-011");
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-010"]);
    // 10 - 6 (Dynasmon, reduced) - 1 (Reppamon cost 2 reduced by 1).
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves into a card with [Kentaurosmon] in its name for the cost reduced by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-041", as: "host", under: ["EX13-003", "BT1-046"] }],
          hand: [
            { card: "BT3-043", as: "kentaurosmon" },
            { card: "AD1-017", as: "remover" },
          ],
          trash: dynasmonTrash,
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      automation,
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("remover").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "BT3-043");

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("kentaurosmon").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX13-003", "BT1-046", "BT13-041"]);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-010"]);
    // 10 - 6 (Dynasmon, reduced) - 2 (Kentaurosmon cost 3 reduced by 1).
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire when the opponent's security stack is the one removed from", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-046", as: "host", under: ["EX13-003"], dp: 20_000 }],
          hand: [{ card: "BT1-051", as: "holyBeast" }],
          security: ["BT1-009"],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-009"], deck: ["BT1-011", "BT1-012"] },
      },
      automation,
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("host").topCard.cardId).toBe("BT1-046");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("holyBeast").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire on the opponent's turn when their attack removes your security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-046", as: "host", under: ["EX13-003"] }],
          hand: [{ card: "BT1-051", as: "holyBeast" }],
          security: ["BT1-009"],
          deck: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "attacker", dp: 20_000 }],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      automation,
    );
    await s.ready();
    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.perm("host").topCard.cardId).toBe("BT1-046");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("holyBeast").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("may be declined, leaving the carrier and the hand untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-046", as: "host", under: ["EX13-003"] }],
          hand: [
            { card: "BT1-051", as: "holyBeast" },
            { card: "AD1-017", as: "remover" },
          ],
          trash: dynasmonTrash,
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("remover").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks();

    expect(s.perm("host").topCard.cardId).toBe("BT1-046");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("holyBeast").instanceId]);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resolves once per turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-046", as: "host", under: ["EX13-003"] }],
          hand: [
            { card: "BT1-051", as: "firstEvolution" },
            { card: "BT1-058", as: "secondEvolution" },
            { card: "AD1-017", as: "firstRemover" },
            { card: "AD1-017", as: "secondRemover" },
          ],
          trash: dynasmonTrash,
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"], security: ["BT1-009"] },
      },
      automation,
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstRemover").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "BT1-051");
    const memoryAfterFirst = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondRemover").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks();

    // Second own-security removal in the same turn: the Once Per Turn watcher refuses.
    expect(s.perm("host").topCard.cardId).toBe("BT1-051");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondEvolution").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.memory).toBe(memoryAfterFirst - 6);

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const securityBeforeReset = s.state.players[0]!.security.length;
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("secondEvolution").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX13-003", "BT1-046", "BT1-051"]);
    expect(s.state.players[0]!.security).toHaveLength(securityBeforeReset);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("carries the inherited clause through a public hatch, breeding digivolution, and promotion", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "EX13-003", as: "egg" }],
          hand: [
            { card: "BT1-046", as: "kudamon" },
            { card: "BT1-051", as: "holyBeast" },
            { card: "AD1-017", as: "remover" },
          ],
          trash: dynasmonTrash,
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"], security: ["BT1-009"] },
      },
      automation,
    );
    s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX13-003");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("kudamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-046");

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const carrier = s.state.players[0]!.battleArea[0]!;
    expect(carrier.topCard!.cardId).toBe("BT1-046");
    expect(carrier.stack.map((card) => card.instanceId)).toEqual([eggInstanceId]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("remover").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea[0]!.topCard!.cardId === "BT1-051");

    const evolved = s.state.players[0]!.battleArea[0]!;
    expect(evolved.topCard!.instanceId).toBe(s.inst("holyBeast").instanceId);
    expect(evolved.stack.map((card) => card.cardId)).toEqual(["EX13-003", "BT1-046"]);
    expect(evolved.stack[0]!.instanceId).toBe(eggInstanceId);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
