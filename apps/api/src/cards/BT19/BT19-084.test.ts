import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// Fixture vocabulary.
// BT1-064 Goblimon: inert Green Lv.3, 3000 DP — the digivolve source on the battle area.
// BT1-071 Vegiemon: inert Green Lv.4, 6000 DP, evo cost Green Lv.3 for 1 — the Digimon card
//   parked in FACE-UP security that the [Main] clause digivolves into.
// BT19-045 FunBeemon: Green/Black Lv.3 with the [Royal Base] trait — the placement hit.
// BT1-065 Mushroomon: inert Green Lv.3 WITHOUT [Royal Base] — the trait near-miss that must
//   never be placed.
// BT18-004 Puroromon: its INHERITED [Start of Your Main Phase] clause places a [Royal Base]
//   Digimon face up as the bottom security card — the Q3146 simultaneous-trigger partner.
// BT1-009 Monodramon / BT1-013 Muchomon: inert Red Lv.3 main-deck Digimon — deck and security
//   padding (no Digi-Egg may sit in either zone).
const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

/** The [Main] activated ability's public effect key on this Tamer. */
function mainEffectKey(s: EngineSetup, alias: string): string {
  const entries = JSON.parse(s.perm(alias).activatableEffectsJson || "[]") as { effectKey: string }[];
  expect(entries.length).toBeGreaterThan(0);
  return entries[0]!.effectKey;
}

function activateMain(s: EngineSetup, alias: string) {
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.perm(alias).topCard!.instanceId,
    effectKey: mainEffectKey(s, alias),
  });
}

describe("BT19-084 Winr — catalog", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-084")).toMatchObject({
      cardId: "BT19-084",
      nameEn: "Winr",
      colors: ["Green"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      types: ["LIBERATOR"],
      maxCountInDeck: 4,
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    // Catalog discrepancy (reported, not edited): the record stores U+00A0 NO-BREAK SPACE
    // after "[Royal Base]" where the printed card has a plain space. Also note the printed
    // typo the catalog faithfully carries: "as your the bottom security card".
    const printed = getCardDefinition("BT19-084")!.effectText!;
    expect(printed).toContain("\u00a0");
    expect(printed.replace(/\u00a0/g, " ")).toBe(
      "[Start of Your Main Phase] If you have a face-up security card, gain 1 memory.\n[Main] By suspending this Tamer, 1 of your Digimon may digivolve into a Digimon card in your face-up security cards. If this effect digivolved, you may place 1 Digimon card with the [Royal Base] trait from your hand face-up as your the bottom security card.",
    );
  });

  it("compiles the three printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-084");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            // `zone: "security"` + `faceUp: true` is read by the loose-zone branch of
            // `countMatching` (interpreter/scaling.ts:58-66); the battle-area default would
            // count permanents and never see a security card.
            condition: { kind: "youHave", filter: { zone: "security", faceUp: true } },
          },
        ],
      },
      {
        trigger: "Main",
        optional: true,
        actions: [
          {
            kind: "Digivolve",
            from: ["security"],
            payCost: true,
            cost: { kind: "suspend" },
          },
          {
            kind: "SecurityManipulation",
            op: "placeAsSecurity",
            from: ["hand"],
            toTop: false,
            faceUp: true,
            optional: true,
            // "with the [Royal Base] trait" is the EXACT trait form, not a substring gate.
            source: { filter: { nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }] }, count: 1, upTo: true },
            condition: { kind: "ifThisEffectDigivolved" },
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, isSelf: true }, payCost: false }],
      },
    ]);
  });
});

describe("BT19-084 Winr — [Start of Your Main Phase] face-up security memory", () => {
  it("gains 1 memory only when a face-up security card is there, read inside the open Main phase", async () => {
    const readings: number[] = [];
    for (const faceUp of [true, false]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT19-084", as: "winr" }],
            hand: [{ card: "BT1-009", as: "spare" }],
            deck: [...FILLER],
            security: [{ card: "BT1-009", faceUp }, "BT1-013"],
          },
          1: { deck: [...FILLER], security: [...SECURITY] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const loop = s.engine.startTurnLoop();
      // Read the memory WHILE our Main phase is open: after the turn hands over, the
      // post-pass value would prove nothing.
      await advance(s.engine).waitForMainPhase(0);
      await s.ready();
      readings.push(s.state.memory);

      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
    // Identical boards apart from the security card's orientation: the face-up run is +1.
    expect(readings[0]).toBe(readings[1]! + 1);
  });

  it("resolves alongside BT18-004 Puroromon's inherited placement so the memory clause sees it (Q3146)", async () => {
    // Both [Start of Your Main Phase] clauses trigger with NO face-up security card present.
    // Q3146: Puroromon's placement may resolve first, and Winr's clause then finds the face-up
    // card it created and gains the memory. The control run gives Puroromon nothing to place
    // (a Green Digimon WITHOUT [Royal Base] in hand), so no face-up card ever exists.
    const readings: number[] = [];
    for (const inHand of ["BT19-045", "BT1-065"]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT19-084", as: "winr" },
              { card: "BT1-064", as: "eggHost", under: ["BT18-004"] },
            ],
            hand: [
              { card: inHand, as: "placeable" },
              { card: "BT1-009", as: "spare" },
            ],
            deck: [...FILLER],
            security: ["BT1-009", "BT1-013"],
          },
          1: { deck: [...FILLER], security: [...SECURITY] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      await s.ready();
      readings.push(s.state.memory);

      const placed = inHand === "BT19-045";
      expect(s.state.players[0]!.security.at(-1)!.faceUp).toBe(placed);
      // Placed => the [Royal Base] card is the bottom security card; not placed => it stayed in hand.
      expect(s.state.players[0]!.security.at(-1)!.cardId === inHand).toBe(placed);
      expect(s.state.players[0]!.hand.some((card) => card.cardId === inHand)).toBe(!placed);

      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
    // Puroromon's placement first => Winr's condition holds when it resolves: +1 over the control.
    expect(readings[0]).toBe(readings[1]! + 1);
  });
});

describe("BT19-084 Winr — [Main] digivolve into a face-up security Digimon", () => {
  it("suspends the Tamer, digivolves out of face-up security and places a [Royal Base] card at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-084", as: "winr" },
            { card: "BT1-064", as: "source" },
          ],
          hand: [
            { card: "BT19-045", as: "royalBase" },
            { card: "BT1-065", as: "traitMiss" },
          ],
          deck: [...FILLER],
          security: [{ card: "BT1-071", as: "securityDigimon", faceUp: true }, "BT1-013"],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    const sourceInstanceId = s.inst("source").instanceId;
    const memoryBefore = s.state.memory;

    expect(activateMain(s, "winr")).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard!.instanceId === s.inst("securityDigimon").instanceId);

    // The digivolve really happened out of security: Vegiemon on top of the Goblimon it came from.
    expect(s.perm("source").topCard!.instanceId).toBe(s.inst("securityDigimon").instanceId);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
    expect(s.perm("source").currentDP).toBe(6000);
    // Vegiemon's printed evolution cost off a Green Lv.3 is 1; the suspend is the effect's cost.
    expect(s.state.memory).toBe(memoryBefore - 1);
    expect(s.perm("winr").isSuspended).toBe(true);

    // The [Royal Base] card was placed FACE UP as the BOTTOM security card; the near-miss stayed.
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-013", "BT19-045"]);
    expect(s.state.players[0]!.security.at(-1)!.instanceId).toBe(s.inst("royalBase").instanceId);
    expect(s.state.players[0]!.security.at(-1)!.faceUp).toBe(true);
    // The digivolution draw put the deck's top card in hand; the trait near-miss never moved.
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-065", "BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not treat a FACE-DOWN security Digimon as a source, so the [Main] clause is not offered", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-084", as: "winr" },
            { card: "BT1-064", as: "source" },
          ],
          hand: [
            { card: "BT19-045", as: "royalBase" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...FILLER],
          // Same board as the success case except the Vegiemon is face DOWN.
          security: [{ card: "BT1-071", as: "securityDigimon", faceUp: false }, "BT1-013"],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    const sourceInstanceId = s.inst("source").instanceId;
    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);

    // `runDigivolve` drops face-down security candidates, so no route exists and the ability
    // is not activatable at all (interpreter/actions/digivolve.ts:186/254, `faceDownSecurityOk`).
    expect(JSON.parse(s.perm("winr").activatableEffectsJson || "[]")).toEqual([]);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("winr").topCard!.instanceId,
        effectKey: "main-0",
      }).ok,
    ).toBe(false);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("source").topCard!.instanceId).toBe(sourceInstanceId);
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.perm("winr").isSuspended).toBe(false);
    // The tail is gated on the digivolve, so the [Royal Base] card is still in hand.
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT19-045"]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(securityBefore);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("refuses a second activation while the Tamer is suspended and allows one again next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-084", as: "winr" },
            { card: "BT1-064", as: "source" },
            { card: "BT1-065", as: "secondSource" },
          ],
          hand: [
            { card: "BT19-045", as: "royalBase" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...FILLER],
          security: [
            { card: "BT1-071", as: "firstTarget", faceUp: true },
            { card: "BT1-071", as: "secondTarget", faceUp: true },
            "BT1-013",
          ],
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    const effectKey = mainEffectKey(s, "winr");
    expect(activateMain(s, "winr")).toEqual({ ok: true });
    await settle(() => s.perm("winr").isSuspended);
    expect(s.perm("winr").isSuspended).toBe(true);

    // Same turn: the suspend cost cannot be paid again, so the second source is untouched.
    const secondSourceInstanceId = s.inst("secondSource").instanceId;
    expect(JSON.parse(s.perm("winr").activatableEffectsJson || "[]")).toEqual([]);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("winr").topCard!.instanceId,
        effectKey,
      }).ok,
    ).toBe(false);
    expect(s.perm("secondSource").topCard!.instanceId).toBe(secondSourceInstanceId);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    // The opponent's whole turn runs through the real loop; the Tamer stays suspended.
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("winr").isSuspended).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    // Our own unsuspend phase stood it back up: the [Main] clause is payable again.
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.perm("winr").isSuspended).toBe(false);
    expect(activateMain(s, "winr")).toEqual({ ok: true });
    await settle(() => s.perm("winr").isSuspended);
    expect(s.perm("secondSource").topCard!.cardId).toBe("BT1-071");
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-084 Winr — [Security] play without paying the cost", () => {
  it("plays itself for free out of a real security check on a FACE-UP security card (Q3147/Q3148/Q3149)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          // Q3147: a card placed face up in the security stack stays revealed there.
          security: [{ card: "BT19-084", as: "winr", faceUp: true }, "BT1-009"],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.state.players[1]!.security[0]!.faceUp).toBe(true);
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // Q3148/Q3149: the check runs on the revealed card and its [Security] effect still fires.
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-084"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.inst("winr").instanceId,
    ]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
    // Played without paying: no memory moved for the Tamer's cost of 3.
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
