import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-015.js";

describe("BT23-015 Phoenixmon", () => {
  it("matches every catalog clause and shares one use across all three timings", () => {
    expect(getCardDefinition("BT23-015")).toMatchObject({
      cardId: "BT23-015",
      nameEn: "Phoenixmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Holy Beast", "Zaxon", "CS"],
      effectText:
        "[Digivolve] Lv.5 w/[CS]\u00a0trait: Cost 3 \n\nWhen this card would be played, if you have a Tamer with the [Zaxon]\u00a0trait, reduce the play cost by 5.\n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] Delete 1 of your opponent's Digimon with 9000 DP or less. Then, you may return up to 3 non-Digi-Egg cards from their trash to the bottom of the deck.\n[On Deletion] Place this card face up as the bottom security card.",
    });

    const replacement = compiled.effects.find((entry) => entry.trigger === "Static")!.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 5,
          condition: {
            kind: "youHave",
            filter: {
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Zaxon"], match: "trait" }],
            },
          },
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
      expect(effect.actions).toMatchObject([
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 9000 } },
            count: 1,
          },
        },
        {
          kind: "Return",
          target: {
            filter: { zone: "trash", controller: "opponent", kind: ["Digimon", "Tamer", "Option"] },
            count: 3,
            upTo: true,
          },
          to: "deckBottom",
          optional: true,
        },
      ]);
    }
    expect(compiled.effects.find((entry) => entry.trigger === "OnDeletion")!.actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      controller: "mine",
      toTop: false,
      faceUp: true,
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("pays exactly 6 with a Zaxon Tamer and cannot complete the unreduced play at 0 memory", async () => {
    const reduced = setupEngine({
      0: { battleArea: [{ card: "BT23-086", as: "zaxon" }], hand: [{ card: "BT23-015", as: "phoenix" }] },
    });
    reduced.state.memory = 10;
    expect(reduced.engine.applyIntent(0, { type: "playCard", instanceId: reduced.inst("phoenix").instanceId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() =>
      reduced.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-015"),
    );
    expect(reduced.state.memory).toBe(4);

    const full = setupEngine({ 0: { hand: [{ card: "BT23-015", as: "phoenix" }] } });
    full.state.memory = 0;
    expect(full.engine.applyIntent(0, { type: "playCard", instanceId: full.inst("phoenix").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(full.state.players[0]!.hand).toHaveLength(1);
    expect(full.state.players[0]!.battleArea).toHaveLength(0);
    expect(full.state.memory).toBe(0);
  });

  it("deletes at exactly 9000 DP, then returns that card before its pending On Deletion can activate, per Q5230", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-015", as: "phoenix" }] },
        1: {
          battleArea: [{ card: "BT23-012", as: "garudamon", dp: 9000 }],
          hand: [{ card: "BT23-011", as: "birdramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const deletedInstanceId = s.inst("garudamon").instanceId;
    preferred.push(deletedInstanceId);
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("phoenix").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === deletedInstanceId));

    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(deletedInstanceId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === deletedInstanceId)).toBe(false);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("birdramon").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("resolves the shared deletion effect from a public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-015", as: "phoenix" }] },
        1: { battleArea: [{ card: "BT23-012", as: "target", dp: 9000 }], security: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("phoenix").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("target").instanceId),
    );
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("target").instanceId)).toBe(true);
  });

  it("publicly places itself face up at security bottom when deleted in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-015", as: "phoenix" }],
          security: [{ card: "BT1-009", as: "existing" }],
          deck: ["BT1-009", "BT1-013", "BT1-027"],
        },
        1: {
          battleArea: [{ card: "BT1-080", dp: 15000, as: "attacker" }],
          security: ["BT1-010"],
          deck: ["BT1-013", "BT1-028", "BT1-045"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const phoenixId = s.inst("phoenix").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Suspend Phoenixmon the public way so seat 1 has a legal battle target next turn.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("phoenix").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("phoenix").isSuspended && !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("phoenix").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === phoenixId));
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: phoenixId, faceUp: true });
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("returns at most 3 non-Digi-Egg cards to deck bottom even when no deletion occurs", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-015", as: "phoenix" }] },
        1: {
          deck: [{ card: "BT1-009", as: "deckTop" }],
          trash: [
            { card: "BT1-009", as: "digimon" },
            { card: "BT1-085", as: "tamer" },
            { card: "BT1-109", as: "option" },
            { card: "BT1-009", as: "fourth" },
            { card: "BT23-001", as: "egg" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const returned = [s.inst("digimon").instanceId, s.inst("tamer").instanceId, s.inst("option").instanceId];
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("phoenix").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck.length === 4);

    expect(s.state.players[1]!.deck[0]!.instanceId).toBe(s.inst("deckTop").instanceId);
    expect(s.state.players[1]!.deck.slice(-3).map((card) => card.instanceId)).toEqual(returned);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("fourth").instanceId, s.inst("egg").instanceId]),
    );
  });

  it("allows the optional trash return to be refused without moving cards", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-015", as: "phoenix" }] },
        1: { trash: [{ card: "BT1-009", as: "card" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("phoenix").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("card").instanceId);
    expect(s.state.players[1]!.deck).toHaveLength(0);
  });

  it("tracks the shared Once Per Turn per source: a second Phoenixmon still deletes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-015", as: "first" },
            { card: "BT23-015", as: "second" },
          ],
          deck: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-059", as: "one" },
            { card: "BT1-059", as: "two" },
            { card: "BT1-059", as: "three" },
          ],
          security: ["BT1-009", "BT1-013", "BT1-027"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("resets the shared public attack effect on the next own turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-015", as: "phoenix" }], deck: ["BT1-009", "BT1-013"] },
        1: {
          battleArea: [
            { card: "BT1-080", as: "firstTarget", dp: 9000 },
            { card: "BT1-080", as: "secondTarget", dp: 9000 },
          ],
          security: ["BT1-009", "BT1-013", "BT1-027"],
          deck: ["BT1-028", "BT1-045"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("phoenix").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("phoenix").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("shares the public deletion use across evolution and attack, then resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-023", as: "base" }],
          hand: [{ card: "BT23-015", as: "phoenix" }],
          deck: ["BT1-009", "BT1-013", "BT1-027", "BT1-028"],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "firstTarget", dp: 9000 },
            { card: "BT1-080", as: "secondTarget", dp: 9000 },
          ],
          security: ["BT1-009", "BT1-013", "BT1-027"],
          deck: ["BT1-028", "BT1-045"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const baseId = s.inst("base").instanceId;
    const phoenixId = s.inst("phoenix").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: phoenixId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === phoenixId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(baseId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  /** Drive the loop to seat 1's Main so the opponent can attack into seat 0's security. */
  async function openOpponentMain(s: ReturnType<typeof setupEngine>) {
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    // Wrapped: returning the promise bare would make `await openOpponentMain(...)` wait on
    // the whole turn loop.
    return { loop };
  }

  it("checks a face-up security card with the card left revealed, per Q5231-Q5232", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "bystander" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          security: [{ card: "BT23-015", as: "phoenix", faceUp: true }],
          deck: ["BT1-009", "BT1-013", "BT1-027"],
        },
        1: {
          battleArea: [{ card: "BT1-080", dp: 15000, as: "attacker" }],
          deck: ["BT1-013", "BT1-028", "BT1-045"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const phoenixId = s.inst("phoenix").instanceId;
    const { loop } = await openOpponentMain(s);
    // Q5231: a card placed face up stays revealed in the stack until it is checked.
    expect(s.state.players[0]!.security.map((card) => card.faceUp)).toEqual([true]);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === phoenixId));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === phoenixId)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("fires a [Security] effect from a face-up security card on its check, per Q5233", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "bystander" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          security: [{ card: "P-066", as: "securityEffect", faceUp: true }],
          deck: ["BT1-009", "BT1-013", "BT1-027"],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 3000, as: "attacker" }],
          deck: ["BT1-013", "BT1-028", "BT1-045"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attackerId = s.perm("attacker").permanentId;
    const { loop } = await openOpponentMain(s);
    expect(s.state.players[0]!.security.map((card) => card.faceUp)).toEqual([true]);

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("puts a face-up security card back face down when the stack is shuffled, per Q5234", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-087", as: "tk" }],
          security: [
            { card: "BT1-009", as: "selected" },
            { card: "BT23-015", as: "phoenix", faceUp: true },
          ],
          deck: ["BT1-009", "BT1-013", "BT1-027"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("selected").instanceId);
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tk").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "BT23-015", faceUp: false });
  });

  it("digivolves for 3 from an off-color level-5 CS Digimon and rejects an off-color non-CS base", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT22-023", as: "base" }],
        hand: [{ card: "BT23-015", as: "phoenix" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 3;
    await legal.ready();
    const baseId = legal.inst("base").instanceId;
    const phoenixId = legal.inst("phoenix").instanceId;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: phoenixId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.instanceId === phoenixId);
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("base").stack.map((card) => card.instanceId)).toContain(baseId);
    expect(legal.perm("base").topCard?.instanceId).toBe(phoenixId);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-041", as: "base" }], hand: [{ card: "BT23-015", as: "phoenix" }] },
    });
    illegal.state.memory = 3;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("phoenix").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
