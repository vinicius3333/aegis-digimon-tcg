import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition, type ServerEvent } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

// BT19-053 QueenBeemon (Green/Black, Lv.6 Mega/Virus, DP 12000, play cost 12,
// digivolve Green Lv.5 cost 4 / Black Lv.5 cost 4).
//
//   [Digivolve] Lv.5 w/[Royal Base] trait: Cost 3
//   ＜Alliance＞
//   [When Attacking] [Once Per Turn] You may play 1 [Royal Base] trait Digimon card from
//     your face-up security cards with the play cost reduced by 8.
//   [All Turns] When any of your [Royal Base] trait Digimon would leave the battle area
//     other than in battle, you may place those Digimon face-up at the bottom of your
//     security stack.
//   [Rule] Trait: Has the [Insectoid] type.
//   No inherited effect.
//
// KB coverage (`node tools/kb/query.mjs card BT19-053`)
//   Q3099  ForgeBeemon (BT19-048) saves the [Royal Base] Digimon first; QueenBeemon's
//          [All Turns] may still place every Digimon the deletion effect affected.
//   Q3106  the Digimon played by [When Attacking] may be chosen as the ＜Alliance＞ ally.
//   Q3107  the [All Turns] clause also covers QueenBeemon herself.
//   Q3108  every simultaneously-leaving [Royal Base] Digimon is placed; no choice is made.
//   Q3109  cards placed face up in security stay revealed and are otherwise normal.
//   Q3110  a security check on a face-up card runs as a normal check, card left revealed.
//   Q3111  a [Security] effect on a face-up security card still triggers on the check.
//   Q3112  shuffling a security stack turns every face-up card face down.
//   Q5304  the mirror of Q3099 written on ForgeBeemon's own card.
//
// Fixture cards
//   [Royal Base] peers: BT18-052 CannonBeemon (Lv.5 source), BT19-045 FunBeemon,
//     BT19-052 Vespamon (play cost 8), BT19-048 ForgeBeemon (Q3099/Q5304).
//   Near misses: BT1-066 Tentomon and BT1-076 MegaKabuterimon are Green [Insectoid]
//     Digimon WITHOUT the [Royal Base] trait.
//   BT2-018 MetalGreymon is the opponent's public mass deletion ("[On Play] Delete all of
//     your opponent's Digimon with 4000 DP or less") — a real by-effect simultaneous leave.
//   BT9-100 Grandis Scissor gives a second attack in the same turn for the once-per-turn
//     proof, and its "[Insectoid] in its traits" filter is the [Rule] line's consequence.
//   EX3-029 searches its own security stack (look, then shuffle) for Q3112.

/**
 * ＜Alliance＞ opens a prompt on every attack QueenBeemon declares. Nothing else in the turn
 * proceeds until the attacking seat answers, so tests that keep playing after an attack pass
 * on it explicitly (`respondAlliance` with no ally is the public "no thanks").
 */
async function passAlliance(s: ReturnType<typeof setupEngine>, seat: 0 | 1): Promise<void> {
  const outstanding = (): boolean =>
    s.events.filter((event) => event.kind === "alliancePrompt").length >
    s.events.filter((event) => event.kind === "allianceResolved").length;
  for (let round = 0; round < 20 && !outstanding(); round += 1) await settle();
  if (!outstanding()) return;
  expect(s.engine.applyIntent(seat, { type: "respondAlliance" })).toEqual({ ok: true });
  await settle();
}

const inertSecurity = ["BT1-009", "BT1-013", "BT1-012"];
const inertDeck = ["BT1-009", "BT1-013", "BT1-012", "BT1-014", "BT1-027", "BT1-028"];

describe("BT19-053 QueenBeemon", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT19-053")).toMatchObject({
      cardId: "BT19-053",
      nameEn: "QueenBeemon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      types: ["Cyborg", "X Antibody", "Royal Base", "LIBERATOR", "Insectoid"],
      evoCosts: [
        { color: "Green", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
    });
    expect(getCardDefinition("BT19-053")!.inheritedEffectText).toBeUndefined();
    const printed = getCardDefinition("BT19-053")!.effectText!.replace(/ /g, " ");
    expect(printed).toContain("[Digivolve]Lv.5 w/[Royal Base] trait: Cost 3");
    expect(printed).toContain("＜Alliance＞");
    expect(printed).toContain(
      "[When Attacking] [Once Per Turn] You may play 1 [Royal Base] trait Digimon card from your face-up security cards with the play cost reduced by 8.",
    );
    expect(printed).toContain(
      "[All Turns] When any of your [Royal Base] trait Digimon would leave the battle area other than in battle, you may place those Digimon face-up at the bottom of your security stack.",
    );
    expect(printed).toContain("[Rule] Trait: Has the [Insectoid] type.");
    expect(digivolutionRequirementsFor("BT19-053")).toContainEqual({
      level: 5,
      traits: ["Royal Base"],
      cost: 3,
      isAlternate: true,
    });
  });

  it("digivolves from a Lv.5 [Royal Base] source for 3 and carries ＜Alliance＞ and [Insectoid]", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-052", as: "cannon", under: ["BT18-044", "BT18-046"] }],
        hand: [{ card: "BT19-053", as: "queen" }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...inertDeck],
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 5;
    await s.ready();
    const stackIds = [s.perm("cannon").stack[0]!.instanceId, s.perm("cannon").stack[1]!.instanceId];
    const cannonId = s.inst("cannon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cannon").permanentId,
        instanceId: s.inst("queen").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("cannon").topCard?.cardId === "BT19-053");

    expect(s.state.memory).toBe(2);
    expect(s.perm("cannon").stack.map((card) => card.instanceId)).toEqual([...stackIds, cannonId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("cannon"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("cannon"), "Insectoid")).toBe(true);
    assertNoLoudGap(s);
  });

  it("refuses the [Royal Base] route for a Green Lv.5 near miss, which still digivolves by colour for 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-076", as: "megaKabuterimon" }],
        hand: [{ card: "BT19-053", as: "queen" }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...inertDeck],
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("megaKabuterimon").permanentId,
        instanceId: s.inst("queen").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("megaKabuterimon").permanentId,
        instanceId: s.inst("queen").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("megaKabuterimon").topCard?.cardId === "BT19-053");

    expect(s.state.memory).toBe(1);
    expect(s.perm("megaKabuterimon").stack.map((card) => card.cardId)).toEqual(["BT1-076"]);
    assertNoLoudGap(s);
  });

  it("refuses an illegal source: a Red Lv.5 without the [Royal Base] trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-022", as: "garudamon" }],
        hand: [{ card: "BT19-053", as: "queen" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("garudamon").permanentId,
        instanceId: s.inst("queen").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }).ok,
    ).toBe(false);
    await settle();

    expect(s.perm("garudamon").topCard?.cardId).toBe("BT1-022");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-053"]);
  });

  it("[When Attacking] plays a face-up [Royal Base] security card with its play cost reduced by 8", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-053", as: "queen" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          security: [{ card: "BT19-053", as: "secondQueen", faceUp: true }, ...inertSecurity],
        },
        1: { hand: [{ card: "BT1-009", as: "spare1" }], deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const playedInstanceId = s.inst("secondQueen").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("queen").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    // Play cost 12 reduced by 8 = 4 memory, not "free" and not the full 12.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === playedInstanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(inertSecurity);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[When Attacking] ignores a face-up non-[Royal Base] card and a face-down [Royal Base] card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-053", as: "queen" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          security: [
            // Near miss: Green [Insectoid], face up, but no [Royal Base] trait.
            { card: "BT1-066", faceUp: true },
            // Right trait, wrong face.
            { card: "BT19-052", faceUp: false },
            ...inertSecurity,
          ],
        },
        1: { hand: [{ card: "BT1-009", as: "spare1" }], deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("queen").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-053"]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(securityBefore);
    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[When Attacking] fires once per turn and refreshes on my next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-053", as: "queen" }],
          hand: [
            { card: "BT9-100", as: "scissor" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: inertDeck,
          security: [
            { card: "BT19-052", as: "vespaA", faceUp: true },
            { card: "BT19-052", as: "vespaB", faceUp: true },
            ...inertSecurity,
          ],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "prey", suspended: true }],
          hand: [{ card: "BT1-009", as: "spare1" }],
          deck: inertDeck,
          security: ["BT1-012", "BT1-012", "BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("queen").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    // Vespamon's play cost 8 reduced by 8 costs nothing.
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.security.filter((card) => card.cardId === "BT19-052")).toHaveLength(1);
    await passAlliance(s, 0);

    // A second attack in the SAME turn, reached publicly through BT9-100.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scissor").instanceId })).toEqual({
      ok: true,
    });
    await passAlliance(s, 0);
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.security.filter((card) => card.cardId === "BT19-052")).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    // My next turn: the second face-up Vespamon can now be played.
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("queen").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.every((card) => card.cardId !== "BT19-052"));
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT19-052")).toHaveLength(2);
    await passAlliance(s, 0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q3106: the Digimon played by [When Attacking] can be chosen as the ＜Alliance＞ ally", async () => {
    // The ＜Alliance＞ DP bonus lasts only until the end of the battle, so it is sampled from
    // inside the engine's own call stack rather than read back after the flow settles.
    let live: ReturnType<typeof setupEngine> | undefined;
    const queenDp: number[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-053", as: "queen" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          security: [{ card: "BT19-052", as: "vespa", faceUp: true }, ...inertSecurity],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "prey", suspended: true }],
          hand: [{ card: "BT1-009", as: "spare1" }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent: () => {
          const queen = live?.state.players[0]?.battleArea.find(
            (permanent) => permanent.topCard?.cardId === "BT19-053",
          );
          if (queen !== undefined) queenDp.push(queen.currentDP);
        },
      },
    );
    live = s;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("queen").permanentId,
        target: { kind: "permanent", permanentId: s.perm("prey").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"), 3000);

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT19-052")!;
    expect(played).toBeDefined();
    const prompt = s.events.find((event) => event.kind === "alliancePrompt") as
      | Extract<ServerEvent, { kind: "alliancePrompt" }>
      | undefined;
    expect(prompt?.eligibleAllyIds).toContain(played.permanentId);

    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: played.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => played.isSuspended, 3000);
    expect(played.isSuspended).toBe(true);
    // 12000 + Vespamon's 8000 DP for the duration of this battle.
    expect(Math.max(...queenDp)).toBe(20_000);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q3107/Q3108: places every simultaneously deleted [Royal Base] Digimon, itself included, face up at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          // dp is a fixture knob so the opponent's DP-limited mass deletion reaches
          // QueenBeemon too; the clause itself does not read DP.
          battleArea: [
            { card: "BT19-053", as: "queen", dp: 4000 },
            { card: "BT19-045", as: "royal" },
            { card: "BT1-066", as: "nearMiss" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-013", as: "secBottom" },
          ],
        },
        1: {
          hand: [
            { card: "BT2-018", as: "metalGreymon" },
            { card: "BT1-009", as: "spare1" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const queenInstanceId = s.perm("queen").topCard!.instanceId;
    const royalInstanceId = s.perm("royal").topCard!.instanceId;
    const nearMissInstanceId = s.perm("nearMiss").topCard!.instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 11;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("metalGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    const security = s.state.players[0]!.security;
    expect(security.map((card) => card.instanceId).slice(0, 2)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secBottom").instanceId,
    ]);
    // Both [Royal Base] Digimon, QueenBeemon included, at the bottom and face up.
    expect(
      security
        .slice(2)
        .map((card) => card.instanceId)
        .sort(),
    ).toEqual([queenInstanceId, royalInstanceId].sort());
    expect(security.slice(2).every((card) => card.faceUp)).toBe(true);
    // The near miss has no [Royal Base] trait: it goes to the trash like any deletion.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([nearMissInstanceId]);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it('declining the [All Turns] "you may" sends the deleted Digimon to the trash instead', async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-053", as: "queen", dp: 4000 },
            { card: "BT19-045", as: "royal" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          security: [{ card: "BT1-009", as: "secTop" }],
        },
        1: {
          hand: [
            { card: "BT2-018", as: "metalGreymon" },
            { card: "BT1-009", as: "spare1" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const queenInstanceId = s.perm("queen").topCard!.instanceId;
    const royalInstanceId = s.perm("royal").topCard!.instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 11;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("metalGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("secTop").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [queenInstanceId, royalInstanceId].sort(),
    );

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not replace a battle deletion — QueenBeemon goes to the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-053", as: "queen" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          // 20000 DP so the battle deletes QueenBeemon outright.
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }],
          hand: [{ card: "BT1-009", as: "spare1" }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const queenInstanceId = s.perm("queen").topCard!.instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Attacking suspends QueenBeemon, so she is a legal attack target next turn.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("queen").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await passAlliance(s, 0);
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    const securityBefore = s.state.players[0]!.security.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.state.players[0]!.battleArea[0]!.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([queenInstanceId]);
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q3109/Q3110/Q3111: a placed card is a working face-up security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // Only Vespamon is within the opponent's 4000 DP deletion window.
            { card: "BT19-052", as: "vespa", dp: 4000 },
            { card: "BT19-053", as: "queen", dp: 20_000 },
            { card: "BT19-045", as: "survivor", dp: 20_000 },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          // Empty on purpose: the placed card becomes the only security card, so the
          // opponent's next check has to run on a face-up card (Q3110).
          security: [],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker" }],
          hand: [
            { card: "BT2-018", as: "metalGreymon" },
            { card: "BT1-009", as: "spare1" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const vespaInstanceId = s.perm("vespa").topCard!.instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // Baseline on the opponent's turn, before anything is placed.
    expect(observe(s.engine).hasKeyword(s.perm("survivor"), "Blocker")).toBe(false);

    s.state.memory = 11;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("metalGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);

    // Q3109: the placed card is a face-up security card and stays revealed.
    const placed = s.state.players[0]!.security[0]!;
    expect(placed.instanceId).toBe(vespaInstanceId);
    expect(placed.faceUp).toBe(true);

    // Q3111: BT19-052's own "[Security] [Opponent's Turn]" clause now works from security —
    // the placed card is a fully functional face-up security card, not an inert token.
    await settle(() => observe(s.engine).hasKeyword(s.perm("survivor"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("survivor"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("queen"), "Blocker")).toBe(true);

    // Q3110: the check on that face-up card is an ordinary security check — Vespamon's
    // 8000 DP beats the 5000 DP attacker, so the attacker is deleted and the checked card
    // goes to my trash exactly as a face-down security Digimon would.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // The Blocker grant this test just proved opens a real block window; decline it so the
    // attack reaches the security check.
    await settle();
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(vespaInstanceId);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-013");
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q3112: searching the security stack turns a placed face-up card face down", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-053", as: "queen" }],
          hand: [
            { card: "EX3-029", as: "searcher" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: inertDeck,
          security: [{ card: "BT19-052", as: "faceUpCard", faceUp: true }, ...inertSecurity],
        },
        1: { hand: [{ card: "BT1-009", as: "spare1" }], deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    expect(s.state.players[0]!.security.some((card) => card.faceUp)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("searcher").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();

    expect(s.state.players[0]!.security.every((card) => !card.faceUp)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q3099/Q5304: after ForgeBeemon saves them, QueenBeemon may still place the affected Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-053", as: "queen", dp: 4000 },
            { card: "BT19-048", as: "forge" },
            { card: "BT19-045", as: "royal" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          security: [{ card: "BT1-009", as: "secTop" }],
        },
        1: {
          hand: [
            { card: "BT2-018", as: "metalGreymon" },
            { card: "BT1-009", as: "spare1" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["BT19-048"] },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 11;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("metalGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    // ForgeBeemon paid first: it placed itself as the face-up bottom security card and the
    // other [Royal Base] Digimon did not leave. QueenBeemon's [All Turns] then activates and
    // may still place every Digimon the deletion effect affected — herself included — face
    // up at the bottom. Nothing reaches the trash.
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual([
      "BT1-009",
      "BT19-048",
      "BT19-053",
      "BT19-045",
    ]);
    expect(s.state.players[0]!.security.slice(1).every((card) => card.faceUp)).toBe(true);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
