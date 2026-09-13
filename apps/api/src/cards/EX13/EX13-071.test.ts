import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-071.js";
import "./EX13-071.js";
import "../index.js";

// EX13-071 Richard Sampson — behavioural proof.
//
// Fixtures used and why:
//   BT1-046  Kudamon           — Lv.3 Yellow [Holy Beast]. The printed `[Kudamon]` base. Chosen
//                                over EX13-026 because EX13-026 also carries [DATA SQUAD], which
//                                makes BOTH Kentaurosmon routes legal at once and opens an extra
//                                `chooseOption` prompt unrelated to what is being proven.
//   BT3-043  Kentaurosmon      — Lv.6 Yellow, printed EvoCost Yellow Lv.5 for 3, no alternate
//                                digivolution header. Its [When Digivolving] only touches the
//                                OPPONENT's Digimon, so an empty opposing board keeps it silent.
//   BT1-051  Reppamon          — Lv.4 Yellow [Holy Beast], no printed text. The level-4 material.
//   BT3-038  Antylamon         — Lv.5 Yellow [Holy Beast], no printed text. The level-5 material.
//   BT3-037  Turuiemon         — Lv.4 Yellow [Beastkin], no printed text. NEAR MATCH: its trait
//                                CONTAINS "Beast" but is not exactly [Holy Beast].
//   EX2-015  Seasarmon         — Lv.4 BLUE [Holy Beast]. NEAR MATCH on trait, wrong colour.
//   BT1-009..BT1-014           — inert main-deck Digimon used as neutral face-down / deck filler.

const CARD_ID = "EX13-071";

const THREE_FACE_DOWN = [
  { card: "BT1-012", as: "fd1", faceUp: false },
  { card: "BT1-013", as: "fd2", faceUp: false },
  { card: "BT1-014", as: "fd3", faceUp: false },
];

describe("EX13-071 Richard Sampson", () => {
  // -------------------------------------------------------------------------
  // Catalog + IR shape
  // -------------------------------------------------------------------------

  it("matches the printed catalog entry and compiles every printed clause", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Richard Sampson",
      colors: ["Yellow"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["DATA SQUAD"],
    });

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);

    // Clause 1 is printed once under two timings, so both effects carry the same body.
    for (const trigger of ["OnPlay", "StartOfYourMainPhase"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "PlaceUnder", fromDeckTop: true, faceDown: true, position: "bottom", optional: true },
          { kind: "GainMemory", amount: 1, condition: { kind: "opponentHas" } },
        ],
      });
    }
    // "You may" scopes the placement only: the memory clause must NOT be aborted by a decline.
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions[0]).not.toHaveProperty(
      "abortOnDecline",
    );

    expect(compiled.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "CostGatedBlock",
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "compound",
            costs: [
              { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 3 },
              {
                kind: "place",
                destination: "digivolutionStack",
                position: "bottom",
                bindHostAs: "kudamonHost",
                target: {
                  count: 1,
                  from: ["trash"],
                  filter: {
                    colors: ["Yellow"],
                    levels: [4],
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Holy Beast"], match: "trait" }],
                  },
                },
                host: { filter: { nameOrTrait: [{ tokens: ["Kudamon"], match: "nameExact" }] }, count: 1 },
              },
              {
                kind: "place",
                destination: "digivolutionStack",
                position: "bottom",
                target: {
                  count: 1,
                  from: ["trash"],
                  filter: {
                    colors: ["Yellow"],
                    levels: [5],
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Holy Beast"], match: "trait" }],
                  },
                },
                host: { filter: { boundRef: "kudamonHost" }, count: 1 },
              },
            ],
          },
          actions: [
            {
              kind: "Digivolve",
              target: { fromSelectionRef: "kudamonHost" },
              into: { filter: { nameOrTrait: [{ tokens: ["Kentaurosmon"], match: "nameExact" }] } },
              from: ["hand", "trash"],
              payCost: true,
              reduceCost: 1,
              ignoreLevelRequirement: true,
              optional: true,
            },
          ],
        },
      ],
    });

    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", from: ["security"], payCost: false }],
    });
  });

  // -------------------------------------------------------------------------
  // Clause 1 — [Start of Your Main Phase] [On Play]
  // -------------------------------------------------------------------------

  it("on play places the deck's top card face down under itself and gains 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sampson" }],
          deck: [
            { card: "BT1-009", as: "deckTop" },
            { card: "BT1-010", as: "deckSecond" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "theirDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sampson").instanceId })).toEqual({
      ok: true,
    });
    // 5 memory - 4 play cost = 1, then the mandatory "gain 1 memory" clause -> 2.
    await settle(() => s.state.memory === 2);

    const tamer = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === CARD_ID);
    expect(tamer).toBeDefined();
    expect(tamer!.stack).toHaveLength(1);
    expect(tamer!.stack[0]).toMatchObject({ instanceId: s.inst("deckTop").instanceId, faceUp: false });
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("deckSecond").instanceId]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("places the deck top but gains NO memory when the opponent has no Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sampson" }],
          deck: [
            { card: "BT1-009", as: "deckTop" },
            { card: "BT1-010", as: "deckSecond" },
          ],
        },
        // A lone opposing TAMER is not "a Digimon": the memory clause must stay silent.
        1: { battleArea: [{ card: "ST24-13", as: "theirTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sampson").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 1);
    await settle();

    const tamer = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === CARD_ID);
    expect(tamer!.stack.map((card) => card.instanceId)).toEqual([s.inst("deckTop").instanceId]);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still gains memory when the optional placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sampson" }],
          deck: [
            { card: "BT1-009", as: "deckTop" },
            { card: "BT1-010", as: "deckSecond" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "theirDigimon" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sampson").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 2);
    await settle();

    const tamer = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === CARD_ID);
    expect(tamer!.stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("deckTop").instanceId,
      s.inst("deckSecond").instanceId,
    ]);
    expect(s.state.memory).toBe(2);
  });

  it("fires the same body at the start of the controller's main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "sampson" }],
          deck: [
            { card: "BT1-009", as: "deckTop" },
            { card: "BT1-010", as: "deckSecond" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "theirDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("sampson"));
    await settle(() => s.state.memory === 1);
    await settle();

    expect(s.perm("sampson").stack).toHaveLength(1);
    expect(s.perm("sampson").stack[0]).toMatchObject({ instanceId: s.inst("deckTop").instanceId, faceUp: false });
    expect(s.state.memory).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Clause 2 — [Main] [Once Per Turn] the Kudamon -> Kentaurosmon route
  // -------------------------------------------------------------------------

  it("trashes 3 face-down cards, stacks a level 4 and a level 5 Holy Beast under Kudamon, and digivolves into Kentaurosmon for 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "sampson", under: THREE_FACE_DOWN },
            { card: "BT1-046", as: "kudamon" },
          ],
          hand: [
            { card: "BT3-043", as: "kentaurosmon" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [
            { card: "BT1-051", as: "lv4Material" },
            { card: "BT3-038", as: "lv5Material" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    const kudamonTopId = s.perm("kudamon").topCard.instanceId;
    await s.ready();

    const [mainEffect] = observe(s.engine).activatableEffects(s.perm("sampson")) as { effectKey: string }[];
    expect(mainEffect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("sampson").topCard.instanceId,
        effectKey: mainEffect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kudamon").topCard.cardId === "BT3-043");
    await settle();

    // The Kudamon permanent survived as the same permanent, now topped by Kentaurosmon.
    const evolved = s.perm("kudamon");
    expect(evolved.topCard.instanceId).toBe(s.inst("kentaurosmon").instanceId);
    // Source-stack identity: both placed materials sit UNDER the former Kudamon top card.
    // `stack[0]` is the bottom-most card, and each component places at the CURRENT bottom, so
    // the level-5 card (placed second) ends up below the level-4 one. The printed sentence
    // fixes neither material's position relative to the other — only that both are bottom
    // digivolution cards of the same [Kudamon], which is what this asserts.
    expect(evolved.stack.map((card) => card.cardId)).toEqual(["BT3-038", "BT1-051", "BT1-046"]);
    expect(evolved.stack.map((card) => card.instanceId)).toEqual([
      s.inst("lv5Material").instanceId,
      s.inst("lv4Material").instanceId,
      kudamonTopId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("lv4Material").instanceId);

    // The full 3-card face-down cost was paid off the Tamer.
    expect(s.perm("sampson").stack).toHaveLength(0);
    const trashIds = s.state.players[0]!.trash.map((card) => card.instanceId);
    for (const alias of ["fd1", "fd2", "fd3"]) expect(trashIds).toContain(s.inst(alias).instanceId);

    // Printed digivolution cost 3, reduced by 1 -> 2 memory spent.
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("also reaches a Kentaurosmon sitting in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "sampson", under: THREE_FACE_DOWN },
            { card: "BT1-046", as: "kudamon" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          trash: [
            { card: "BT1-051", as: "lv4Material" },
            { card: "BT3-038", as: "lv5Material" },
            { card: "BT3-043", as: "kentaurosmon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("sampson"));
    await settle(() => s.perm("kudamon").topCard.cardId === "BT3-043");
    await settle();

    expect(s.perm("kudamon").topCard.instanceId).toBe(s.inst("kentaurosmon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("does nothing when only 2 bottom face-down cards are available under the controller's Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "sampson",
              under: [
                { card: "BT1-012", as: "fd1", faceUp: false },
                { card: "BT1-013", as: "fd2", faceUp: false },
              ],
            },
            { card: "BT1-046", as: "kudamon" },
          ],
          hand: [
            { card: "BT3-043", as: "kentaurosmon" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [
            { card: "BT1-051", as: "lv4Material" },
            { card: "BT3-038", as: "lv5Material" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    // Public activation eligibility must reject the incomplete compound before any component
    // can move; this is deliberately observed without firing a primitive timing seam.
    expect(observe(s.engine).activatableEffects(s.perm("sampson"))).toHaveLength(0);
    await settle();

    expect(s.perm("kudamon").topCard.cardId).toBe("BT1-046");
    expect(s.perm("kudamon").stack).toHaveLength(0);
    // An unpayable "by ..." cost pays nothing at all: the two face-down cards stay put.
    expect(s.perm("sampson").stack).toHaveLength(2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("lv4Material").instanceId, s.inst("lv5Material").instanceId]),
    );
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a trash holding two level 4 Holy Beasts — '1 each of level 4 and level 5' needs both levels", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "sampson", under: THREE_FACE_DOWN },
            { card: "BT1-046", as: "kudamon" },
          ],
          hand: [
            { card: "BT3-043", as: "kentaurosmon" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [
            { card: "BT1-051", as: "lv4MaterialA" },
            { card: "BT13-037", as: "lv4MaterialB" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("sampson"));
    await settle();

    expect(s.perm("kudamon").topCard.cardId).toBe("BT1-046");
    expect(s.perm("kudamon").stack).toHaveLength(0);
    expect(s.perm("sampson").stack).toHaveLength(3);
    expect(s.state.memory).toBe(3);
  });

  it("discriminates the material filter: [Beastkin] and a blue [Holy Beast] are not legal materials", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "sampson", under: THREE_FACE_DOWN },
            { card: "BT1-046", as: "kudamon" },
          ],
          hand: [
            { card: "BT3-043", as: "kentaurosmon" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [
            // Level 4 near-misses only: [Beastkin] merely CONTAINS "Beast"; the Seasarmon is a
            // true [Holy Beast] but BLUE. Neither may stand in for the level-4 material.
            { card: "BT3-037", as: "beastkin" },
            { card: "EX2-015", as: "blueHolyBeast" },
            { card: "BT3-038", as: "lv5Material" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("sampson"));
    await settle();

    expect(s.perm("kudamon").topCard.cardId).toBe("BT1-046");
    expect(s.perm("kudamon").stack).toHaveLength(0);
    expect(s.perm("sampson").stack).toHaveLength(3);
    const trashIds = s.state.players[0]!.trash.map((card) => card.instanceId);
    for (const alias of ["beastkin", "blueHolyBeast", "lv5Material"]) {
      expect(trashIds).toContain(s.inst(alias).instanceId);
    }
    expect(s.state.memory).toBe(3);
  });

  it("needs a [Kudamon] specifically — another Lv.3 yellow Digimon is not a legal host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "sampson", under: THREE_FACE_DOWN },
            // Tsukaimon: Lv.3 Yellow, but not named [Kudamon].
            { card: "BT1-045", as: "notKudamon" },
          ],
          hand: [
            { card: "BT3-043", as: "kentaurosmon" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [
            { card: "BT1-051", as: "lv4Material" },
            { card: "BT3-038", as: "lv5Material" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("sampson"));
    await settle();

    expect(s.perm("notKudamon").topCard.cardId).toBe("BT1-045");
    expect(s.perm("notKudamon").stack).toHaveLength(0);
    expect(s.perm("sampson").stack).toHaveLength(3);
    expect(s.state.memory).toBe(3);
  });

  it("puts both materials under ONE Kudamon and digivolves that same Kudamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "sampson", under: THREE_FACE_DOWN },
            { card: "BT1-046", as: "kudamonA" },
            { card: "BT4-037", as: "kudamonB" },
          ],
          hand: [
            { card: "BT3-043", as: "kentaurosmon" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [
            { card: "BT1-051", as: "lv4Material" },
            { card: "BT3-038", as: "lv5Material" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("sampson"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT3-043"));
    await settle();

    const hosts = [s.perm("kudamonA"), s.perm("kudamonB")];
    const evolved = hosts.find(({ topCard }) => topCard.cardId === "BT3-043");
    const untouched = hosts.find(({ topCard }) => topCard.cardId !== "BT3-043");
    expect(evolved).toBeDefined();
    expect(untouched).toBeDefined();
    // Both materials went under ONE host; the other Kudamon received nothing and did not evolve.
    expect(evolved!.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("lv4Material").instanceId, s.inst("lv5Material").instanceId]),
    );
    expect(evolved!.stack).toHaveLength(3);
    expect(untouched!.stack).toHaveLength(0);
    expect(s.state.memory).toBe(1);
  });

  it("is once per turn and resets on the controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "sampson",
              under: [
                { card: "BT1-012", as: "fd1", faceUp: false },
                { card: "BT1-013", as: "fd2", faceUp: false },
                { card: "BT1-014", as: "fd3", faceUp: false },
                { card: "BT1-012", as: "fd4", faceUp: false },
                { card: "BT1-013", as: "fd5", faceUp: false },
                { card: "BT1-014", as: "fd6", faceUp: false },
              ],
            },
            { card: "BT1-046", as: "kudamonA" },
            { card: "BT1-046", as: "kudamonB" },
          ],
          hand: [
            { card: "BT3-043", as: "kentaurosmonA" },
            { card: "BT3-043", as: "kentaurosmonB" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [
            { card: "BT1-051", as: "lv4A" },
            { card: "BT3-038", as: "lv5A" },
            { card: "BT1-051", as: "lv4B" },
            { card: "BT3-038", as: "lv5B" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"], hand: [{ card: "BT1-009", as: "theirSpare" }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferInstanceIds: [],
      },
    );
    s.state.memory = 8;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("sampson"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT3-043"));
    await settle();

    const evolvedFirst = s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT3-043");
    expect(evolvedFirst).toHaveLength(1);
    expect(s.perm("sampson").stack).toHaveLength(3);
    expect(s.state.memory).toBe(6);

    // Second activation in the SAME turn: refused outright, no cost paid.
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("sampson"));
    await settle();

    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT3-043")).toHaveLength(1);
    expect(s.perm("sampson").stack).toHaveLength(3);
    expect(s.state.memory).toBe(6);

    // The opponent's whole turn, then the controller's own next turn through the real loop.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 8;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle();

    // [Start of Your Main Phase] placed one more deck card face down; the once-per-turn
    // budget is refreshed, so the Main clause activates a second time.
    const faceDownBeforeSecondUse = s.perm("sampson").stack.length;
    expect(faceDownBeforeSecondUse).toBeGreaterThanOrEqual(3);
    const memoryBeforeSecondUse = s.state.memory;

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("sampson"));
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT3-043").length > 1,
    );
    await settle();

    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT3-043")).toHaveLength(2);
    expect(s.perm("sampson").stack).toHaveLength(faceDownBeforeSecondUse - 3);
    expect(s.state.memory).toBe(memoryBeforeSecondUse - 2);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  // -------------------------------------------------------------------------
  // Clause 3 — [Security] Play this card without paying the cost.
  // -------------------------------------------------------------------------

  it("plays itself from security without paying its 4 memory play cost", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: CARD_ID, as: "sampson" }],
          deck: [
            { card: "BT1-009", as: "deckTop" },
            { card: "BT1-010", as: "deckSecond" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "theirDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("sampson"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("sampson").instanceId),
    );
    await settle();

    const tamer = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("sampson").instanceId,
    );
    expect(tamer).toBeDefined();
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).not.toContain(s.inst("sampson").instanceId);
    // Free play (no -4), then the [On Play] clause's mandatory memory gain.
    expect(s.state.memory).toBe(1);
    expect(tamer!.stack.map((card) => card.instanceId)).toEqual([s.inst("deckTop").instanceId]);
  });
});
