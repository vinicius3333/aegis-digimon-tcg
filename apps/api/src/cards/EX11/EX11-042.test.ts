import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const cardId = "EX11-042";

describe("EX11-042 MockingBirdmon", () => {
  it("preserves printed stats, text evolution, linking deletion, and inherited redirect", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "MockingBirdmon",
      colors: ["Black"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      types: ["Machine", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, texts: ["Maquinamon"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand", "linked"],
        payCost: false,
        optional: true,
        // FAILS-WHEN-REVERTED: "THIS Digimon's digivolution cards" — without hostFilter the
        // pool spans every friendly Digimon's stack.
        target: { filter: { hostFilter: { isSelfRef: true } } },
      });
    }
    const linked = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(linked).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 5 }, count: 1 },
            },
          ],
        },
      ],
    });
    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack" }] }],
    });
  });

  it("uses the public play action and exposes the hand-source scope", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "EX11-027", as: "maquinamon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).not.toContain("EX11-027");
    assertNoLoudGap(s);
  });

  it("redirects one opponent attack to this inherited host, then allows the next attack through", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-067", as: "source", under: [cardId], suspended: true }],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker1", dp: 8000 },
            { card: "BT1-009", as: "attacker2", dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker1").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker2").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("deletes one opposing play-cost-5 Digimon on a public link and keeps the cost-6 peer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [{ card: "EX11-027", as: "link" }],
        },
        1: {
          battleArea: [
            { card: "AD1-001", as: "cost5" },
            { card: "BT1-019", as: "cost6" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("source").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-019");
    assertNoLoudGap(s);
  });

  it("uses the link deletion once per turn and resets it on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [
            { card: "EX11-027", as: "link1" },
            { card: "EX11-027", as: "link2" },
            { card: "EX11-027", as: "link3" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "AD1-001", as: "cost5a" },
            { card: "AD1-001", as: "cost5b" },
            { card: "BT1-019", as: "cost6" },
          ],
          deck: ["AD1-004", "AD1-005", "AD1-006"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link1").instanceId,
        targetPermanentId: s.perm("source").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link2").instanceId,
        targetPermanentId: s.perm("source").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").linked.length === 2);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    const loop = s.engine.startTurnLoop();
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link3").instanceId,
        targetPermanentId: s.perm("source").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-019");
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("does not redirect when the inherited optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-067", as: "source", under: [cardId], suspended: true }],
          security: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 1000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
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
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("does not redirect when EX11-042 is not inherited", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], security: ["BT1-013"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 1000 }] },
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
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
