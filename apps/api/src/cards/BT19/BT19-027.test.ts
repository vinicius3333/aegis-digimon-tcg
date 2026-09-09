import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-027.js";

// BT19-027 Ryugumon — Blue, Lv.6, DP 12000, play 12, [Digivolve] Blue Lv.5: Cost 4.
//   ＜Decode (Blue Lv.5)＞ (would leave the battle area other than in battle -> may play
//     1 Blue Level 5 Digimon card from ITS OWN digivolution cards, free — CR 16-36-1)
//   [When Digivolving] may play 1 level 4 or lower blue Digimon card from THIS Digimon's
//     digivolution cards without paying the cost.
//   [End of Your Turn] [Once Per Turn] By returning 1 of your Digimon to the bottom of the
//     deck, return 1 of your opponent's Digimon with level equal to or lower to the bottom.
//   [Rule] Trait: Has the [Aquatic] type. (Q3082)
//
// Fixture cards (all printed-text-free so nothing else can move the board):
//   BT2-027 Zudomon   Blue Lv.5 [Sea Beast]  — legal Decode payload / legal evolution source
//   BT1-033 Dolphmon  Blue Lv.4 [Sea Animal] — legal [When Digivolving] payload
//   BT1-014 Kokatorimon Red Lv.4             — near-miss: right level, wrong colour
//   BT1-037 Gorillamon  Blue Lv.4            — near-miss for Decode: right colour, wrong level
//   BT1-042 LoaderLeomon Blue Lv.5           — second legal evolution source
//   ST2-10  Plesiomon  Blue Lv.6, BT1-030 Gomamon Blue Lv.3 — opponent bounce candidates
//   BT1-009 Monodramon Red Lv.3              — inert deck/security filler (not a Digi-Egg)

const filler = ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"];

describe("BT19-027 Ryugumon", () => {
  it("compiles the printed clauses to the expected IR shape", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    // Decode is a keyword the board must be able to read, plus a real [All Turns]
    // would-leave replacement scoped to this Digimon's own stack (CR 16-36-1/16-36-2).
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Decode" }] });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["digivolutionCards"],
              payCost: false,
              playedByDecode: true,
              optional: true,
              target: { filter: { isSelfRef: true, colors: ["Blue"], levelComparison: { op: "eq", value: 5 } } },
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "EndOfYourTurn", frequency: "OncePerTurn" });
  });

  it("carries [Aquatic] and ＜Decode＞ itself without leaking either to a board peer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-027", as: "ryugu" },
          { card: "BT2-027", as: "peer" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("ryugu"), "Aquatic")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ryugu"), "Decode")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("peer"), "Aquatic")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("peer"), "Decode")).toBe(false);
  });

  it("digivolves from a real Blue Lv.5 source and plays only the blue Lv.4 under itself", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // Realistic stack: the Lv.5 source already sits on a Lv.4 pair.
            {
              card: "BT2-027",
              as: "base",
              under: [
                { card: "BT1-033", as: "dolphmon" },
                { card: "BT1-014", as: "kokatorimon" },
              ],
            },
            // A SECOND own stack that also holds a legal-looking blue Lv.4. Decode and the
            // [When Digivolving] play both read "this Digimon's digivolution cards", so this
            // card must stay put even though the selector is biased towards it.
            { card: "BT1-042", as: "decoy", under: [{ card: "BT1-037", as: "gorillamon" }] },
          ],
          hand: [
            { card: "BT19-027", as: "ryugu" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...filler],
          security: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: ["BT1-013"], deck: [...filler], security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("gorillamon").instanceId, s.inst("kokatorimon").instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ryugu").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    // Endpoint: Ryugumon on top of the real stack, Dolphmon in play as its own permanent.
    expect(s.perm("base").topCard?.cardId).toBe("BT19-027");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-014", "BT2-027"]);
    const played = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("dolphmon").instanceId,
    );
    expect(played?.topCard?.cardId).toBe("BT1-033");
    expect(played?.stack).toHaveLength(0);
    // Near-miss peers: the red Lv.4 stays buried, the other stack is untouched.
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-014")).toBe(false);
    expect(s.perm("decoy").stack.map((card) => card.cardId)).toEqual(["BT1-037"]);
    // Memory: only the printed Cost 4 was paid; the payload was free.
    expect(s.state.memory).toBe(6);
    // Hand: Ryugumon left, the digivolution bonus draw arrived, the spare stayed.
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-009"]);
    expect(s.state.players[0]!.deck).toHaveLength(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal digivolution source and leaves the board untouched", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-037", as: "blueLv4" },
          { card: "BT1-013", as: "redLv3" },
        ],
        hand: [{ card: "BT19-027", as: "ryugu" }],
        deck: [...filler],
        security: ["BT1-009", "BT1-009"],
      },
      1: { deck: [...filler], security: ["BT1-009", "BT1-009"] },
    });
    s.state.memory = 10;
    await s.ready();

    // Right colour, wrong level.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueLv4").permanentId,
        instanceId: s.inst("ryugu").instanceId,
      }).ok,
    ).toBe(false);
    // Wrong colour and wrong level.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redLv3").permanentId,
        instanceId: s.inst("ryugu").instanceId,
      }).ok,
    ).toBe(false);

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT1-037", "BT1-013"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-027"]);
    expect(s.state.memory).toBe(10);
  });

  it("returns itself at end of turn, Decodes a Blue Lv.5 from its own stack, then bottoms an opposing Lv.6 (Q3083, Q3085)", async () => {
    // Q3085's ordering claim: the ＜Decode＞ play happens WHEN THE CARD IS PLAYED, i.e. while
    // the [End of Your Turn] effect is still choosing the opponent's Digimon to return.
    let opponentBoardAtDecodePlay: string[] | undefined;
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT19-027",
              as: "ryugu",
              under: [
                { card: "BT1-037", as: "gorillamon" },
                { card: "BT2-027", as: "zudomon" },
              ],
            },
            // Another own stack holding a perfectly legal-looking Blue Lv.5. ＜Decode＞ plays
            // from THAT Digimon's digivolution cards (CR 16-36-1), so this one is off limits
            // even though the selector is biased towards it.
            { card: "BT1-038", as: "decoy", under: [{ card: "BT1-042", as: "loaderLeomon" }] },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [...filler],
          security: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "ST2-10", as: "lv6" }], deck: [...filler], security: ["BT1-009", "BT1-009"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds,
        onEvent: (event) => {
          if (event.kind === "cardPlayed" && event.cardId === "BT2-027") {
            opponentBoardAtDecodePlay = s.state.players[1]!.battleArea.map((p) => p.topCard!.cardId);
          }
        },
      },
    );
    // Pay the cost with Ryugumon itself (Q3083), and reach for the OTHER stack's Blue Lv.5
    // when ＜Decode＞ resolves.
    preferInstanceIds.push(s.perm("ryugu").topCard!.instanceId, s.inst("loaderLeomon").instanceId);
    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    // Ryugumon itself paid the cost and is on the bottom of its owner's deck.
    const ownDeck = s.state.players[0]!.deck;
    expect(ownDeck[ownDeck.length - 1]!.cardId).toBe("BT19-027");
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT1-038", "BT2-027"]);
    const decoded = s.state.players[0]!.battleArea[1]!;
    expect(decoded.topCard?.instanceId).toBe(s.inst("zudomon").instanceId);
    expect(decoded.stack).toHaveLength(0);
    // Host scoping: the other stack's Blue Lv.5 never moved.
    expect(s.perm("decoy").stack.map((card) => card.cardId)).toEqual(["BT1-042"]);
    // The blue Lv.4 under Ryugumon is NOT a Blue Lv.5, so it followed the host to the trash.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("gorillamon").instanceId);
    // The opponent's Lv.6 is at the bottom of their deck; nothing else moved.
    const opponentDeck = s.state.players[1]!.deck;
    expect(opponentDeck[opponentDeck.length - 1]!.cardId).toBe("ST2-10");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    // Q3085 ordering: the Decode payload was played before the opponent bounce resolved.
    expect(opponentBoardAtDecodePlay).toEqual(["ST2-10"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("caps the opponent bounce at the level of the Digimon returned as the cost", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-027", as: "ryugu" },
            { card: "BT1-033", as: "dolphmon" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [...filler],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "ST2-10", as: "lv6" },
            { card: "BT1-030", as: "lv3" },
          ],
          deck: [...filler],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    // Bias BOTH decisions: pay with the Lv.4 Dolphmon, and reach for the Lv.6 if allowed.
    preferInstanceIds.push(s.perm("dolphmon").topCard!.instanceId, s.perm("lv6").topCard!.instanceId);
    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    const ownDeck = s.state.players[0]!.deck;
    expect(ownDeck[ownDeck.length - 1]!.cardId).toBe("BT1-033");
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-027"]);
    // Level 6 > level 4: out of reach. Only the Lv.3 could be taken.
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["ST2-10"]);
    const opponentDeck = s.state.players[1]!.deck;
    expect(opponentDeck[opponentDeck.length - 1]!.cardId).toBe("BT1-030");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("bounces exactly once per turn and rearms on the next own turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-027", as: "ryugu" },
            { card: "BT1-033", as: "fodderA" },
            { card: "BT1-034", as: "fodderB" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [...filler],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-030", as: "oppA" },
            { card: "BT2-023", as: "oppB" },
          ],
          // A playable spare keeps seat 1's Main phase open instead of auto-passing.
          hand: [{ card: "BT1-009", as: "oppSpare" }],
          deck: [...filler],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    // Pay with the fodder, not with Ryugumon itself, so the same source is still on the
    // board when the next own [End of Your Turn] window opens.
    preferInstanceIds.push(s.perm("fodderA").topCard!.instanceId, s.perm("fodderB").topCard!.instanceId);
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    // [Once Per Turn]: exactly ONE of each side's Digimon moved during the first own turn.
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-027", "BT1-034"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    const afterFirst = s.state.players[1]!.deck.filter((card) => card.cardId !== "BT1-009").length;
    expect(afterFirst).toBe(1);

    // The opponent's own turn must not open the window ("[End of YOUR Turn]"). Chaining
    // hand-laid turns is the documented arrangement for `advance.runTurn` (advance.ts:100):
    // the turn itself still runs through the production turn loop.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.state.players[1]!.deck.filter((card) => card.cardId !== "BT1-009")).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-027", "BT1-034"]);

    // Next own turn: the once-per-turn gate has reset.
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-027"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.filter((card) => card.cardId !== "BT1-009")).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not Decode when it leaves the battle area IN battle (CR 16-36-1)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-027", as: "ryugu", under: [{ card: "BT2-027", as: "zudomon" }] }],
          deck: [...filler],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          deck: [...filler],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ryugu").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("zudomon").instanceId]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
