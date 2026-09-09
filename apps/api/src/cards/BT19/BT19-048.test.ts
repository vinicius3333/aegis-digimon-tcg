import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-048.js";

/**
 * BT19-048 ForgeBeemon (Green/Black, Lv.4, Virus, Cyborg/X Antibody/Royal Base/LIBERATOR/
 * Insectoid, 4000 DP, play cost 4).
 *
 * Printed:
 *   [Digivolve] Lv.3 w/[Royal Base] trait: Cost 2
 *   [Security] [All Turns] All of your [Royal Base] trait Digimon get +1000 DP.
 *   [All Turns] [Once Per Turn] When any of your other Digimon with the [Royal Base] trait
 *     would leave the battle area by effects, by placing this Digimon as the face-up bottom
 *     security card, they don't leave.
 *   [Rule] Trait: Has the [Insectoid] type.
 *   Inherited: [All Turns] This Digimon gets +1000 DP.
 *
 * Removal is driven by REAL opponent cards played from the opponent's hand inside a running
 * production turn loop — BT8-097 Crimson Blaze (delete all of your opponent's Digimon with
 * 6000 DP or less) for the simultaneous case of Q3098, BT2-091 Volcanic Flare for the single
 * case — so "by effects" is exercised by genuine opposing resolutions, never by an injected
 * removal cause. Battle deletion is a real declared attack.
 */

const INERT_SECURITY = ["BT1-009", "BT1-011", "BT1-012"];
const INERT_DECK = ["BT1-012", "BT1-012", "BT1-012"];

type Setup = ReturnType<typeof setupEngine>;

async function openMain(s: Setup, seat: 0 | 1): Promise<void> {
  await advance(s.engine).waitForMainPhase(seat);
}

function closeMain(s: Setup, seat: 0 | 1): void {
  advance(s.engine).endMainPhaseIfOpen(seat);
}

async function stopLoop(s: Setup, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("BT19-048 ForgeBeemon", () => {
  it("matches the printed catalog entry and compiles every printed clause", () => {
    expect(getCardDefinition("BT19-048")).toMatchObject({
      cardId: "BT19-048",
      nameEn: "ForgeBeemon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      attributes: ["Virus"],
      types: ["Cyborg", "X Antibody", "Royal Base", "LIBERATOR", "Insectoid"],
      inheritedEffectText: "[All Turns] This Digimon gets +1000 DP.",
    });
    // The catalog prints non-breaking spaces inside the printed clauses; compare on the
    // normalized text so the assertion is about wording, not whitespace encoding.
    expect(getCardDefinition("BT19-048")!.effectText!.replace(/\u00a0/g, " ")).toBe(
      "[Digivolve]Lv.3 w/[Royal Base] trait: Cost 2 \n\n" +
        "[Security] [All Turns] All of your [Royal Base] trait Digimon get +1000 DP.\n" +
        "[All Turns] [Once Per Turn] When any of your other Digimon with the [Royal Base] trait " +
        "would leave the battle area by effects, by placing this Digimon as the face-up bottom " +
        "security card, they don't leave.\n" +
        "[Rule] Trait: Has the [Insectoid] type.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(digivolutionRequirementsFor("BT19-048")).toContainEqual({
      level: 3,
      traits: ["Royal Base"],
      cost: 2,
      isAlternate: true,
    });

    // "[Security] [All Turns]" compiles to a security-resident continuous effect: the
    // `isSecurity` + AllTurns pair is what routes it to the `securityStatic` builder
    // (interpreter/effect.ts `builderForTrigger`), whose base guard is "face up in security".
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isSecurity: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          target: {
            count: "all",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              // "[Royal Base] trait" is an EXACT trait gate, not a substring one.
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
          },
        },
      ],
    });
    // "[All Turns]" — not Static — so the clause is live on both players' turns.
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          // Q3098: no per-Digimon selection — every simultaneously-leaving match is kept.
          affectsAll: true,
          // "any of your OTHER Digimon", so the source itself is never protected.
          sourceFilter: { controller: "mine", excludeSelf: true, leaveReason: "effect" },
          target: { count: "all", filter: { controller: "mine", excludeSelf: true, leaveReason: "effect" } },
          cost: { kind: "placeAsSecurity", position: "faceUpBottom", target: { isSelf: true } },
        },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Insectoid"] }],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent", target: { isSelf: true } }],
    });
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] Lv.3 w/[Royal Base] trait: Cost 2
  // ---------------------------------------------------------------------------

  it("publicly digivolves from a Lv.3 [Royal Base] source for the reduced cost of 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-044", as: "base" }],
        hand: [{ card: "BT19-048", as: "forge" }],
        deck: [{ card: "BT1-012", as: "bonusDraw" }],
        security: INERT_SECURITY,
      },
      1: { security: INERT_SECURITY, deck: INERT_DECK },
    });
    s.state.memory = 5;
    await s.ready();
    const baseId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("forge").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-048");

    // 5 - 2: the printed alternate route, not the 3 the colour route would charge.
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(3);
    assertNoLoudGap(s);
  });

  it("charges the printed colour cost of 3 from a Lv.3 source without the [Royal Base] trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "goblimon" }],
        hand: [{ card: "BT19-048", as: "forge" }],
        deck: [{ card: "BT1-012", as: "bonusDraw" }],
        security: INERT_SECURITY,
      },
      1: { security: INERT_SECURITY, deck: INERT_DECK },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("goblimon").permanentId,
        instanceId: s.inst("forge").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("goblimon").topCard?.cardId === "BT19-048");

    // 5 - 3: the green Lv.3 colour route. The memory delta is the only thing that separates
    // the two routes, so this is what proves the reduced route above was really taken.
    expect(s.state.memory).toBe(2);
  });

  it("refuses the [Royal Base] route from a source without that trait and from a Lv.4 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-064", as: "goblimon" },
          { card: "BT18-046", as: "royalLevelFour" },
        ],
        hand: [{ card: "BT19-048", as: "forge" }],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
      1: { security: INERT_SECURITY, deck: INERT_DECK },
    });
    s.state.memory = 5;
    await s.ready();
    const forgeId = s.inst("forge").instanceId;

    // A Lv.3 Digimon without the [Royal Base] trait cannot use the reduced route.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("goblimon").permanentId,
        instanceId: forgeId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).not.toEqual({ ok: true });
    // A [Royal Base] Digimon of the wrong LEVEL cannot use it either.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("royalLevelFour").permanentId,
        instanceId: forgeId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).not.toEqual({ ok: true });

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([forgeId]);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      "BT1-064",
      "BT18-046",
    ]);
  });

  // ---------------------------------------------------------------------------
  // [Security] [All Turns] All of your [Royal Base] trait Digimon get +1000 DP.
  // ---------------------------------------------------------------------------

  it("buffs only its controller's [Royal Base] Digimon while face up in security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT19-048", faceUp: true }, ...INERT_SECURITY],
        battleArea: [
          { card: "BT19-045", as: "royalLevelThree" },
          { card: "BT19-052", as: "royalLevelFive" },
          // Near miss: [Royal Knight] contains neither more nor less than a different exact
          // trait, so an exact-trait gate must refuse it.
          { card: "BT19-015", as: "royalKnight" },
          { card: "BT1-013", as: "plain" },
        ],
        deck: INERT_DECK,
      },
      1: {
        // The opponent's own [Royal Base] Digimon is outside "all of YOUR" and must not gain.
        battleArea: [{ card: "BT19-045", as: "opponentRoyal" }],
        security: INERT_SECURITY,
        deck: INERT_DECK,
      },
    });
    await s.ready();

    expect(s.perm("royalLevelThree").currentDP).toBe(2000);
    expect(s.perm("royalLevelFive").currentDP).toBe(9000);
    expect(s.perm("royalKnight").currentDP).toBe(12000);
    expect(s.perm("plain").currentDP).toBe(5000);
    expect(s.perm("opponentRoyal").currentDP).toBe(1000);
    // Q3100: the card placed face up stays revealed in the stack.
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);
    expect(s.state.players[0]!.security.filter((card) => card.faceUp === true)).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("gives no buff from a face-down security copy or from a battle-area copy", async () => {
    const faceDown = setupEngine({
      0: {
        security: ["BT19-048", ...INERT_SECURITY],
        battleArea: [{ card: "BT19-045", as: "royal" }],
        deck: INERT_DECK,
      },
      1: { security: INERT_SECURITY, deck: INERT_DECK },
    });
    await faceDown.ready();
    expect(faceDown.perm("royal").currentDP).toBe(1000);

    // The clause is [Security]-gated: the same card standing on the battle area grants nothing.
    const onField = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-048", as: "forge" },
          { card: "BT19-045", as: "royal" },
        ],
        security: INERT_SECURITY,
        deck: INERT_DECK,
      },
      1: { security: INERT_SECURITY, deck: INERT_DECK },
    });
    await onField.ready();
    expect(onField.perm("royal").currentDP).toBe(1000);
    expect(onField.perm("forge").currentDP).toBe(4000);
  });

  it("is checked as an ordinary security card while revealed, and the buff ends with it (Q3101)", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT19-048", as: "forge", faceUp: true }],
        battleArea: [{ card: "BT19-045", as: "royal" }],
        deck: INERT_DECK,
      },
      1: {
        battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }],
        security: INERT_SECURITY,
        deck: INERT_DECK,
      },
    });
    await s.ready();
    expect(s.perm("royal").currentDP).toBe(2000);
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    // The face-up card was checked like any other: 4000 DP loses to the 20000 DP attacker and
    // it goes to the trash, taking its security-resident buff with it.
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-048"]);
    expect(s.perm("royal").currentDP).toBe(1000);
  });

  it("goes face down when an effect shuffles the security stack, ending the buff (Q3103)", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT19-048", faceUp: true }, ...INERT_SECURITY],
          battleArea: [
            { card: "BT19-045", as: "royal" },
            // BT14-093 is a yellow Option: its colour requirement needs a yellow permanent.
            { card: "BT1-045", as: "yellowSource" },
          ],
          hand: [{ card: "BT14-093", as: "emissary" }, "BT1-012"],
          deck: INERT_DECK,
        },
        1: { security: INERT_SECURITY, deck: INERT_DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.perm("royal").currentDP).toBe(2000);

    // BT14-093 Emissary of Hope searches the security stack, which shuffles it afterwards.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emissary").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.every((card) => card.faceUp !== true));

    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security.every((card) => card.faceUp !== true)).toBe(true);
    expect(s.perm("royal").currentDP).toBe(1000);
  });

  // ---------------------------------------------------------------------------
  // [All Turns] [Once Per Turn] would-leave-by-effects prevention.
  // ---------------------------------------------------------------------------

  it("keeps every simultaneously-leaving [Royal Base] Digimon for one placement (Q3098)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // Raised out of Crimson Blaze's 6000 DP range so the source itself is not part of
            // the removal it is answering.
            { card: "BT19-048", as: "forge", dp: 20_000 },
            { card: "BT19-045", as: "royalOne" },
            { card: "BT18-044", as: "royalTwo" },
            { card: "BT1-013", as: "plain" },
          ],
          security: [{ card: "BT1-009", as: "secTop" }, ...INERT_SECURITY.slice(1)],
          deck: INERT_DECK,
          hand: ["BT1-012"],
        },
        1: {
          // BT8-097 is a red Option: its colour requirement needs a red permanent.
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [{ card: "BT8-097", as: "blaze" }, "BT1-012"],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const forgeId = s.inst("forge").instanceId;
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("blaze").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 4);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    // Both [Royal Base] Digimon stayed; the non-[Royal Base] Digimon did not.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT18-044",
      "BT19-045",
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-013"]);
    // One placement paid for both: ForgeBeemon is now the FACE-UP BOTTOM security card.
    const security = s.state.players[0]!.security;
    expect(security.at(-1)!.instanceId).toBe(forgeId);
    expect(security.at(-1)!.faceUp).toBe(true);
    expect(security.slice(0, -1).map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      ...security.slice(1, -1).map((card) => card.instanceId),
    ]);
    expect(security.slice(0, -1).every((card) => card.faceUp !== true)).toBe(true);
    // From security it now feeds its own survivors: 1000 + 1000 each.
    expect(s.perm("royalOne").currentDP).toBe(2000);
    expect(s.perm("royalTwo").currentDP).toBe(2000);
    assertNoLoudGap(s);
  });

  it("declining the placement lets the opponent's effect take every [Royal Base] Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-048", as: "forge", dp: 20_000 },
            { card: "BT19-045", as: "royalOne" },
            { card: "BT18-044", as: "royalTwo" },
          ],
          security: INERT_SECURITY,
          deck: INERT_DECK,
          hand: ["BT1-012"],
        },
        1: {
          // BT8-097 is a red Option: its colour requirement needs a red permanent.
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [{ card: "BT8-097", as: "blaze" }, "BT1-012"],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("blaze").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-048"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT18-044", "BT19-045"]);
    // Nothing was paid: the security stack is untouched and still fully face down.
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.every((card) => card.faceUp !== true)).toBe(true);
  });

  it("does not answer a battle deletion, only a deletion by effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-048", as: "forge" },
            { card: "BT19-045", as: "royal" },
          ],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
        1: {
          // Seeded suspended so it is a legal attack target on seat 0's own turn; it only
          // stands up at ITS controller's unsuspend phase, which this turn never reaches.
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);

    // The [Royal Base] Digimon loses the battle it declared: a BATTLE deletion, not an
    // effect one, so the printed "by effects" gate refuses to answer it.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("royal").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);
    closeMain(s, 0);
    await stopLoop(s, loop, 0);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-045"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-048"]);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.every((card) => card.faceUp !== true)).toBe(true);
  });

  it("never protects itself, and never protects the opponent's [Royal Base] Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-048", as: "forge" },
            // Red Option colour requirement, raised out of Volcanic Flare's 4000 DP range so
            // ForgeBeemon is the opponent's only legal victim.
            { card: "BT1-014", as: "myRedSource", dp: 20_000 },
          ],
          hand: [{ card: "BT2-091", as: "myFlare" }, "BT1-012"],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
        1: {
          battleArea: [
            { card: "BT19-045", as: "opponentRoyal" },
            { card: "BT1-014", as: "theirRedSource", dp: 20_000 },
          ],
          hand: [{ card: "BT2-091", as: "theirFlare" }, "BT1-012"],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);

    // My own Volcanic Flare deletes the OPPONENT's [Royal Base] Digimon: "all of YOUR" scopes
    // the protection to the source's own seat, so nothing intervenes.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("myFlare").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 1);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT19-045"]);
    expect(s.state.players[0]!.security).toHaveLength(3);
    closeMain(s, 0);
    await openMain(s, 1);

    // "any of your OTHER Digimon": ForgeBeemon (4000 DP) cannot pay itself out of its own
    // removal, so it goes to the trash and no security card is placed.
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("theirFlare").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    // My own spent Volcanic Flare is in my trash alongside the unprotected ForgeBeemon.
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT2-091", "BT19-048"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.every((card) => card.faceUp !== true)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // [Rule] Trait: Has the [Insectoid] type. / inherited [All Turns] +1000 DP.
  // ---------------------------------------------------------------------------

  it("counts as an [Insectoid] Digimon for another card's trait gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-048", as: "forge" },
            // Near miss: a [Vegetation] Digimon is never an [Insectoid] one.
            { card: "BT19-046", as: "plant" },
          ],
          hand: [{ card: "BT15-094", as: "shocker" }, "BT1-012"],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
        1: { battleArea: [{ card: "BT1-013", as: "suspendTarget" }], security: INERT_SECURITY, deck: INERT_DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("forge"), "Insectoid")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("plant"), "Insectoid")).toBe(false);

    // BT15-094 Super Shocker: "1 of your Digimon with the [Insectoid] trait gets +3000 DP".
    // ForgeBeemon is the only legal recipient on the board.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shocker").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("forge").currentDP === 7000);

    expect(s.perm("forge").currentDP).toBe(7000);
    expect(s.perm("plant").currentDP).toBe(3000);
  });

  it("gives its evolution host inherited +1000 DP, and only its own host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-052", as: "host", under: [{ card: "BT19-048", as: "underForge" }] },
          // Same host card, an effectless digivolution card underneath: the +1000 is the
          // inherited effect of THIS card, not a property of having a stack at all.
          { card: "BT19-052", as: "peerHost", under: ["BT1-009"] },
        ],
        security: INERT_SECURITY,
        deck: INERT_DECK,
      },
      1: { security: INERT_SECURITY, deck: INERT_DECK },
    });
    await s.ready();

    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("underForge").instanceId]);
    expect(s.perm("host").currentDP).toBe(9000);
    expect(s.perm("peerHost").currentDP).toBe(8000);
    assertNoLoudGap(s);
  });
});
