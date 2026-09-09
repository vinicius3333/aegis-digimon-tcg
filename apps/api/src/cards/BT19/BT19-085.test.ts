import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type BoardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// BT19-085 Henry Wong — Green Tamer, play cost 3.
//   [Start of Your Main Phase] If you have a Digimon with [Terriermon]/[Gargomon]/[Rapidmon]
//     in its name, gain 1 memory.
//   [All Turns] When any of your Digimon digivolve into a green Digimon, by suspending this
//     Tamer, suspend 1 of your opponent's Digimon.
//   [Security] Play this card without paying the cost.
//
// KB: `node tools/kb/query.mjs card BT19-085` returns "(no knowledge-base entries)" — this
// card has no Q&A, confirmed with the KB tool rather than assumed.
//
// Fixture vocabulary (every name hit is an INERT printing, so the only memory gain in a
// Start-of-Main window is Henry's own):
//   BT3-048 Gargomon   — Green Lv.4, no effect text. Name hit.
//   BT3-052 Rapidmon   — Green Lv.5, no effect text. Name hit.
//   BT3-057 MegaGargomon — Green Lv.6, prints only [When Digivolving]. SUBSTRING name hit
//     ("Gargomon" inside "MegaGargomon"); the clause says "in its name", so substring is
//     the printed gate, not `namesExact`.
//   BT1-064 Goblimon / BT1-065 Mushroomon — inert Green Lv.3/Lv.3, carry none of the three
//     names: the name near-misses.
//   BT1-009 Monodramon / BT1-013 Muchomon / BT1-014 Kokatorimon — inert RED main-deck
//     Digimon: deck/security padding and the non-green digivolution near-miss.
// No Digi-Egg is seeded in any deck or security stack.

const inertSecurity = ["BT1-009", "BT1-013", "BT1-012"];
const inertDeck = ["BT1-009", "BT1-013", "BT1-012", "BT1-014"];

const battleAreaCardIds = (s: EngineSetup, seat: 0 | 1): (string | undefined)[] =>
  s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId);

describe("BT19-085 Henry Wong — catalog and IR", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-085")).toMatchObject({
      cardId: "BT19-085",
      nameEn: "Henry Wong",
      colors: ["Green"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      maxCountInDeck: 4,
      // The catalog stores a NON-BREAKING SPACE (U+00A0) after "[Rapidmon]"; the official
      // printing uses an ordinary space. Recorded as a catalog discrepancy, not edited.
      effectText:
        "[Start of Your Main Phase] If you have a Digimon with [Terriermon]/[Gargomon]/[Rapidmon] in its name, gain 1 memory.\n[All Turns] When any of your Digimon digivolve into a green Digimon, by suspending this Tamer, suspend 1 of your opponent's Digimon.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
  });

  it("compiles the three printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-085");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    // `match: "name"` (substring) is CORRECT here: the printed gate is "in its name", not a
    // bare bracketed `[Name]` reference, so MegaGargomon must satisfy it.
    // The watcher is `AllTurns`, matching the printed `[All Turns]` — not `Static`.
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            condition: {
              kind: "youHave",
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Terriermon", "Gargomon", "Rapidmon"], match: "name" }],
              },
            },
          },
        ],
      },
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOneOfYoursDigivolves",
            // The subject of `whenOneOfYoursDigivolves` is the RESULTING permanent, so this
            // filter is the printed "into a green Digimon" gate.
            sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Green"] },
            actions: [
              {
                kind: "Suspend",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
                optional: true,
              },
            ],
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

describe("BT19-085 Henry Wong — play cost", () => {
  it("costs 3 memory from a public play, with no reduction printed", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-085", as: "henry" }], deck: [...inertDeck], security: [...inertSecurity] },
        1: { deck: [...inertDeck], security: [...inertSecurity] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("henry").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.inst("henry").instanceId,
    ]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

describe("BT19-085 Henry Wong — [Start of Your Main Phase] gain 1 memory", () => {
  it.each([
    ["BT3-048", "Gargomon (exact printed name)"],
    ["BT3-052", "Rapidmon (exact printed name)"],
    ["BT3-057", "MegaGargomon (SUBSTRING of [Gargomon], the printed 'in its name' gate)"],
  ])("gains exactly 1 memory inside the open Main phase with %s — %s", async (nameHit) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-085", as: "henry" },
            { card: nameHit, as: "hit" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: { deck: [...inertDeck], security: [...inertSecurity] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.memory === 1);

    // Read INSIDE the open Main phase: after the phase passes, memory is the post-pass value
    // and would prove nothing.
    expect(s.state.memory).toBe(1);
    expect(s.perm("henry").isSuspended).toBe(false);
    expect(battleAreaCardIds(s, 0)).toEqual(["BT19-085", nameHit]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("gains no memory when only name near-misses (Goblimon, Mushroomon) are in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-085", as: "henry" },
            { card: "BT1-064", as: "goblimon" },
            { card: "BT1-065", as: "mushroomon" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: { deck: [...inertDeck], security: [...inertSecurity] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.perm("henry").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not count the OPPONENT's Gargomon (the condition is controller-scoped)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-085", as: "henry" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: {
          battleArea: [{ card: "BT3-048", as: "theirGargomon" }],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle();

    expect(s.state.memory).toBe(0);
    expect(battleAreaCardIds(s, 1)).toEqual(["BT3-048"]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-085 Henry Wong — [All Turns] green digivolution watcher", () => {
  // Seat 0: Henry + Goblimon (Green Lv.3) as the digivolution base. Seat 1 holds one
  // unsuspended Digimon (the only legal suspend target) so the "your opponent's Digimon"
  // scope is provable, plus inert security so the digivolve does not trip a win check.
  const greenBoard = (opts?: { base?: string; into?: string }): BoardSpec => ({
    0: {
      battleArea: [
        { card: "BT19-085", as: "henry" },
        { card: opts?.base ?? "BT1-064", as: "base" },
      ],
      hand: [{ card: opts?.into ?? "BT3-048", as: "into" }],
      deck: [...inertDeck],
      security: [...inertSecurity],
    },
    1: {
      battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }],
      deck: [...inertDeck],
      security: [...inertSecurity],
    },
  });

  it("suspends Henry and 1 opponent Digimon when a green Digimon is digivolved into", async () => {
    const s = setupEngine(greenBoard(), { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 5;
    await s.ready();
    const baseInstance = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("into").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victim").isSuspended);

    // The digivolution really happened, with a real stack: Goblimon sits UNDER Gargomon.
    expect(s.perm("base").topCard?.instanceId).toBe(s.inst("into").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstance]);
    // Cost paid: Henry is suspended. Payload: exactly the opponent's Digimon is suspended.
    expect(s.perm("henry").isSuspended).toBe(true);
    expect(s.perm("victim").isSuspended).toBe(true);
    // The controller's own Digimon is never a candidate ("your opponent's Digimon").
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining the optional leaves both Henry and the opponent's Digimon unsuspended", async () => {
    const s = setupEngine(greenBoard(), { autoDeclineOptional: true, autoSelectCards: true });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("into").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT3-048");

    expect(s.perm("henry").isSuspended).toBe(false);
    expect(s.perm("victim").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does NOT fire when the Digimon digivolves into a NON-green Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-085", as: "henry" },
            // Red Lv.3 base + red Lv.4 result: a real, legal digivolution with no green in it.
            { card: "BT1-009", as: "base" },
          ],
          hand: [{ card: "BT1-014", as: "into" }],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("into").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT1-014");

    // FAILS-WHEN-REVERTED (colors gate): dropping `colors: ["Green"]` fires here too.
    expect(s.perm("henry").isSuspended).toBe(false);
    expect(s.perm("victim").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("is unusable a second time in the same turn: an already-suspended Henry cannot pay again", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-085", as: "henry" },
            { card: "BT1-064", as: "base" },
            { card: "BT1-065", as: "secondBase" },
          ],
          hand: [
            { card: "BT3-048", as: "into" },
            { card: "BT3-048", as: "secondInto" },
          ],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim", dp: 3000 },
            { card: "BT1-013", as: "secondVictim", dp: 5000 },
          ],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("into").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("henry").isSuspended);
    const suspendedAfterFirst = s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended).length;
    expect(suspendedAfterFirst).toBe(1);

    // Second green digivolution in the same turn: the suspend cost can no longer be paid.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("secondBase").permanentId,
        instanceId: s.inst("secondInto").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondBase").topCard?.cardId === "BT3-048");

    expect(s.perm("henry").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resets on the controller's next own turn: Henry unsuspends and the watcher pays again", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-085", as: "henry", suspended: true },
            { card: "BT1-064", as: "base" },
          ],
          hand: [
            { card: "BT3-048", as: "into" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(s.perm("henry").isSuspended).toBe(true);

    // Drive the real turn loop into seat 0's Main phase: the unsuspend step stands Henry up.
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("henry").isSuspended).toBe(false);

    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("into").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victim").isSuspended);

    expect(s.perm("henry").isSuspended).toBe(true);
    expect(s.perm("victim").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-085 Henry Wong — [Security] play without paying the cost", () => {
  it("plays itself for free out of a REAL security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: {
          security: [{ card: "BT19-085", as: "henry" }, "BT1-009"],
          deck: [...inertDeck],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-085"));

    // The Tamer left security and stands on its OWNER's board; nothing was paid for it.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.inst("henry").instanceId,
    ]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
