import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// BT19-082 Yao Qinglan (Blue Tamer, cost 4, [LIBERATOR]).
//
//   [Start of Your Turn] If you have 2 memory or less, set your memory to 3.
//   [Your Turn] When any of your Digimon with [Aqua]/[Sea Animal] in one of its traits attack,
//     by suspending this Tamer, you may place 1 level 5 or lower Digimon card with
//     [Aqua]/[Sea Animal] in one of its traits from your hand as that Digimon's bottom
//     digivolution card.
//   [Security] Play this card without paying the cost.
//
// Rulings: none. `node tools/kb/query.mjs card BT19-082` reports no knowledge-base entries and
// docs/audits/BT19-reaudit/KB-INDEX.md lists 0 Q&A for this card.
//
// "in one of its traits" is a SUBSTRING match. No card in the catalog carries a trait spelled
// exactly "Aqua": the printed reference reaches [Aquatic], [Aquabeast] and [Ancient Aquabeast].
// Every [Aquatic] fixture below is therefore a live proof of the substring semantics — under the
// exact `match: "trait"` form this module used to carry, none of them would qualify.

const YAO = "BT19-082";
const AQUATIC_ATTACKER = "BT2-024"; // Seadramon, Blue L4 4000 DP, [Aquatic] — inert
const AQUATIC_HAND = "BT9-022"; // Ebidramon, Blue L4, [Aquatic] — inert
const SEA_ANIMAL_HAND = "BT1-033"; // Dolphmon, Blue L4, [Sea Animal]
const AQUATIC_LV6 = "BT7-028"; // KingWhamon, Blue L6, [Sea Animal] — over the level gate
const PLAIN = "BT1-009"; // Monodramon, [Mini Dragon] — no [Aqua*]/[Sea Animal] trait
const WALL = "BT1-013"; // Muchomon, 5000 DP — a suspended opponent wall to attack into
const FILLER = ["BT1-009", "BT1-010", "BT1-012", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-012", "BT1-013"];

describe("BT19-082 Yao Qinglan", () => {
  it("matches the catalog print this audit reads from", () => {
    expect(getCardDefinition(YAO)).toMatchObject({
      cardId: YAO,
      nameEn: "Yao Qinglan",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
      effectText:
        "[Start of Your Turn] If you have 2 memory or less, set your memory to 3.\n" +
        // NOTE: the catalog separates "[Sea Animal]" from "in one of its traits" with U+00A0.
        "[Your Turn] When any of your Digimon with [Aqua]/[Sea Animal]\u00A0in one of its traits attack, by suspending " +
        "this Tamer, you may place 1 level 5 or lower Digimon card with [Aqua]/[Sea Animal]\u00A0in one of its traits " +
        "from your hand as that Digimon's bottom digivolution card.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(getCardDefinition(YAO)?.inheritedEffectText).toBeUndefined();
  });

  it("keeps the memory reset, the attack-triggered placement and the security play in the record", () => {
    const card = runtimeCompiledCard(YAO);
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourTurn",
        actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenAttacking",
            sourceFilter: {
              controller: "mine",
              kind: ["Digimon"],
              // "in one of its traits" is a SUBSTRING gate, not "with the [X] trait".
              nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "traitContains" }],
            },
            actions: [
              {
                kind: "PlaceUnder",
                optional: true,
                position: "bottom",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    levelComparison: { op: "lte", value: 5 },
                    nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "traitContains" }],
                  },
                  from: ["hand"],
                  count: 1,
                },
                underFilter: { controller: "mine", kind: ["Digimon"], isTriggerSource: true },
                cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
              },
            ],
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
    ]);
  });

  // --- play cost ------------------------------------------------------------------------

  it("costs 4 memory to play from hand in a real Main phase", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: YAO, as: "yao" }, PLAIN], deck: [...FILLER], security: [...SECURITY] },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yao").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === YAO));

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual([PLAIN]);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual([YAO]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  // --- [Start of Your Turn] -------------------------------------------------------------

  it("[Start of Your Turn] raises memory from 2 to 3, read inside the open Main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: YAO, as: "yao" }],
          hand: [PLAIN],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    const turn = s.engine.runOneTurn();
    // Read INSIDE the open Main phase; after the turn passes, memory is the post-pass value.
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    expect(s.perm("yao").isSuspended).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  it("[Start of Your Turn] leaves memory alone when it is already above 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: YAO, as: "yao" }],
          hand: [PLAIN],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(6); // NOT lowered to 3 — the clause only raises
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  // --- [Your Turn] attack-triggered placement --------------------------------------------

  it("suspends the Tamer and places an [Aquatic] hand card as the attacker's BOTTOM digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: YAO, as: "yao" },
            { card: AQUATIC_ATTACKER, as: "attacker", dp: 20_000, under: [{ card: PLAIN, as: "existingUnder" }] },
            // A second [Aquatic] Digimon that does NOT attack: "that Digimon's" must not reach it.
            { card: AQUATIC_ATTACKER, as: "bystander", dp: 20_000 },
          ],
          hand: [{ card: AQUATIC_HAND, as: "material" }, PLAIN],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: WALL, as: "wall", suspended: true }], security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const materialId = s.inst("material").instanceId;
    const existingId = s.inst("existingUnder").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").stack.some((c) => c.instanceId === materialId));
    await settle();

    // Bottom-most first: the placed card sits BELOW the card already in the stack.
    expect(s.perm("attacker").stack.map((c) => c.instanceId)).toEqual([materialId, existingId]);
    expect(s.perm("yao").isSuspended).toBe(true); // the printed suspend cost was paid
    expect(s.perm("bystander").stack.map((c) => c.instanceId)).toEqual([]);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual([PLAIN]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("accepts a [Sea Animal] hand card too", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: YAO, as: "yao" },
            { card: AQUATIC_ATTACKER, as: "attacker", dp: 20_000 },
          ],
          hand: [{ card: SEA_ANIMAL_HAND, as: "material" }, PLAIN],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: WALL, as: "wall", suspended: true }], security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const materialId = s.inst("material").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").stack.some((c) => c.instanceId === materialId));

    expect(s.perm("attacker").stack.map((c) => c.instanceId)).toEqual([materialId]);
    expect(s.perm("yao").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("near miss: a level 6 [Sea Animal] card in hand is over the level gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: YAO, as: "yao" },
            { card: AQUATIC_ATTACKER, as: "attacker", dp: 20_000 },
          ],
          hand: [{ card: AQUATIC_LV6, as: "tooBig" }, PLAIN],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: WALL, as: "wall", suspended: true }], security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const tooBigId = s.inst("tooBig").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    expect(s.perm("attacker").stack.map((c) => c.instanceId)).toEqual([]);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(tooBigId);
    expect(s.perm("yao").isSuspended).toBe(false); // no payload, so no cost was paid
    assertNoLoudGap(s);
  });

  it("near miss: a Digimon with no [Aqua*]/[Sea Animal] trait does not open the window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: YAO, as: "yao" },
            // BT1-009 Monodramon is [Mini Dragon]: neither printed trait, exact or substring.
            { card: PLAIN, as: "attacker", dp: 20_000 },
          ],
          hand: [{ card: AQUATIC_HAND, as: "material" }, PLAIN],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: WALL, as: "wall", suspended: true }], security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const materialId = s.inst("material").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    expect(s.perm("attacker").stack.map((c) => c.instanceId)).toEqual([]);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(materialId);
    expect(s.perm("yao").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("declining the optional leaves the Tamer unsuspended and the card in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: YAO, as: "yao" },
            { card: AQUATIC_ATTACKER, as: "attacker", dp: 20_000 },
          ],
          hand: [{ card: AQUATIC_HAND, as: "material" }, PLAIN],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: WALL, as: "wall", suspended: true }], security: [...SECURITY], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const materialId = s.inst("material").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    expect(s.perm("attacker").stack.map((c) => c.instanceId)).toEqual([]);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(materialId);
    expect(s.perm("yao").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("an already-suspended Yao Qinglan cannot pay the cost again in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: YAO, as: "yao" },
            { card: AQUATIC_ATTACKER, as: "first", dp: 20_000, under: [{ card: PLAIN, as: "firstUnder" }] },
            { card: AQUATIC_ATTACKER, as: "second", dp: 20_000 },
          ],
          hand: [{ card: AQUATIC_HAND, as: "materialA" }, { card: SEA_ANIMAL_HAND, as: "materialB" }, PLAIN],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [
            { card: WALL, as: "wallA", suspended: true },
            { card: WALL, as: "wallB", suspended: true },
          ],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const materialA = s.inst("materialA").instanceId;
    const materialB = s.inst("materialB").instanceId;
    const firstUnder = s.inst("firstUnder").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wallA").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").stack.length === 2);
    expect(s.perm("first").stack.map((c) => c.instanceId)).toEqual([materialA, firstUnder]);
    expect(s.perm("yao").isSuspended).toBe(true);

    // The second attack finds the Tamer already suspended: the cost cannot be paid again.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wallB").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    expect(s.perm("second").stack.map((c) => c.instanceId)).toEqual([]);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(materialB);
    assertNoLoudGap(s);
  });

  it("the Tamer stands up again and pays on the NEXT own turn, through the real turn loop", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: YAO, as: "yao" },
            { card: AQUATIC_ATTACKER, as: "attacker", dp: 20_000 },
          ],
          hand: [{ card: AQUATIC_HAND, as: "materialA" }, { card: SEA_ANIMAL_HAND, as: "materialB" }, PLAIN],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: WALL, as: "wall", suspended: true }], security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const materialA = s.inst("materialA").instanceId;
    const materialB = s.inst("materialB").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").stack.some((c) => c.instanceId === materialA));
    expect(s.perm("yao").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);

    // The opponent's real turn runs, then ours comes back around with a real unsuspend phase.
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("yao").isSuspended).toBe(true); // still suspended on THEIR turn
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    expect(s.perm("yao").isSuspended).toBe(false); // our unsuspend phase stood it back up
    expect(s.perm("attacker").isSuspended).toBe(false);

    // Seat 1's wall stood up too, so it is attackable again.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").stack.some((c) => c.instanceId === materialB));

    expect(s.perm("attacker").stack.map((c) => c.instanceId)).toEqual([materialB, materialA]);
    expect(s.perm("yao").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Your Turn] only: the clause does not fire on the opponent's attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: YAO, as: "yao" },
            { card: AQUATIC_ATTACKER, as: "mine", dp: 20_000 },
          ],
          hand: [{ card: AQUATIC_HAND, as: "material" }, PLAIN],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: AQUATIC_ATTACKER, as: "theirs", dp: 20_000 }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const materialId = s.inst("material").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("theirs").permanentId,
        // Seat 0's Digimon is unsuspended, so it is not a legal battle target; attack the
        // player instead. Either way seat 1's [Aquatic] Digimon is the one attacking.
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("theirs").isSuspended);
    await settle();

    // Seat 0's [Aquatic] Digimon was attacked, not attacking, and it is the opponent's turn.
    expect(s.perm("mine").stack.map((c) => c.instanceId)).toEqual([]);
    expect(s.perm("theirs").stack.map((c) => c.instanceId)).toEqual([]);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(materialId);
    expect(s.perm("yao").isSuspended).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- [Security] -----------------------------------------------------------------------

  it("[Security] plays itself for free through a real security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-015", as: "attacker" }], deck: [...FILLER], security: [...SECURITY] },
        1: {
          security: [
            { card: YAO, as: "securityYao" },
            { card: "BT1-012", as: "securityFiller" },
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const yaoId = s.inst("securityYao").instanceId;
    const fillerId = s.inst("securityFiller").instanceId;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === yaoId));

    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([yaoId]);
    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([fillerId]);
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).not.toContain(yaoId);
    // Nothing paid its cost of 4.
    expect(s.state.memory).toBe(3);
    expect(s.perm("attacker").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("[Security] control: an unchecked BT19-082 stays face down and plays nothing", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-015", as: "attacker" }], deck: [...FILLER], security: [...SECURITY] },
        1: {
          security: [
            { card: "BT1-012", as: "securityFiller" },
            { card: YAO, as: "securityYao" },
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const yaoId = s.inst("securityYao").instanceId;
    const fillerId = s.inst("securityFiller").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((c) => c.instanceId === fillerId));

    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([yaoId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
