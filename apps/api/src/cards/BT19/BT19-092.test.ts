import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// Fixture vocabulary (BT19-092 Wadatsumi Purification — mono-BLUE Option, cost 5).
//   BT2-085 Joe Kido    — mono-blue TAMER. It meets the Option's colour requirement (CR 4-22-2)
//                         while being no help at all to the "1 of your blue DIGIMON" cost.
//   BT1-038 Monzaemon   — inert mono-BLUE Lv.5 Digimon. The cost payer.
//   BT1-013 Muchomon    — inert mono-RED Lv.3 Digimon. Colour NEAR MISS for the cost.
//   BT1-014 Kokatorimon — inert RED Lv.4. Legal target of the base clause.
//   BT1-020 Groundramon — inert RED Lv.5. Above the base clause's cap, below the upgraded one.
//   BT1-080 Titamon     — inert GREEN Lv.6. Legal only for the upgraded clause.
//   BT19-024 MarineBullmon — Blue Lv.5 with ＜Decode (Blue Lv.4)＞: the Q3165 case.
//   BT2-024 Seadramon   — inert BLUE Lv.4, seeded as MarineBullmon's digivolution card and
//                         therefore what its ＜Decode＞ plays.
const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

const boardCardIds = (s: EngineSetup, seat: 0 | 1): string[] =>
  s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId ?? "");

const deckBottom = (s: EngineSetup, seat: 0 | 1): string | undefined => s.state.players[seat]!.deck.at(-1)?.cardId;

describe("BT19-092 Wadatsumi Purification — catalog and IR", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-092")).toMatchObject({
      cardId: "BT19-092",
      nameEn: "Wadatsumi Purification",
      colors: ["Blue"],
      kinds: ["Option"],
      types: ["LIBERATOR"],
      playCost: 5,
      dp: 0,
      evoCosts: [],
      maxCountInDeck: 4,
      effectText:
        "[Main] Return 1 of your opponent's level 4 or lower Digimon to the bottom of the deck. " +
        "By returning 1 of your blue Digimon to the bottom of the deck, return 1 of their level 6 " +
        "or lower Digimon to the bottom of the deck instead.",
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    // No errata for this card (data/kb/errata.json has no BT19-092 entry).
  });

  it("compiles the two printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-092");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          {
            // The "instead" branch is tried first and binds its result; the base clause below
            // is gated on that binding staying empty, so exactly one return happens.
            kind: "Return",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 6 } },
              count: 1,
            },
            to: "deckBottom",
            bindResultAs: "upgraded",
            cost: {
              kind: "return",
              // "to the bottom of the deck" — the permanent branch of the return cost only
              // bottom-decks on an explicit `to: "deckBottom"`; otherwise it returns to hand.
              to: "deckBottom",
              target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"] }, count: 1 },
            },
            // CR 15-7-4: a "by <paying>" condition is the controller's choice, so the upgraded
            // branch must prompt rather than fire automatically.
            optional: true,
            abortOnDecline: false,
          },
          {
            kind: "Return",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
              count: 1,
            },
            to: "deckBottom",
            condition: { kind: "bindingEmpty", ref: "upgraded" },
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
    ]);
  });
});

describe("BT19-092 Wadatsumi Purification — use cost and the [Main] effect", () => {
  function fixture(
    ownBoard: (string | { card: string; as?: string; under?: string[] })[],
    opponentBoard: string[],
    opts: { accept: boolean } = { accept: true },
  ): EngineSetup {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-092", as: "option" }, "BT1-009"],
          battleArea: ownBoard.map((entry, index) =>
            typeof entry === "string"
              ? { card: entry, as: `own${index}` }
              : { ...entry, as: entry.as ?? `own${index}` },
          ),
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: opponentBoard.map((card, index) => ({ card, as: `foe${index}` })),
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      opts.accept
        ? { autoAcceptOptional: true, autoSelectCards: true }
        : { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    return s;
  }

  const play = (s: EngineSetup) =>
    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId });

  it("refuses the play with no blue permanent at all", async () => {
    const s = fixture(["BT1-013"], ["BT1-014"]);
    await s.ready();
    expect(play(s)).toEqual({ ok: false, reason: "color-requirement-unmet" });
    expect(s.state.memory).toBe(8);
    expect(boardCardIds(s, 1)).toEqual(["BT1-014"]);
  });

  it("returns a level 4 opponent Digimon to the bottom of the deck and leaves a level 5 alone", async () => {
    // A blue TAMER meets the colour requirement but is not a blue DIGIMON, so the upgraded
    // branch's cost cannot be paid and the base clause resolves.
    const s = fixture(["BT2-085"], ["BT1-014", "BT1-020"]);
    await s.ready();
    const targetId = s.perm("foe0").topCard!.instanceId;
    const deckBefore = s.state.players[1]!.deck.length;

    expect(play(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(boardCardIds(s, 1)).toEqual(["BT1-020"]);
    expect(s.state.players[1]!.deck.length).toBe(deckBefore + 1);
    expect(s.state.players[1]!.deck.at(-1)!.instanceId).toBe(targetId);
    expect(deckBottom(s, 1)).toBe("BT1-014");
    // Cost 5 off 8; the Option is spent and nothing of the caster's left the board.
    expect(s.state.memory).toBe(3);
    expect(boardCardIds(s, 0)).toEqual(["BT2-085"]);
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT19-092")).toBe(true);
    assertNoLoudGap(s);
  });

  it("cannot reach a level 5 with the base clause alone", async () => {
    const s = fixture(["BT2-085"], ["BT1-020"]);
    await s.ready();
    expect(play(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "BT19-092"));
    expect(boardCardIds(s, 1)).toEqual(["BT1-020"]);
    expect(s.state.memory).toBe(3);
  });

  it("does not accept a RED Digimon for the blue-Digimon cost", async () => {
    // Blue Tamer for the colour requirement, red Digimon on the board: the cost has no legal
    // payer, so the level 6 opponent Digimon stays and nothing of the caster's is returned.
    const s = fixture(["BT2-085", "BT1-013"], ["BT1-080"]);
    await s.ready();
    expect(play(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "BT19-092"));
    expect(boardCardIds(s, 1)).toEqual(["BT1-080"]);
    expect(boardCardIds(s, 0).sort()).toEqual(["BT1-013", "BT2-085"]);
    expect(s.state.players[0]!.deck.length).toBe(FILLER.length);
  });

  it("pays a blue Digimon to reach a level 6 instead, both to the bottom of their own decks", async () => {
    const s = fixture(["BT2-085", { card: "BT1-038", as: "payer" }], ["BT1-080"]);
    await s.ready();
    const payerId = s.perm("payer").topCard!.instanceId;
    const victimId = s.perm("foe0").topCard!.instanceId;

    expect(play(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(boardCardIds(s, 1)).toEqual([]);
    expect(s.state.players[1]!.deck.at(-1)!.instanceId).toBe(victimId);
    // The cost card goes to the bottom of ITS OWN owner's deck.
    expect(boardCardIds(s, 0)).toEqual(["BT2-085"]);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).not.toContain("BT1-038");
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(payerId);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("returns only ONE Digimon — 'instead' replaces the base clause, it does not add to it", async () => {
    const s = fixture(["BT2-085", { card: "BT1-038", as: "payer" }], ["BT1-014", "BT1-080"]);
    await s.ready();
    expect(play(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => s.state.pendingDecision === undefined);

    // Exactly one of the opponent's two Digimon left the board.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck.length).toBe(FILLER.length + 1);
    assertNoLoudGap(s);
  });

  it("declining the 'by returning' condition falls back to the level 4 base clause (CR 15-7-4)", async () => {
    const s = fixture(["BT2-085", { card: "BT1-038", as: "payer" }], ["BT1-014", "BT1-080"], { accept: false });
    await s.ready();
    expect(play(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    // The optional cost was refused: the caster's blue Digimon is still on the board and the
    // level 6 survived; the base clause took the level 4 instead.
    expect(boardCardIds(s, 0).sort()).toEqual(["BT1-038", "BT2-085"]);
    expect(boardCardIds(s, 1)).toEqual(["BT1-080"]);
    expect(deckBottom(s, 1)).toBe("BT1-014");
    expect(s.state.players[0]!.deck.length).toBe(FILLER.length);
    assertNoLoudGap(s);
  });

  it("lets the returned blue Digimon's ＜Decode＞ resolve and still returns the level 6 (Q3165)", async () => {
    const s = fixture(["BT2-085", { card: "BT19-024", as: "decoder", under: ["BT2-024"] }], ["BT1-080"]);
    await s.ready();
    expect(getCardDefinition("BT19-024")!.effectText).toContain("＜Decode (Blue Lv.4)＞");
    const decoderId = s.perm("decoder").topCard!.instanceId;
    const decodedId = s.perm("decoder").stack[0]!.instanceId;
    const victimId = s.perm("foe0").topCard!.instanceId;

    expect(play(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => s.state.pendingDecision === undefined);

    // ＜Decode＞ played the Blue Lv.4 digivolution card without paying its cost...
    expect(boardCardIds(s, 0).sort()).toEqual(["BT2-024", "BT2-085"]);
    expect(s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT2-024")!.topCard!.instanceId).toBe(
      decodedId,
    );
    // ...the host itself still went to the bottom of the deck as the cost...
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(decoderId);
    // ...and the opponent's level 6 was returned all the same (Q3165).
    expect(s.state.players[1]!.deck.at(-1)!.instanceId).toBe(victimId);
    expect(boardCardIds(s, 1)).toEqual([]);
    assertNoLoudGap(s);
  });
});

describe("BT19-092 Wadatsumi Purification — [Security]", () => {
  it("activates the [Main] effect for the security player on a real security check", async () => {
    const s = setupEngine(
      {
        0: {
          // BT1-020 (Lv.5) is the attacker and is out of the base clause's reach; BT1-014
          // (Lv.4) is the only legal target the flipped Option can take.
          battleArea: [
            { card: "BT1-020", as: "attacker", dp: 20_000 },
            { card: "BT1-014", as: "prey" },
          ],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          deck: [...FILLER],
          security: [{ card: "BT19-092", as: "flip" }, ...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const preyId = s.perm("prey").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    // Seat 1 is "you" for the security effect, so seat 0 is "your opponent".
    expect(boardCardIds(s, 0)).toEqual(["BT1-020"]);
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(preyId);
    expect(s.state.players[1]!.trash.some((c) => c.cardId === "BT19-092")).toBe(true);
    // Seat 1 has no blue Digimon, so only the base (level 4 or lower) clause could resolve.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
