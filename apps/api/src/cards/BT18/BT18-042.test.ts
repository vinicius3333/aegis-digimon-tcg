import { describe, expect, it } from "vitest";
import { EffectTiming, type IntentResult } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT1/BT1-009.js";
import "../BT1/BT1-060.js";
import "../BT13/BT13-007.js";
import "../BT7/BT7-021.js";
import "../BT7/BT7-087.js";
import "../EX4/EX4-003.js";
import "./BT18-042.js";

describe("BT18-042 MagnaGarurumon", () => {
  it("places an exact level 5 stack card into security and deletes the matching opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-060", as: "host" }],
          hand: [{ card: "BT18-042", as: "magna" }],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-060", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("magna").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT1-060"));

    expect(s.perm("host").topCard?.cardId).toBe("BT18-042");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-060")).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("target").instanceId),
    ).toBe(false);
    assertNoLoudGap(s);
  });

  it("shares its once-per-turn use between When Digivolving and End of Opponent's Turn", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-060", as: "base", under: [{ card: "BT1-009", as: "level3Source" }] }],
          hand: [{ card: "BT18-042", as: "source" }],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-060", as: "level5" },
            { card: "BT1-009", as: "level3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    s.state.memory = 10;
    await s.ready();
    preferredInstanceIds.push(s.perm("base").topCard!.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-042");
    await settle(() => s.perm("base").stack.length === 1);
    s.state.turnSeat = 1;
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);

    expect(s.perm("base").stack).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-009"]);
    assertNoLoudGap(s);
  });

  it("triggers on an opponent's attack, pays top security, unsuspends, and only acts once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-042", as: "source", suspended: true }],
          security: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-060", as: "firstAttacker" },
            { card: "BT1-060", as: "secondAttacker" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("first").instanceId));

    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("first").instanceId)).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("second").instanceId);
    assertNoLoudGap(s);
  });

  it("digivolves from Koji with more than 5 Hybrid sources for 5 without firing a Digimon digivolution trigger", async () => {
    const hybrids = Array.from({ length: 6 }, () => "BT7-021");
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-087", as: "koji", under: hybrids }],
        hand: [{ card: "BT18-042", as: "magna" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
        security: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-060", as: "wouldMatch" }] },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koji").permanentId,
        instanceId: s.inst("magna").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.instanceId === s.inst("magna").instanceId);

    expect(s.state.memory).toBe(5);
    expect(s.perm("koji").stack).toHaveLength(7);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("evolutionDraw").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(
      s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("wouldMatch").permanentId),
    ).toBe(true);
    assertNoLoudGap(s);
  });
});

const KUMAMON = "BT7-021";
const KOJI = "BT7-087";

function hybridSources(count: number): string[] {
  return Array.from({ length: count }, () => KUMAMON);
}

function digivolveIntent(s: EngineSetup, permanentAlias: string, cardAlias: string): IntentResult {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(permanentAlias).permanentId,
    instanceId: s.inst(cardAlias).instanceId,
  });
}

describe("BT18-042 MagnaGarurumon — KB Q&A rulings", () => {
  it("digivolves from Koji with more than 5 [Hybrid] cards under it for cost 5, but not with fewer than 5 (Q2966)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: KOJI, as: "crowdedKoji", under: hybridSources(7) },
          { card: KOJI, as: "shortKoji", under: hybridSources(4) },
        ],
        hand: [
          { card: "BT18-042", as: "magna" },
          { card: "BT18-042", as: "spareMagna" },
        ],
        deck: ["BT1-009"],
        security: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(digivolveIntent(s, "shortKoji", "spareMagna").ok).toBe(false);
    expect(s.state.memory).toBe(10);

    expect(digivolveIntent(s, "crowdedKoji", "magna")).toEqual({ ok: true });
    await settle(() => s.perm("crowdedKoji").topCard?.instanceId === s.inst("magna").instanceId);

    expect(s.state.memory).toBe(5);
    expect(s.perm("crowdedKoji").stack).toHaveLength(8);
    expect(s.perm("shortKoji").topCard?.cardId).toBe(KOJI);
  });

  it("triggers its [All Turns] unsuspend when either your own Digimon or an opponent's Digimon attacks (Q2967)", async () => {
    for (const attackingSeat of [0, 1] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT18-042", as: "magna", suspended: true },
              ...(attackingSeat === 0 ? [{ card: "BT1-060", as: "attacker" }] : []),
            ],
            security: [
              { card: "BT1-009", as: "paidSecurity" },
              { card: "BT1-010", as: "keptSecurity" },
            ],
          },
          1: {
            battleArea: attackingSeat === 1 ? [{ card: "BT1-060", as: "attacker" }] : [],
            security: ["BT1-009", "BT1-010"],
          },
        },
        { autoAcceptOptional: true },
      );
      s.state.turnSeat = attackingSeat;
      await s.ready();

      expect(s.perm("magna").isSuspended).toBe(true);
      expect(
        s.engine.applyIntent(attackingSeat, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("paidSecurity").instanceId),
      );

      expect(s.perm("magna").isSuspended).toBe(false);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("paidSecurity").instanceId);
      expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).not.toContain(
        s.inst("paidSecurity").instanceId,
      );
    }
  });

  it("does not treat a Tamer base as a digivolving Digimon: 'when a Digimon digivolves' watchers stay silent and a 'Digimon can't digivolve' lock does not stop it (Q6608)", async () => {
    const lockedBoard = setupEngine(
      {
        0: {
          battleArea: [
            { card: KOJI, as: "koji", under: hybridSources(5) },
            { card: "BT1-060", as: "lockedDigimon" },
            { card: "BT1-009", as: "watcherHost", under: ["EX4-003"] },
          ],
          breeding: { card: "BT13-007", as: "digivolveLock" },
          hand: [
            { card: "BT18-042", as: "magna" },
            { card: "BT18-042", as: "lockedMagna" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    lockedBoard.state.memory = 10;
    await lockedBoard.ready();

    expect(digivolveIntent(lockedBoard, "lockedDigimon", "lockedMagna").ok).toBe(false);
    expect(digivolveIntent(lockedBoard, "koji", "magna")).toEqual({ ok: true });
    await settle(() => lockedBoard.perm("koji").topCard?.instanceId === lockedBoard.inst("magna").instanceId);
    await settle();

    expect(lockedBoard.state.memory).toBe(5);
    expect(lockedBoard.perm("koji").stack).toHaveLength(6);
    // Only the digivolution bonus draw: the Tsunomon "when one of your other Digimon digivolves" draw stays silent.
    expect(lockedBoard.state.players[0]!.deck).toHaveLength(2);

    const digimonBaseBoard = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-060", as: "digimonBase" },
            { card: "BT1-009", as: "watcherHost", under: ["EX4-003"] },
          ],
          hand: [{ card: "BT18-042", as: "magna" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    digimonBaseBoard.state.memory = 10;
    await digimonBaseBoard.ready();

    expect(digivolveIntent(digimonBaseBoard, "digimonBase", "magna")).toEqual({ ok: true });
    await settle(() => digimonBaseBoard.state.players[0]!.deck.length === 1);

    expect(digimonBaseBoard.perm("digimonBase").topCard?.instanceId).toBe(digimonBaseBoard.inst("magna").instanceId);
    expect(digimonBaseBoard.state.players[0]!.deck).toHaveLength(1);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q6609)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: KOJI, as: "koji", under: hybridSources(5) }],
        hand: [{ card: "BT18-042", as: "magna" }],
        deck: [{ card: "BT1-009", as: "bonusDraw" }],
        security: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(digivolveIntent(s, "koji", "magna")).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("bonusDraw").instanceId),
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("can't attack the turn it digivolves from a Tamer played this turn, but can from an older Tamer (Q6610)", async () => {
    for (const kojiPlayedThisTurn of [true, false]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: KOJI, as: "koji", under: hybridSources(5), enteredThisTurn: kojiPlayedThisTurn }],
            hand: [{ card: "BT18-042", as: "magna" }],
            deck: ["BT1-009"],
            security: ["BT1-009"],
          },
          1: { security: ["BT1-009", "BT1-009"] },
        },
        { autoDeclineOptional: true },
      );
      s.state.memory = 10;
      await s.ready();

      expect(digivolveIntent(s, "koji", "magna")).toEqual({ ok: true });
      await settle(() => s.perm("koji").topCard?.instanceId === s.inst("magna").instanceId);

      const attack = s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("koji").permanentId,
        target: { kind: "player" },
      });
      expect(attack.ok).toBe(!kojiPlayedThisTurn);
      await settle();
      expect(s.perm("koji").isSuspended).toBe(!kojiPlayedThisTurn);
    }
  });

  it("keeps the Tamer as a digivolution card and trashes it when the Digimon leaves the field (Q6611)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: KOJI, as: "koji", under: hybridSources(5) }],
          hand: [{ card: "BT18-042", as: "magna" }],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-060", as: "wall", dp: 20000, suspended: true }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(digivolveIntent(s, "koji", "magna")).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.instanceId === s.inst("magna").instanceId);
    const kojiInstanceId = s.inst("koji").instanceId;
    const magnaPermanentId = s.perm("koji").permanentId;
    expect(s.perm("koji").stack.map(({ instanceId }) => instanceId)).toContain(kojiInstanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: magnaPermanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === magnaPermanentId));

    const trashIds = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(trashIds).toContain(kojiInstanceId);
    expect(trashIds).toContain(s.inst("magna").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(7);
  });

  it("does not gain the [Security] effect in the lower text of a Tamer in its digivolution cards (Q6612)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-042", as: "magna", under: [{ card: KOJI, as: "stackedKoji" }, ...hybridSources(5)] },
          ],
          security: [{ card: KOJI, as: "securityKoji" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const triggeredSources = () =>
      s.events.flatMap((event) => (event.kind === "effectTriggered" ? [event.sourceInstanceId] : []));

    // No intent reveals a battle-area Digimon as a security card, so fire the security-skill
    // window directly on the permanent: a gained [Security] effect would trigger from the stacked Koji.
    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("magna"));
    await settle();

    expect(triggeredSources()).not.toContain(s.inst("stackedKoji").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("magna").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("stackedKoji").instanceId);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityKoji"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(triggeredSources()).toContain(s.inst("securityKoji").instanceId);
    expect(triggeredSources()).not.toContain(s.inst("stackedKoji").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.instanceId)).toEqual([
      s.inst("magna").instanceId,
      s.inst("securityKoji").instanceId,
    ]);
    expect(s.perm("magna").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("stackedKoji").instanceId);
  });

  it("gains the inherited effect in the lower text of a Tamer in its digivolution cards (Q6613)", async () => {
    for (const kojiInStack of [true, false]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT18-042",
                as: "magna",
                under: kojiInStack ? [KOJI, ...hybridSources(5)] : hybridSources(6),
              },
              { card: "BT1-009", as: "returned" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      await s.ready();

      // Koji's inherited "[Your Turn] when an effect adds a card to your hand" watches the same
      // return-to-hand seam a bounce effect uses.
      await advance(s.engine).verb.returnToHand([s.inst("returned").instanceId]);
      await settle();

      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("returned").instanceId]);
      expect(s.state.memory).toBe(kojiInStack ? 4 : 3);
      expect(observe(s.engine).isRestricted(s.perm("magna"), "cantBeBlocked")).toBe(kojiInStack);
    }
  });
});
