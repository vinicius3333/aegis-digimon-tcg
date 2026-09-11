import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-089.js";

const NEUTRAL_SECURITY = ["BT1-009", "BT1-010", "BT1-011"];

// A legal same-level digivolution pair under a [CS] host: Numemon (Lv.4, no trait) digivolves
// into GoldNumemon (BT22-031, "[Digivolve] Lv.4 w/[Numemon] in name: Cost 2"), which digivolves
// into Angewomon (BT23-031, "[Digivolve] Lv.4 w/[CS] trait: Cost 3"). The stack therefore holds
// two level 4 cards, only one of which carries the [CS] trait — the host is what must be [CS].
const SAME_LEVEL_STACK = ["BT2-056", "BT22-031"];
// Numemon (Lv.4) plus Huckmon (Lv.3): a stack with no same-level pair.
const MIXED_LEVEL_STACK = ["BT2-056", "BT23-006"];

describe("BT23-089 Takumi Aiba", () => {
  it("matches every catalog field and printed text", () => {
    expect(getCardDefinition("BT23-089")).toMatchObject({
      cardId: "BT23-089",
      nameEn: "Takumi Aiba",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["CS"],
      effectText:
        "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.\n" +
        "[All Turns] When any of your Digimon with the [CS]\u00a0trait would leave the battle area, by " +
        "suspending this Tamer and trash 2 same-level cards from 1 of your [CS]\u00a0trait Digimon's " +
        "digivolution cards, they don't leave.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("compiles the prevention as an all-affecting battle-area replacement with a hosted pair cost", () => {
    const replacement = compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "prevent",
      optional: true,
      affectsAll: true,
      target: {
        count: "all",
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          zone: "battleArea",
          nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
        },
      },
      cost: {
        kind: "compound",
        costs: [
          { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
          {
            kind: "trash",
            target: {
              count: 2,
              filter: {
                zone: "digivolutionCards",
                sameHost: true,
                sameLevelPair: true,
                hostFilter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  zone: "battleArea",
                  nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                },
              },
            },
          },
        ],
      },
    });
  });

  // ---------------------------------------------------------------------------
  // [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
  // ---------------------------------------------------------------------------

  it("gains 1 memory at the start of its controller's main phase while the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-089", as: "takumi" }],
        hand: [{ card: "BT1-009", as: "neutral" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
        security: NEUTRAL_SECURITY,
      },
      1: {
        battleArea: [{ card: "BT1-024", as: "opponentDigimon" }],
        deck: ["BT1-013", "BT1-014"],
        security: NEUTRAL_SECURITY,
      },
    });
    s.state.memory = 0;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("gains no memory when the opponent controls no Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-089", as: "takumi" }],
        hand: [{ card: "BT1-009", as: "neutral" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
        security: NEUTRAL_SECURITY,
      },
      1: { deck: ["BT1-013", "BT1-014"], security: NEUTRAL_SECURITY },
    });
    s.state.memory = 0;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores an opponent Digimon that is only in the breeding area", async () => {
    // Comprehensive rules 3-4-5-8: information on cards in breeding areas can't be referenced.
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-089", as: "takumi" }],
        hand: [{ card: "BT1-009", as: "neutral" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
        security: NEUTRAL_SECURITY,
      },
      1: {
        breeding: { card: "BT23-006", as: "opponentBreeding" },
        deck: ["BT1-013", "BT1-014"],
        security: NEUTRAL_SECURITY,
      },
    });
    s.state.memory = 0;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[1]!.breeding?.topCard?.cardId).toBe("BT23-006");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stays silent at the opponent's own start of main phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-089", as: "takumi" },
          { card: "BT1-009", as: "ownDigimon" },
        ],
        hand: [{ card: "BT1-009", as: "neutral" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
        security: NEUTRAL_SECURITY,
      },
      1: {
        battleArea: [{ card: "BT1-024", as: "opponentDigimon" }],
        hand: [{ card: "BT1-010", as: "opponentNeutral" }],
        deck: ["BT1-013", "BT1-014", "BT1-011"],
        security: NEUTRAL_SECURITY,
      },
    });
    s.state.memory = 0;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // Passing the turn hands seat 1 the minimum 3 memory. A second gain for seat 0 would read
    // as 2 here, so the exact 3 proves the Tamer stayed silent on the opponent's turn.
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // [All Turns] leave prevention.
  // ---------------------------------------------------------------------------

  /**
   * Seat 1's board for an own-turn battle: two big Digimon seeded SUSPENDED, so seat 0 can
   * attack them and lose the attacker in battle. Seat 1 never unsuspends on seat 0's turn.
   */
  function opponentBlockers() {
    return {
      battleArea: [
        { card: "BT1-009", as: "bigA", dp: 12_000, suspended: true },
        { card: "BT1-009", as: "bigB", dp: 12_000, suspended: true },
      ],
      hand: [{ card: "BT1-010", as: "opponentSpare" }],
      deck: ["BT1-013", "BT1-014", "BT1-012"],
      security: NEUTRAL_SECURITY,
    };
  }

  /** Start the real turn loop and stop inside `seat`'s open Main phase. */
  async function reachMainPhase(s: ReturnType<typeof setupEngine>, seat: 0 | 1): Promise<void> {
    await advance(s.engine).waitForMainPhase(seat);
  }

  /**
   * Open seat 0's own Main phase through the real turn loop. Returns the loop WRAPPED:
   * an async function that returned it directly would resolve to the loop promise itself
   * and hang the test.
   */
  async function openOwnTurn(s: ReturnType<typeof setupEngine>): Promise<{ loop: Promise<unknown> }> {
    const loop = s.engine.startTurnLoop();
    await reachMainPhase(s, 0);
    return { loop };
  }

  /** Attack `alias` into the named suspended opposing Digimon and let the battle settle. */
  async function attackInto(s: ReturnType<typeof setupEngine>, attacker: string, defender: string) {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm(attacker).permanentId,
        target: { kind: "permanent", permanentId: s.perm(defender).permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
  }

  it("pays the compound cost on the OPPONENT's turn to keep a [CS] Digimon deleted in battle", async () => {
    // [All Turns]: seat 0 suspends its own Angewomon by attacking the player on its own turn,
    // then seat 1 attacks that suspended Digimon on seat 1's turn.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-031", as: "angewomon", under: SAME_LEVEL_STACK },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 12_000 }],
          hand: [{ card: "BT1-010", as: "opponentSpare" }],
          deck: ["BT1-013", "BT1-014", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const angewomonPermanentId = s.perm("angewomon").permanentId;
    const stackIds = s.perm("angewomon").stack.map((card) => card.instanceId);
    expect(stackIds).toHaveLength(2);

    const { loop } = await openOwnTurn(s);
    // Suspend the Angewomon publicly: its 6000 DP beats seat 1's 3000 DP top security card.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: angewomonPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("angewomon").isSuspended).toBe(true);
    expect(s.perm("takumi").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await reachMainPhase(s, 1);
    const trashBefore = s.state.players[0]!.trash.length;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: angewomonPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takumi").isSuspended && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(angewomonPermanentId);
    expect(s.perm("angewomon").topCard?.cardId).toBe("BT23-031");
    expect(s.perm("angewomon").stack).toHaveLength(0);
    expect(s.perm("takumi").isSuspended).toBe(true);
    const trashed = s.state.players[0]!.trash.slice(trashBefore).map((card) => card.instanceId);
    expect(trashed.sort()).toEqual([...stackIds].sort());
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("lets the controller decline: the Digimon leaves and nothing is paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-031", as: "angewomon", under: SAME_LEVEL_STACK },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: opponentBlockers(),
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const angewomonPermanentId = s.perm("angewomon").permanentId;
    const angewomonId = s.perm("angewomon").topCard!.instanceId;

    const { loop } = await openOwnTurn(s);
    await attackInto(s, "angewomon", "bigA");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === angewomonPermanentId)).toBe(
      false,
    );
    // Declining pays nothing: the whole permanent (top card plus its 2 stack cards) is trashed.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(angewomonId);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.perm("takumi").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("cannot pay from a stack without a same-level pair", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-031", as: "angewomon", under: MIXED_LEVEL_STACK },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: opponentBlockers(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const angewomonPermanentId = s.perm("angewomon").permanentId;

    const { loop } = await openOwnTurn(s);
    await attackInto(s, "angewomon", "bigA");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === angewomonPermanentId)).toBe(
      false,
    );
    expect(s.perm("takumi").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("cannot pay a second time while this Tamer is already suspended by the first payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-031", as: "angewomonA", under: SAME_LEVEL_STACK },
            { card: "BT23-031", as: "angewomonB", under: SAME_LEVEL_STACK },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: opponentBlockers(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const permanentA = s.perm("angewomonA").permanentId;
    const permanentB = s.perm("angewomonB").permanentId;
    const bId = s.perm("angewomonB").topCard!.instanceId;

    const { loop } = await openOwnTurn(s);
    // First payment: A is saved, the Tamer suspends, A's same-level pair is trashed.
    await attackInto(s, "angewomonA", "bigA");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentA)).toBe(true);
    expect(s.perm("takumi").isSuspended).toBe(true);
    expect(s.perm("angewomonA").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(2);

    // Second would-leave event with the suspend half of the cost unpayable: B leaves.
    await attackInto(s, "angewomonB", "bigB");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentB)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(bId);
    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.perm("takumi").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not protect a Digimon without the [CS] trait even when the cost is payable", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-031", as: "angewomon", under: SAME_LEVEL_STACK },
            { card: "BT1-013", as: "plain" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: opponentBlockers(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const plainPermanentId = s.perm("plain").permanentId;
    const plainId = s.perm("plain").topCard!.instanceId;

    const { loop } = await openOwnTurn(s);
    await attackInto(s, "plain", "bigA");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === plainPermanentId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([plainId]);
    expect(s.perm("takumi").isSuspended).toBe(false);
    expect(s.perm("angewomon").stack).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not protect the opponent's [CS] Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-031", as: "angewomon", under: SAME_LEVEL_STACK },
            { card: "BT1-009", as: "attacker", dp: 12_000 },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT23-006", as: "opponentCs", suspended: true }],
          hand: [{ card: "BT1-010", as: "opponentSpare" }],
          deck: ["BT1-013", "BT1-014", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const opponentCsPermanentId = s.perm("opponentCs").permanentId;
    const opponentCsId = s.perm("opponentCs").topCard!.instanceId;

    const { loop } = await openOwnTurn(s);
    await attackInto(s, "attacker", "opponentCs");

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentCsPermanentId)).toBe(
      false,
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([opponentCsId]);
    expect(s.perm("takumi").isSuspended).toBe(false);
    expect(s.perm("angewomon").stack).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("saves every [CS] Digimon leaving together for a single payment", async () => {
    // BT25-093 Ignition Flare deletes ALL of the opponent's lowest-DP Digimon in one event.
    // "They don't leave" pays once and saves both.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-031", as: "angewomonA", under: SAME_LEVEL_STACK },
            { card: "BT23-031", as: "angewomonB", under: SAME_LEVEL_STACK },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponentDigimon" }],
          hand: [{ card: "BT25-093", as: "flare" }],
          deck: ["BT1-013", "BT1-014", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const permanentIds = [s.perm("angewomonA").permanentId, s.perm("angewomonB").permanentId];

    const loop = s.engine.startTurnLoop();
    await reachMainPhase(s, 0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await reachMainPhase(s, 1);
    s.state.memory = 5;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("takumi").isSuspended && s.state.pendingDecision === undefined);

    for (const permanentId of permanentIds) {
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId)).toBe(true);
    }
    expect(s.perm("takumi").isSuspended).toBe(true);
    // Exactly one payment: 2 cards left one of the two stacks, the other stack is untouched.
    expect(s.state.players[0]!.trash).toHaveLength(2);
    const stackSizes = [s.perm("angewomonA").stack.length, s.perm("angewomonB").stack.length].sort();
    expect(stackSizes).toEqual([0, 2]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // [Security] Play this card without paying the cost.
  // ---------------------------------------------------------------------------

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT23-089", as: "securityTakumi" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "attacker" }],
          hand: [{ card: "BT1-010", as: "opponentSpare" }],
          deck: ["BT1-013", "BT1-014", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const takumiId = s.inst("securityTakumi").instanceId;

    const loop = s.engine.startTurnLoop();
    await reachMainPhase(s, 0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await reachMainPhase(s, 1);
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === takumiId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === takumiId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === takumiId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(0);
    // Seat 1 is the turn player: its memory is unchanged by seat 0's free play.
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
