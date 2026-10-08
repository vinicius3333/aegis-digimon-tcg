import { EffectDuration, Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle, type SetupEngineOptions } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

// CR 16-30-4: granting Blocker affects the Digimon; compulsory blocking affects its player.
// Candidate production match 4640a9e2-58d1-4a84-b0fc-dc88084012d0 (anonymous identity unconfirmed).
describe("#5349 Collision against Magnamon X immunity through Paladin ACE", () => {
  const cases = ([0, 1] as const).flatMap(
    (defender) =>
      [
        { defender, arena: false, immune: true, evolution: "blast" },
        { defender, arena: false, immune: false, evolution: "blast" },
        { defender, arena: false, immune: true, evolution: "normal" },
        { defender, arena: false, immune: true, evolution: "keep" },
      ] as const,
  );
  const arenaCases = [...cases, { defender: 0, immune: true, evolution: "blast", arena: true } as const];
  it.each(arenaCases)(
    "seat $defender, immune $immune, evolution $evolution, arena $arena",
    async ({ defender, immune, evolution, arena }) => {
      const attacker: Seat = defender === 0 ? 1 : 0;
      const preferred: string[] = [];
      const responses: SetupEngineOptions = {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferInstanceIds: preferred,
      };
      const s = setupEngine(
        {
          [defender]: {
            battleArea: [
              { card: immune ? "EX13-020" : "BT1-038", as: "base", under: immune ? ["BT21-036"] : [] },
              { card: "BT1-009", as: "probe" },
            ],
            hand: [{ card: "BT16-102", as: "magna" }, { card: "BT17-077", as: "paladin" }, "BT1-009"],
            eggDeck: ["BT1-001"],
            deck: Array(12).fill("BT1-001"),
            security: Array(5).fill("BT1-001"),
          },
          [attacker]: {
            battleArea: [
              { card: "EX13-064", as: "lord" },
              { card: "EX13-058", as: "knight", under: ["BT1-009"] },
            ],
            hand: [{ card: "BT1-012", as: "play" }, "BT1-009"],
            eggDeck: ["BT1-001"],
            deck: Array(12).fill("BT1-001"),
            security: ["BT1-084", ...Array(4).fill("BT1-001")],
          },
        },
        responses,
      );
      if (arena) layDevScenario("arena-github-5349-collision-immunity", s.state, [BLUE_DECK, RED_DECK]);
      const permanents = {
        base: arena ? s.state.players[defender]!.battleArea[0]! : s.perm("base"),
        probe: arena ? s.state.players[defender]!.battleArea[1]! : s.perm("probe"),
        lord: arena ? s.state.players[attacker]!.battleArea[0]! : s.perm("lord"),
        knight: arena ? s.state.players[attacker]!.battleArea[1]! : s.perm("knight"),
      };
      const cards = {
        magna: arena ? s.state.players[defender]!.hand[0]! : s.inst("magna"),
        paladin: arena ? s.state.players[defender]!.hand[1]! : s.inst("paladin"),
        play: arena ? s.state.players[attacker]!.hand[0]! : s.inst("play"),
      };
      const perm = (alias: keyof typeof permanents) => permanents[alias];
      const inst = (alias: keyof typeof cards) => cards[alias];
      let immunityAtCounter: boolean | undefined;
      let blockerAtCounter: boolean | undefined;
      responses.onEvent = (event) => {
        if (event.kind === "counterResolved") {
          immunityAtCounter = observe(s.engine).isRestrictedByEffect(perm("base"), "beAffected", "Digimon");
          blockerAtCounter = observe(s.engine).hasKeyword(perm("base"), "Blocker");
        }
      };
      s.state.turnSeat = defender;
      s.state.memory = 10;
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(defender, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(defender);
        expect(
          s.engine.applyIntent(defender, {
            type: "digivolve",
            permanentId: perm("base").permanentId,
            instanceId: inst("magna").instanceId,
          }),
        ).toEqual({ ok: true });
        await settle(() =>
          s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT16-102"),
        );
        expect(observe(s.engine).isRestrictedByEffect(perm("base"), "beAffected", "Digimon")).toBe(immune);
        expect(
          s.engine.applyIntent(defender, {
            type: "attack",
            attackerPermanentId: perm("probe").permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.engine.combat.hasOpenBlockWindow);
        expect(s.engine.applyIntent(attacker, { type: "declineBlock" })).toEqual({ ok: true });
        await settle(() => !observe(s.engine).isAttacking());
        expect(s.state.players[attacker]!.security).toHaveLength(4);
        expect(s.state.players[defender]!.battleArea).toHaveLength(1);
        expect(
          s.events.filter(
            (event) =>
              event.kind === "effectResolved" &&
              event.sourceCardId === "BT16-102" &&
              event.timing === "WhenDigivolving",
          ),
        ).toHaveLength(2);
        expect(observe(s.engine).isRestrictedByEffect(perm("base"), "beAffected", "Digimon")).toBe(immune);
        if (evolution === "normal") {
          expect(
            s.engine.applyIntent(defender, {
              type: "digivolve",
              permanentId: perm("base").permanentId,
              instanceId: inst("paladin").instanceId,
            }),
          ).toEqual({ ok: true });
          await settle(() =>
            s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT17-077"),
          );
          expect(observe(s.engine).isRestrictedByEffect(perm("base"), "beAffected", "Digimon")).toBe(true);
        }
        if (evolution !== "normal") expect(s.engine.applyIntent(defender, { type: "endPhase" })).toEqual({ ok: true });
        // The normal 5 + 6 evolution route crosses memory and ends the turn naturally.
        await settle(() => s.state.turnSeat === attacker && s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(attacker, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(attacker);
        expect(observe(s.engine).isRestrictedByEffect(perm("base"), "beAffected", "Digimon")).toBe(immune);
        preferred.push(perm("knight").topCard.instanceId);
        expect(s.engine.applyIntent(attacker, { type: "playCard", instanceId: inst("play").instanceId })).toEqual({
          ok: true,
        });
        await settle(() => s.engine.combat.hasOpenAllianceDecision);
        expect(
          s.engine.applyIntent(attacker, { type: "respondAlliance", allyPermanentId: perm("lord").permanentId }),
        ).toEqual({ ok: true });
        if (evolution === "normal") {
          // With no ACE left in hand there is no Counter pause; the crossed-memory turn may
          // finish immediately after combat. Assert the completed attack's public results.
          await settle(() => !observe(s.engine).isAttacking());
          expect(
            s.events.filter(
              (event) => event.kind === "blockWindowOpened" && event.attackerPermanentId === perm("knight").permanentId,
            ),
          ).toEqual([]);
          expect(s.state.players[defender]!.security).toHaveLength(3);
          return;
        }
        await settle(() => perm("lord").isSuspended);
        expect(perm("lord").isSuspended).toBe(true);
        expect(observe(s.engine).hasKeyword(perm("knight"), "Collision")).toBe(true);
        {
          await settle(() => s.state.combatWindow?.kind === "counter");
          const counter = s.events.find((event) => event.kind === "counterWindowOpened");
          if (counter?.kind !== "counterWindowOpened") throw new Error("Counter did not open");
          const blast = counter.eligibleCounters.find((entry) => entry.instanceId === inst("paladin").instanceId)!;
          expect(blast.effectKey).toBe(`blast-digivolve:${perm("base").permanentId}`);
          expect(observe(s.engine).hasKeyword(perm("base"), "Blocker")).toBe(true);
          responses.preferOptionIndex = 1; // Match the candidate: return the opponent's trash.
          expect(
            s.engine.applyIntent(
              defender,
              evolution === "blast"
                ? { type: "respondCounter", sourceInstanceId: blast.instanceId, effectKey: blast.effectKey }
                : { type: "respondCounter" },
            ),
          ).toEqual({ ok: true });
          await settle(() => s.events.some((event) => event.kind === "counterResolved"));
        }
        expect(perm("base").topCard.cardId).toBe(evolution === "keep" ? "BT16-102" : "BT17-077");
        // Returning the white Lv7 security Digimon gains 3 memory and can finish the turn;
        // capture immunity synchronously at Counter resolution, before its legitimate expiry.
        expect(immunityAtCounter).toBe(immune);
        expect(blockerAtCounter).toBe(!immune || evolution === "keep");
        if (evolution !== "keep") {
          expect(perm("knight").stack).toHaveLength(0);
          expect(s.state.players[attacker]!.trash).toHaveLength(0);
          expect(s.state.players[attacker]!.deck.some((card) => card.cardId === "BT1-084")).toBe(true);
        }
        await settle(() => s.engine.combat.hasOpenBlockWindow || !observe(s.engine).isAttacking());
        if (!immune || evolution === "keep") {
          expect(observe(s.engine).hasKeyword(perm("base"), "Blocker")).toBe(true);
          expect(
            s.events.filter(
              (event) => event.kind === "blockWindowOpened" && event.attackerPermanentId === perm("knight").permanentId,
            ),
          ).toEqual([expect.objectContaining({ mustBlock: true, eligibleBlockerIds: [perm("base").permanentId] })]);
          expect(s.engine.applyIntent(defender, { type: "declineBlock" }).ok).toBe(false);
          expect(
            s.engine.applyIntent(defender, { type: "declareBlock", blockerPermanentId: perm("base").permanentId }),
          ).toEqual({ ok: true });
          await settle(() => !observe(s.engine).isAttacking());
        } else {
          expect(
            s.events.filter(
              (event) => event.kind === "blockWindowOpened" && event.attackerPermanentId === perm("knight").permanentId,
            ),
          ).toEqual([]);
          expect(observe(s.engine).hasKeyword(perm("base"), "Blocker")).toBe(false);
          expect(perm("base").isSuspended).toBe(false);
          expect(s.state.players[defender]!.security).toHaveLength(3);
        }
      } finally {
        if (s.state.phase === Phase.Breeding) {
          s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
          await advance(s.engine).waitForMainPhase(s.state.turnSeat);
        }
        s.engine.applyIntent(defender, { type: "surrender" });
        await loop;
      }
    },
  );
});

// Supplemental restriction controls isolate block legality from the grant itself.
it.each(["suspended", "block", "cantBeBlocked"] as const)(
  "#5349 Collision respects %s legality",
  async (constraint) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-032", as: "attacker" }] },
        1: {
          battleArea: [{ card: "AD1-001", as: "defender", suspended: constraint === "suspended" }],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    if (constraint !== "suspended") {
      // Named test seam: the control isolates a prohibition, independent of its printed producer.
      await advance(s.engine).verb.restrict(
        s.perm(constraint === "block" ? "defender" : "attacker").permanentId,
        constraint,
        EffectDuration.UntilEndAttack,
      );
    }
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.events.filter((event) => event.kind === "blockWindowOpened")).toEqual([]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  },
);
