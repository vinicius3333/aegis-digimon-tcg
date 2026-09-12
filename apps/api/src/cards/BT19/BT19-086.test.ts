import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

// BT19-086 Ryo Akiyama — Black Tamer, play cost 3.
//   [Start of Your Main Phase] By placing 1 Option card with the [Device] trait FROM YOUR HAND
//     in the battle area, <Draw 1>
//   [Main] By suspending this Tamer and trashing 4 of your Option cards with the [Device] trait
//     in the battle area, you may play 1 [Cyberdramon] from your hand or trash without paying
//     the cost.
//   [Security] Play this card without paying the cost.
//
// KB Q3151 (2024-09-20): "Can I use this card's [Main] effect to trash Option cards in the
// battle area, but then choose to not play [Cyberdramon]?" — "Yes, you can." The play is
// therefore `optional: true` even though it follows a paid "by ..." condition.
//
// Fixture vocabulary:
//   P-155 Pawn Device — Red Option, [Device] trait, cost 2. Prints NO
//     "when this card is trashed in your battle area" clause, so three of them are silent
//     payment fodder. Four copies is a legal deck count (maxCountInDeck 4).
//   BT19-095 Knight Device — Green Option, [Device] trait. Prints
//     "When this card is trashed in your battle area, 1 of your Digimon gains <Piercing> and
//     gets +4000 DP for the turn" (a `whenTrashedFromBattleArea` effect). It is the CONSEQUENCE
//     probe: the [Main] cost is a real battle-area trash, not a silent removal.
//   ST3-13 Heaven's Gate — Yellow Option with NO trait: the [Device] trait near-miss, both in
//     hand (placement cost) and in the battle area (trash cost).
//   EX3-050 Cyberdramon — Black Lv.5, NO printed effect text: the exact-name play target.
//   EX8-052 Cyberdramon (X Antibody) — the NAME near-miss: "Cyberdramon" is a substring of its
//     name, but the printed reference is the bracketed exact `[Cyberdramon]`.
//   BT1-009/BT1-013/BT1-012/BT1-014 — inert RED main-deck Digimon: deck and security padding
//     and the board Digimon the Knight Device grant lands on. No Digi-Egg is seeded anywhere.

const inertSecurity = ["BT1-009", "BT1-013", "BT1-012"];
const inertDeck = ["BT1-009", "BT1-013", "BT1-012", "BT1-014"];

const handCardIds = (s: EngineSetup, seat: 0 | 1 = 0): string[] =>
  s.state.players[seat]!.hand.map((card) => card.cardId).sort();

const battleAreaCardIds = (s: EngineSetup, seat: 0 | 1 = 0): (string | undefined)[] =>
  s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort();

const trashCardIds = (s: EngineSetup, seat: 0 | 1 = 0): string[] =>
  s.state.players[seat]!.trash.map((card) => card.cardId).sort();

/** Seat 0 with Ryo, four Devices and a Digimon; seat 1 padded so nothing trips a win check. */
const mainBoard = (opts?: { devices?: string[]; extraOptions?: string[]; hand?: string[]; trash?: string[] }) => ({
  0: {
    battleArea: [
      { card: "BT19-086", as: "ryo" },
      { card: "BT1-009", as: "host", dp: 3000 },
      ...(opts?.devices ?? ["P-155", "P-155", "P-155", "BT19-095"]).map((card, index) => ({
        card,
        as: `device${index}`,
      })),
      ...(opts?.extraOptions ?? []).map((card, index) => ({ card, as: `extra${index}` })),
    ],
    hand: (opts?.hand ?? ["EX3-050"]).map((card, index) => ({ card, as: `hand${index}` })),
    trash: (opts?.trash ?? []).map((card, index) => ({ card, as: `trash${index}` })),
    deck: [...inertDeck],
    security: [...inertSecurity],
  },
  1: { deck: [...inertDeck], security: [...inertSecurity] },
});

const activateRyo = (s: EngineSetup): { ok: boolean; reason?: string } => {
  const entries = JSON.parse(s.perm("ryo").activatableEffectsJson || "[]") as { effectKey: string }[];
  expect(entries.length).toBeGreaterThan(0);
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.perm("ryo").topCard!.instanceId,
    effectKey: entries[0]!.effectKey,
  }) as { ok: boolean; reason?: string };
};

describe("BT19-086 Ryo Akiyama — catalog and IR", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-086")).toMatchObject({
      cardId: "BT19-086",
      nameEn: "Ryo Akiyama",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      maxCountInDeck: 4,
      // The catalog stores NON-BREAKING SPACES (U+00A0) after both "[Device]" tokens; the
      // official printing uses ordinary spaces. Recorded as a catalog discrepancy, not edited.
      effectText:
        "[Start of Your Main Phase] By placing 1 Option card with the [Device] trait from your hand in the battle area, ＜Draw 1＞ \n[Main] By suspending this Tamer and trashing 4 of your Option cards with the [Device] trait in the battle area, you may play 1 [Cyberdramon] from your hand or trash without paying the cost.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
  });

  it("compiles the three printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-086");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          {
            kind: "Draw",
            controller: "mine",
            amount: 1,
            cost: {
              kind: "place",
              // "from your hand" — the hand is the ONLY legal source for this placement cost.
              target: {
                filter: {
                  zone: "hand",
                  controller: "mine",
                  kind: ["Option"],
                  nameOrTrait: [{ tokens: ["Device"], match: "trait" }],
                },
                count: 1,
                from: ["hand"],
              },
              destination: "battleArea",
            },
            optional: true,
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "CostGatedBlock",
            optional: true,
            cost: {
              kind: "compound",
              costs: [
                { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
                {
                  kind: "deleteOwn",
                  target: {
                    filter: {
                      controller: "mine",
                      zone: "battleArea",
                      kind: ["Option"],
                      nameOrTrait: [{ tokens: ["Device"], match: "trait" }],
                    },
                    count: 4,
                  },
                },
              ],
            },
            actions: [
              {
                // Bracketed `[Cyberdramon]` is an EXACT-name reference (`nameExact`), and the
                // play stays `optional` per KB Q3151.
                kind: "PlayWithoutCost",
                target: {
                  filter: { controller: "mine", nameOrTrait: [{ tokens: ["Cyberdramon"], match: "nameExact" }] },
                  count: 1,
                },
                from: ["hand", "trash"],
                payCost: false,
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

describe("BT19-086 Ryo Akiyama — play cost", () => {
  it("costs 3 memory from a public play, with no reduction printed", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-086", as: "ryo" }], deck: [...inertDeck], security: [...inertSecurity] },
        1: { deck: [...inertDeck], security: [...inertSecurity] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.inst("ryo").instanceId,
    ]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

describe("BT19-086 Ryo Akiyama — [Start of Your Main Phase] place a Device, draw 1", () => {
  it("places the Device from hand and draws, read inside the open Main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-086", as: "ryo" }],
          hand: [
            { card: "P-155", as: "device" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [{ card: "BT1-014", as: "drawn" }, ...inertDeck],
          security: [...inertSecurity],
        },
        1: { deck: [...inertDeck], security: [...inertSecurity] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    // Read INSIDE the open Main phase.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId).sort()).toEqual(
      [s.inst("ryo").instanceId, s.inst("device").instanceId].sort(),
    );
    // The drawn card is the one that was on top of the deck; the Device left the hand.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("spare").instanceId, s.inst("drawn").instanceId].sort(),
    );
    // The placement is the whole cost: no memory is spent for the Device's own play cost,
    // and the clause grants none of its own.
    expect(s.state.memory).toBe(0);
    expect(s.perm("ryo").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declining the optional keeps the Device in hand and draws nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-086", as: "ryo" }],
          hand: [
            { card: "P-155", as: "device" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [{ card: "BT1-014", as: "drawn" }, ...inertDeck],
          security: [...inertSecurity],
        },
        1: { deck: [...inertDeck], security: [...inertSecurity] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("spare").instanceId, s.inst("device").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("cannot pay with a Device sitting in the TRASH: the cost reads the hand only", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-086", as: "ryo" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          trash: [{ card: "P-155", as: "trashedDevice" }],
          deck: [{ card: "BT1-014", as: "drawn" }, ...inertDeck],
          security: [...inertSecurity],
        },
        1: { deck: [...inertDeck], security: [...inertSecurity] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle();

    // FAILS-WHEN-REVERTED (`from: ["hand"]` / `zone: "hand"`): a trash-sourced payment would
    // place the Device and draw here.
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("trashedDevice").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("cannot pay with a NON-[Device] Option in hand (Heaven's Gate)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-086", as: "ryo" }],
          hand: [
            { card: "ST3-13", as: "plainOption" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [{ card: "BT1-014", as: "drawn" }, ...inertDeck],
          security: [...inertSecurity],
        },
        1: { deck: [...inertDeck], security: [...inertSecurity] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle();

    // FAILS-WHEN-REVERTED (trait gate): dropping the [Device] trait filter places Heaven's Gate.
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("spare").instanceId, s.inst("plainOption").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-086 Ryo Akiyama — [Main] suspend + trash 4 Devices, play [Cyberdramon]", () => {
  it("pays both halves of the compound cost and plays Cyberdramon from hand for free", async () => {
    const s = setupEngine(mainBoard(), { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();
    const deviceInstances = [0, 1, 2, 3].map((n) => s.inst(`device${n}`).instanceId);

    expect(activateRyo(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX3-050"));

    // Cost half 1: the Tamer is suspended.
    expect(s.perm("ryo").isSuspended).toBe(true);
    // Cost half 2: all four Devices left the battle area and are in the trash, by instance id.
    expect(battleAreaCardIds(s)).toEqual(["BT1-009", "BT19-086", "EX3-050"]);
    for (const instanceId of deviceInstances) {
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === instanceId)).toBe(true);
    }
    // Payload: Cyberdramon is on the board and NOTHING was paid for it (play cost 6).
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("hand0").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("really TRASHES the Devices from the battle area: Knight Device's on-trash clause resolves", async () => {
    const s = setupEngine(mainBoard(), { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();
    const baseDP = s.perm("host").currentDP;

    expect(activateRyo(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX3-050"));

    // BT19-095 Knight Device prints "When this card is trashed in your battle area, 1 of your
    // Digimon gains <Piercing> and gets +4000 DP for the turn". Its resolution is the proof
    // that the cost is a real battle-area trash and not a silent removal.
    // Pinned by permanent identity: the only Digimon on the board while the cost is being
    // paid is `host`, so the grant cannot have landed anywhere else.
    expect(s.perm("host").currentDP).toBe(baseDP + 4000);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
  });

  it("KB Q3151: the cost is paid even when the controller declines to play Cyberdramon", async () => {
    const s = setupEngine(mainBoard(), { autoSelectCards: true, autoAcceptOptional: false });
    s.state.memory = 3;
    await s.ready();
    const deviceInstances = [0, 1, 2, 3].map((n) => s.inst(`device${n}`).instanceId);

    // Declaring Main commits its processing condition; only the trailing
    // Cyberdramon play remains optional (CR 15-8-4-4-1 / Q3151).
    expect(activateRyo(s)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.perm("ryo").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining(deviceInstances),
    );
    const playChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playChoice.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    // The cost was paid in full...
    expect(s.perm("ryo").isSuspended).toBe(true);
    for (const instanceId of deviceInstances) {
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === instanceId)).toBe(true);
    }
    // ... and Cyberdramon stayed in hand.
    expect(handCardIds(s)).toEqual(["EX3-050"]);
    expect(battleAreaCardIds(s)).toEqual(["BT1-009", "BT19-086"]);
  });

  it("plays Cyberdramon from the TRASH when the hand has none", async () => {
    const s = setupEngine(mainBoard({ hand: [], trash: ["EX3-050"] }), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    s.state.memory = 3;
    await s.ready();
    const cyberInstance = s.inst("trash0").instanceId;

    expect(activateRyo(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX3-050"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === cyberInstance)).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("does NOT play the name near-miss Cyberdramon (X Antibody)", async () => {
    const s = setupEngine(mainBoard({ hand: ["EX8-052"] }), { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();

    expect(activateRyo(s)).toEqual({ ok: true });
    await settle(() => s.perm("ryo").isSuspended);
    await settle(() => s.state.pendingDecision === undefined);

    // FAILS-WHEN-REVERTED (`nameExact`): a substring `match: "name"` gate would play it.
    expect(battleAreaCardIds(s)).toEqual(["BT1-009", "BT19-086"]);
    expect(handCardIds(s)).toEqual(["EX8-052"]);
    // The cost still resolved (the play is the optional part).
    expect(s.perm("ryo").isSuspended).toBe(true);
  });

  it("is unusable with only 3 Devices plus a non-[Device] Option in the battle area", async () => {
    const s = setupEngine(mainBoard({ devices: ["P-155", "P-155", "BT19-095"], extraOptions: ["ST3-13"] }), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    s.state.memory = 3;
    await s.ready();
    const before = battleAreaCardIds(s);

    // FAILS-WHEN-REVERTED (count 4 + [Device] trait gate): with the trait filter dropped the
    // fourth Option (Heaven's Gate) would complete the cost and the effect would be offered.
    expect(JSON.parse(s.perm("ryo").activatableEffectsJson || "[]")).toEqual([]);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("ryo").isSuspended).toBe(false);
    expect(battleAreaCardIds(s)).toEqual(before);
    expect(trashCardIds(s)).toEqual([]);
    expect(handCardIds(s)).toEqual(["EX3-050"]);
  });

  it("cannot be activated twice in the same turn: the suspend half is unpayable again", async () => {
    const s = setupEngine(
      mainBoard({
        devices: ["P-155", "P-155", "P-155", "P-155", "BT19-095", "BT19-095", "BT19-095", "BT19-095"],
        hand: ["EX3-050", "EX3-050"],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(activateRyo(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX3-050"));
    expect(s.perm("ryo").isSuspended).toBe(true);
    const afterFirst = battleAreaCardIds(s);
    expect(s.state.players[0]!.trash).toHaveLength(4);

    // Second activation in the same turn: the Tamer is already suspended, so the suspend half
    // of the compound cost is unpayable and the effect is no longer offered at all.
    expect(JSON.parse(s.perm("ryo").activatableEffectsJson || "[]")).toEqual([]);
    await settle(() => s.state.pendingDecision === undefined);

    expect(battleAreaCardIds(s)).toEqual(afterFirst);
    expect(s.state.players[0]!.trash).toHaveLength(4);
    expect(handCardIds(s)).toEqual(["EX3-050"]);
  });

  it("resets on the controller's next own turn: Ryo unsuspends and the effect pays again", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-086", as: "ryo", suspended: true },
            { card: "BT1-009", as: "host", dp: 3000 },
            { card: "P-155", as: "device0" },
            { card: "P-155", as: "device1" },
            { card: "P-155", as: "device2" },
            { card: "BT19-095", as: "device3" },
          ],
          hand: [
            { card: "EX3-050", as: "cyber" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: { deck: [...inertDeck], security: [...inertSecurity] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(s.perm("ryo").isSuspended).toBe(true);

    // Reach seat 0's real Main phase; the unsuspend step stands Ryo up. The hand holds no
    // [Device] Option, so the Start-of-Main clause cannot pay and only the [Main] activation
    // below moves the board.
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("ryo").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(6);

    expect(activateRyo(s)).toEqual({ ok: true });
    await settle(() => s.perm("ryo").isSuspended);

    expect(s.perm("ryo").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(4);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-086 Ryo Akiyama — [Security] play without paying the cost", () => {
  it("plays itself for free out of a REAL security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: {
          security: [{ card: "BT19-086", as: "ryo" }, "BT1-009"],
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
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-086"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.inst("ryo").instanceId,
    ]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
