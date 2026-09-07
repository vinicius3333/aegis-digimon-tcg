import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type BoardSpec, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-084.js";

// Printed text (BT23-084 Erika Mishima, Green Tamer, play cost 4, [Hudie]/[CS]):
//   [Security] Play this card without paying the cost.
//   [Start of Your Main Phase] If you have a Digimon with the [CS] trait, gain 1 memory.
//   [End of Your Turn] By suspending this Tamer and returning 1 of your Digimon with the
//     [Hudie] trait to the hand, you may play 1 level 3 Digimon card with the [CS] trait
//     from your hand to your empty breeding area without paying the cost.
//   Inherited: [Your Turn] While this Digimon is [Hudiemon], [Eater Legion] or
//     [Eater EDEN], it gains <Alliance>.

const NEUTRAL_SECURITY = ["BT1-009", "BT1-010", "BT1-011"];
const NEUTRAL_DECK = ["BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010"];

/** Seat 0 board with a spare playable card so the Main phase does not auto-pass. */
function turnBoard(seat0: BoardSpec[0]): BoardSpec {
  return {
    0: { deck: [...NEUTRAL_DECK], security: [...NEUTRAL_SECURITY], ...seat0 },
    1: { deck: [...NEUTRAL_DECK], security: [...NEUTRAL_SECURITY], hand: [{ card: "BT1-009", as: "opponentSpare" }] },
  };
}

async function runSeat0Turn(board: BoardSpec, opts: SetupEngineOptions) {
  const s = setupEngine(board, opts);
  const loop = s.engine.startTurnLoop();
  // A seeded breeding-area permanent opens the interactive Breeding window
  // (BreedingPhaseController), which blocks until the turn player acts or skips.
  for (let i = 0; i < 500 && s.state.phase !== Phase.Main; i += 1) {
    if (s.state.phase === Phase.Breeding && s.state.turnSeat === 0) {
      s.engine.applyIntent(0, { type: "endPhase" });
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

async function endSeat0Turn(s: Awaited<ReturnType<typeof runSeat0Turn>>["s"], loop: Promise<unknown>) {
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("BT23-084 Erika Mishima", () => {
  it("matches every catalog field and the complete compiled clause set", () => {
    const definition = getCardDefinition("BT23-084")!;
    expect(definition).toMatchObject({
      cardId: "BT23-084",
      nameEn: "Erika Mishima",
      colors: ["Green"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["Hudie", "CS"],
      inheritedEffectText:
        "[Your Turn] While this Digimon is [Hudiemon], [Eater Legion] or [Eater EDEN], it gains ＜Alliance＞.",
    });
    // Catalog discrepancy (coordinator-owned): every other Tamer keeps this clause in
    // `securityEffectText`; BT23-084 carries it inside `effectText`. Assert over both so
    // the test survives the catalog fix.
    // The catalog uses a non-breaking space inside "[CS] trait, gain 1 memory"; normalize
    // every space class before comparing.
    const printed = `${definition.effectText ?? ""}\n${definition.securityEffectText ?? ""}`.replace(/\s+/g, " ");
    expect(printed).toContain("[Security] Play this card without paying the cost.");
    expect(printed).toContain("[Start of Your Main Phase] If you have a Digimon with the [CS] trait, gain 1 memory.");
    expect(printed).toContain(
      "[End of Your Turn] By suspending this Tamer and returning 1 of your Digimon with the [Hudie] trait to the hand, you may play 1 level 3 Digimon card with the [CS] trait from your hand to your empty breeding area without paying the cost.",
    );

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.map((entry) => entry.trigger)).toEqual([
      "Security",
      "StartOfYourMainPhase",
      "EndOfYourTurn",
      "YourTurn",
    ]);
  });

  it("plays itself from the security stack without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          deck: [...NEUTRAL_DECK],
          security: [...NEUTRAL_SECURITY],
        },
        1: { deck: [...NEUTRAL_DECK], security: [{ card: "BT23-084", as: "erikaInSecurity" }, "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const memoryBefore = s.state.memory;
    const erikaId = s.inst("erikaInSecurity").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const opponent = s.state.players[1]!;
    expect(opponent.battleArea.some((permanent) => permanent.topCard?.instanceId === erikaId)).toBe(true);
    expect(opponent.trash.some((card) => card.instanceId === erikaId)).toBe(false);
    expect(opponent.security.some((card) => card.instanceId === erikaId)).toBe(false);
    expect(opponent.security).toHaveLength(1);
    // A security play costs nothing: memory moved only by the attack itself, which is 0.
    expect(s.state.memory).toBe(memoryBefore);
  });

  it("gains 1 memory when the Main phase opens with a [CS] Digimon in the battle area", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [
          { card: "BT23-084", as: "erika" },
          { card: "BT23-006", as: "cs" },
        ],
        hand: [{ card: "BT1-009", as: "spare" }],
      }),
      { autoDeclineOptional: true },
    );
    expect(s.state.memory).toBe(1);
    expect(s.perm("erika").isSuspended).toBe(false);
    await endSeat0Turn(s, loop);
  });

  it("does not gain memory without a [CS] Digimon", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [
          { card: "BT23-084", as: "erika" },
          { card: "BT1-009", as: "plain" },
        ],
        hand: [{ card: "BT1-009", as: "spare" }],
      }),
      { autoDeclineOptional: true },
    );
    expect(s.state.memory).toBe(0);
    await endSeat0Turn(s, loop);
  });

  it("does not count a [CS] Digimon in the breeding area, per comprehensive rules 3-4-5-8", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [{ card: "BT23-084", as: "erika" }],
        breeding: { card: "BT23-006", as: "csInBreeding" },
        hand: [{ card: "BT1-009", as: "spare" }],
      }),
      { autoDeclineOptional: true },
    );
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT23-006");
    expect(s.state.memory).toBe(0);
    await endSeat0Turn(s, loop);
  });

  it("pays both costs at the end of the turn and plays a level 3 [CS] Digimon into the empty breeding area", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [
          { card: "BT23-084", as: "erika" },
          { card: "BT23-020", as: "hudie" },
        ],
        hand: [
          { card: "BT23-026", as: "lopmon" },
          { card: "BT1-009", as: "spare" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    const hudieId = s.inst("hudie").instanceId;
    const lopmonId = s.inst("lopmon").instanceId;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    const me = s.state.players[0]!;
    expect(s.perm("erika").isSuspended).toBe(true);
    expect(me.hand.some((card) => card.instanceId === hudieId)).toBe(true);
    expect(me.battleArea.some((permanent) => permanent.topCard?.instanceId === hudieId)).toBe(false);
    expect(me.breeding?.topCard?.instanceId).toBe(lopmonId);
    expect(me.breeding?.inBreeding).toBe(true);
    expect(me.battleArea.some((permanent) => permanent.topCard?.instanceId === lopmonId)).toBe(false);
    expect(me.hand.some((card) => card.instanceId === lopmonId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declining the optional pays neither cost and plays nothing", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [
          { card: "BT23-084", as: "erika" },
          { card: "BT23-020", as: "hudie" },
        ],
        hand: [
          { card: "BT23-026", as: "lopmon" },
          { card: "BT1-009", as: "spare" },
        ],
      }),
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    const me = s.state.players[0]!;
    expect(s.perm("erika").isSuspended).toBe(false);
    expect(me.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("hudie").instanceId)).toBe(true);
    expect(me.hand.some((card) => card.instanceId === s.inst("lopmon").instanceId)).toBe(true);
    expect(me.breeding).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("pays nothing when the breeding area is occupied", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [
          { card: "BT23-084", as: "erika" },
          { card: "BT23-020", as: "hudie" },
        ],
        breeding: { card: "BT23-006", as: "occupied" },
        hand: [
          { card: "BT23-026", as: "lopmon" },
          { card: "BT1-009", as: "spare" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    const me = s.state.players[0]!;
    expect(s.perm("erika").isSuspended).toBe(false);
    expect(me.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("hudie").instanceId)).toBe(true);
    expect(me.hand.some((card) => card.instanceId === s.inst("lopmon").instanceId)).toBe(true);
    expect(me.breeding?.topCard?.instanceId).toBe(s.inst("occupied").instanceId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("pays nothing without a [Hudie] Digimon to return", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [
          { card: "BT23-084", as: "erika" },
          { card: "BT23-006", as: "nonHudie" },
        ],
        hand: [
          { card: "BT23-026", as: "lopmon" },
          { card: "BT1-009", as: "spare" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    const me = s.state.players[0]!;
    expect(s.perm("erika").isSuspended).toBe(false);
    expect(me.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("nonHudie").instanceId)).toBe(
      true,
    );
    expect(me.hand.some((card) => card.instanceId === s.inst("lopmon").instanceId)).toBe(true);
    expect(me.breeding).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not play a level 3 Digimon without the [CS] trait", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [
          { card: "BT23-084", as: "erika" },
          { card: "BT23-020", as: "hudie" },
        ],
        hand: [
          { card: "BT1-009", as: "nonCs" },
          { card: "BT1-010", as: "spare" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    const me = s.state.players[0]!;
    expect(me.breeding).toBeUndefined();
    expect(me.hand.some((card) => card.instanceId === s.inst("nonCs").instanceId)).toBe(true);
    expect(s.perm("erika").isSuspended).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger the [On Play] effect of the Digimon played into breeding, per Q5357", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [
          { card: "BT23-084", as: "erika" },
          { card: "BT23-020", as: "hudie" },
        ],
        // BT23-006 Huckmon's [On Play] reveals the top 3 cards of the deck and adds one.
        hand: [
          { card: "BT23-006", as: "huckmon" },
          { card: "BT1-009", as: "spare" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const deckBefore = s.state.players[0]!.deck.map((card) => card.instanceId);
    const handBefore = s.state.players[0]!.hand.length;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    const me = s.state.players[0]!;
    expect(me.breeding?.topCard?.instanceId).toBe(s.inst("huckmon").instanceId);
    expect(me.deck.map((card) => card.instanceId)).toEqual(deckBefore);
    // Huckmon left the hand, the returned [Hudie] Digimon entered it: net hand size is flat
    // and no extra card arrived from the deck.
    expect(me.hand).toHaveLength(handBefore);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // BT23-101 Hudiemon and BT23-074 Eater Legion print ＜Alliance＞ themselves, so a positive
  // on those two proves nothing about the inherited grant. These two carriers do not.
  it.each([
    ["BT26-041", "Hudiemon — a different card with the same printed name"],
    ["BT23-075", "Eater EDEN"],
  ])("projects inherited ＜Alliance＞ onto %s (%s)", async (cardId) => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "carrier", under: ["BT23-084"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("carrier"), "Alliance")).toBe(true);
  });

  it("grants nothing to the same carrier without Erika in its digivolution cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-041", as: "carrier" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("carrier"), "Alliance")).toBe(false);
  });

  it.each([
    ["BT23-073", "Eater Bit — a near name, not an exact one"],
    ["BT23-006", "Huckmon — an unrelated [CS] carrier"],
  ])("does not project ＜Alliance＞ onto %s (%s)", async (cardId) => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "carrier", under: ["BT23-084"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("carrier"), "Alliance")).toBe(false);
  });

  it("grants the inherited ＜Alliance＞ only on its controller's turn", async () => {
    // BT23-075 Eater EDEN has no printed <Alliance>, so the keyword seen here can only
    // come from Erika's inherited [Your Turn] clause.
    const s = setupEngine(
      turnBoard({
        battleArea: [{ card: "BT23-075", as: "carrier", under: ["BT23-084"] }],
        hand: [{ card: "BT1-009", as: "spare" }],
      }),
      { autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("carrier"), "Alliance")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("carrier"), "Alliance")).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("compiles the bracketed carrier names as exact-name checks and the costs as one compound payment", () => {
    const aura = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(aura).toMatchObject({
      kind: "Aura",
      effect: { kind: "keyword", keyword: { keyword: "Alliance" } },
      while: { kind: "anyOf", conditions: [{ kind: "selfHasName" }] },
    });
    // `selfHasName` compares effective names for equality; `selfHasNameContaining` would
    // be substring matching, which the printed [Bracketed] wording does not license.
    expect(aura.while.conditions[0].names).toEqual(["Hudiemon", "Eater Legion", "Eater EDEN"]);

    const endOfTurn = (compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn") as any).actions[0];
    expect(endOfTurn).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      breeding: true,
      requiresEmpty: "breedingArea",
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "compound",
        costs: [
          { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true } } },
          {
            kind: "return",
            to: "hand",
            target: { count: 1, filter: { nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }] } },
          },
        ],
      },
    });
    expect(endOfTurn.target.filter.levels).toEqual([3]);
    expect(endOfTurn.target.filter.nameOrTrait).toEqual([{ tokens: ["CS"], match: "trait" }]);

    const memory = (compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any).actions[0];
    expect(memory).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "youHave" } });
    // Zone-less `youHave` also counts the breeding area (interpreter/scaling.ts countMatching).
    expect(memory.condition.filter.zone).toBe("battleArea");
  });
});
