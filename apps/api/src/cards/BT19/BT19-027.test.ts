import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-027.js";

const filler = ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"];

describe("BT19-027 Ryugumon", () => {
  it("compiles the printed clauses to the expected IR shape", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
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
            {
              card: "BT2-027",
              as: "base",
              under: [
                { card: "BT1-033", as: "dolphmon" },
                { card: "BT1-014", as: "kokatorimon" },
              ],
            },
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

    expect(s.perm("base").topCard?.cardId).toBe("BT19-027");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-014", "BT2-027"]);
    const played = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("dolphmon").instanceId,
    );
    expect(played?.topCard?.cardId).toBe("BT1-033");
    expect(played?.stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-014")).toBe(false);
    expect(s.perm("decoy").stack.map((card) => card.cardId)).toEqual(["BT1-037"]);
    expect(s.state.memory).toBe(6);
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

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueLv4").permanentId,
        instanceId: s.inst("ryugu").instanceId,
      }).ok,
    ).toBe(false);
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
    preferInstanceIds.push(s.perm("ryugu").topCard!.instanceId, s.inst("loaderLeomon").instanceId);
    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    const ownDeck = s.state.players[0]!.deck;
    expect(ownDeck[ownDeck.length - 1]!.cardId).toBe("BT19-027");
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT1-038", "BT2-027"]);
    const decoded = s.state.players[0]!.battleArea[1]!;
    expect(decoded.topCard?.instanceId).toBe(s.inst("zudomon").instanceId);
    expect(decoded.stack).toHaveLength(0);
    expect(s.perm("decoy").stack.map((card) => card.cardId)).toEqual(["BT1-042"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("gorillamon").instanceId);
    const opponentDeck = s.state.players[1]!.deck;
    expect(opponentDeck[opponentDeck.length - 1]!.cardId).toBe("ST2-10");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
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
    preferInstanceIds.push(s.perm("dolphmon").topCard!.instanceId, s.perm("lv6").topCard!.instanceId);
    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    const ownDeck = s.state.players[0]!.deck;
    expect(ownDeck[ownDeck.length - 1]!.cardId).toBe("BT1-033");
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-027"]);
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
          hand: [{ card: "BT1-009", as: "oppSpare" }],
          deck: [...filler],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("fodderA").topCard!.instanceId, s.perm("fodderB").topCard!.instanceId);
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-027", "BT1-034"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    const afterFirst = s.state.players[1]!.deck.filter((card) => card.cardId !== "BT1-009").length;
    expect(afterFirst).toBe(1);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.state.players[1]!.deck.filter((card) => card.cardId !== "BT1-009")).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-027", "BT1-034"]);

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

describe("BT19-027 Ryugumon — KB Q&A rulings", () => {
  it("is always treated as [Aquatic], so an [Aqua] trait filter picks it from the hand (Q3082)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "host" }],
          hand: [
            { card: "BT19-024", as: "placer" },
            { card: "BT19-020", as: "nearMiss" },
            { card: "BT19-027", as: "ryugu" },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const ryuguInstanceId = s.inst("ryugu").instanceId;
    const nearMissInstanceId = s.inst("nearMiss").instanceId;
    // The near-miss is preferred first, so it would be placed if the filter wrongly accepted it.
    preferInstanceIds.push(nearMissInstanceId, ryuguInstanceId, s.perm("host").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("placer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.length === 1);
    await settle();

    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([ryuguInstanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([nearMissInstanceId]);
  });

  it("triggers the Decode-played Digimon's [On Play] together with the one Lucemon: Chaos Mode plays (Q3084)", async () => {
    const opponentBoardWhenOwnOnPlayTriggered: string[][] = [];
    const effectTimeline: string[] = [];
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-027", as: "ryugu", under: [{ card: "BT1-041", as: "zudomon" }] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [...filler],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "EX6-054", as: "chaos", under: [{ card: "EX10-013", as: "lucemon" }] }],
          trash: [{ card: "EX6-056", as: "beelzemon" }],
          deck: [...filler],
          security: ["BT1-009", "BT1-009"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds,
        onEvent: (event) => {
          if (event.kind === "effectResolved" && event.sourceCardId === "BT19-027") {
            effectTimeline.push("Ryugumon effect resolved");
          }
          if (event.kind !== "effectTriggered") return;
          effectTimeline.push(`${event.sourceCardId} triggered`);
          if (event.sourceCardId === "BT1-041") {
            opponentBoardWhenOwnOnPlayTriggered.push(s.state.players[1]!.battleArea.map((p) => p.topCard!.cardId));
          }
        },
      },
    );
    preferInstanceIds.push(s.perm("ryugu").topCard!.instanceId);
    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[1]!.trash.length === 4);
    await settle();

    expect(opponentBoardWhenOwnOnPlayTriggered).toEqual([["EX6-056"]]);
    // [End of Turn] opens; its leave announces Ryugumon's ＜Decode＞ and Lucemon: Chaos Mode's
    // reaction as their own effects inside it.
    expect(effectTimeline).toEqual([
      "BT19-027 triggered",
      "BT19-027 triggered",
      "Ryugumon effect resolved",
      "EX6-054 triggered",
      "Ryugumon effect resolved",
      "BT1-041 triggered",
      "EX6-056 triggered",
    ]);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([s.inst("zudomon").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([s.inst("beelzemon").instanceId]);
    expect(s.state.players[1]!.trash).toHaveLength(4);
    expect(s.state.players[1]!.deck.slice(-2).map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("chaos").instanceId, s.inst("lucemon").instanceId]),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
