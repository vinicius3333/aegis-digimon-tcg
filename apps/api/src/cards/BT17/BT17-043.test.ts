import { describe, expect, it } from "vitest";
import { EffectTiming, Zone, getCardDefinition } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-043.js";
import "./index.js";
import "../BT5/BT5-046.js";
import "../EX4/EX4-025.js";
import "../ST17/ST17-02.js";

const OPPONENT_BOARD = [
  { card: "BT1-013", as: "targetA" },
  { card: "BT1-014", as: "targetB" },
];

function suspendedOpponentCount(s: ReturnType<typeof setupEngine>): number {
  return s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended).length;
}

/**
 * Answer seat 0's `optional` ("use this effect?") prompts by hand, accepting every one
 * except BT17-043's suspend. `autoDeclineOptional` cannot express this: it would also
 * decline the play that has to happen for the suspend prompt to exist at all.
 */
async function declineOnlyTheSuspend(s: ReturnType<typeof setupEngine>): Promise<void> {
  for (let step = 0; step < 8; step += 1) {
    await settle();
    const decision = s.state.pendingDecision;
    if (decision?.kind !== "optional") return;
    const accept = !decision.promptText.startsWith("Suspend");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept },
      }),
    ).toEqual({ ok: true });
  }
}

function st17MainEffectKey(s: ReturnType<typeof setupEngine>, alias: string): string {
  const source = observe(s.engine).cardSource(s.inst(alias));
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("ST17-02/"))!
    .effectKey;
}

describe("BT17-043 Terriermon", () => {
  it("matches the catalog identity, printed text and the complete IR contract", () => {
    expect(getCardDefinition("BT17-043")).toMatchObject({
      cardId: "BT17-043",
      nameEn: "Terriermon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Beast"],
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      effectText:
        "[Your Turn] [Once Per Turn] When an effect plays one of your [Terriermon]/[Lopmon] or green Tamers, you may suspend 1 of your opponent's Digimon.",
      inheritedEffectText: "[All Turns] While this Digimon is suspended, it gets +1000 DP.",
    });

    expect(compiled.effects).toEqual([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenPlayed",
            sourceFilter: {
              controller: "mine",
              byEffect: true,
              or: [
                { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Terriermon", "Lopmon"], match: "nameExact" }] },
                { kind: ["Tamer"], colors: ["Green"] },
              ],
            },
            actions: [
              {
                kind: "Suspend",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                optional: true,
              },
            ],
          },
        ],
        frequency: "OncePerTurn",
      },
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Aura",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            effect: { kind: "modifyDP", amount: 1000 },
            while: { kind: "selfIsSuspended", raw: "this Digimon is suspended" },
          },
        ],
        isInherited: true,
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("suspends 1 opponent Digimon when another card's effect plays a [Terriermon], per Q2797", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-043", as: "terriermon" },
            { card: "EX4-025", as: "turuiemon" },
          ],
          trash: [{ card: "BT17-043", as: "trashedTerriermon" }],
          hand: [
            { card: "BT17-049", as: "antylamon" },
            { card: "BT1-009", as: "spare" },
          ],
        },
        1: { battleArea: OPPONENT_BOARD },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const playedId = s.inst("trashedTerriermon").instanceId;
    await s.ready();
    expect(suspendedOpponentCount(s)).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("turuiemon").permanentId,
        instanceId: s.inst("antylamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => suspendedOpponentCount(s) === 1);
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === playedId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === playedId)).toBe(false);
    expect(suspendedOpponentCount(s)).toBe(1);
    expect(s.perm("terriermon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
  });

  it("does not trigger on a played [Terriermon Assistant]: the printed name reference is exact", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-043", as: "terriermon" },
            { card: "EX4-025", as: "turuiemon" },
          ],
          trash: [{ card: "BT5-046", as: "assistant" }],
          hand: [
            { card: "BT17-049", as: "antylamon" },
            { card: "BT1-009", as: "spare" },
          ],
        },
        1: { battleArea: OPPONENT_BOARD },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const playedId = s.inst("assistant").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("turuiemon").permanentId,
        instanceId: s.inst("antylamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === playedId));
    await settle();

    expect(suspendedOpponentCount(s)).toBe(0);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("also triggers on an effect-played green Tamer, but only once per turn, and resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-043", as: "terriermon" },
            { card: "ST17-02", as: "st17" },
            { card: "EX4-025", as: "turuiemon" },
          ],
          trash: [{ card: "BT17-043", as: "trashedTerriermon" }],
          hand: [
            { card: "BT1-088", as: "izzy" },
            { card: "BT17-049", as: "antylamon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-013", "BT1-013"],
        },
        1: {
          battleArea: OPPONENT_BOARD,
          security: ["BT1-009"],
          deck: ["BT1-009", "BT1-013", "BT1-013"],
          hand: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const izzyId = s.inst("izzy").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("st17").topCard.instanceId,
        effectKey: st17MainEffectKey(s, "st17"),
      }),
    ).toEqual({ ok: true });
    await settle(() => suspendedOpponentCount(s) === 1);
    await settle();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === izzyId)).toBe(true);
    expect(s.state.memory).toBe(4);
    expect(suspendedOpponentCount(s)).toBe(1);

    // Second effect-play the same turn: [Once Per Turn] refuses a second suspend.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("turuiemon").permanentId,
        instanceId: s.inst("antylamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("trashedTerriermon").instanceId,
      ),
    );
    await settle();
    expect(suspendedOpponentCount(s)).toBe(1);
    expect(s.state.memory).toBe(1);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 4;
    await advance(s.engine).verb.unsuspend(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId));
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(suspendedOpponentCount(s)).toBe(0);

    s.give(0, Zone.Hand, { card: "BT1-088", as: "izzyTwo" });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("st17").topCard.instanceId,
        effectKey: st17MainEffectKey(s, "st17"),
      }),
    ).toEqual({ ok: true });
    await settle(() => suspendedOpponentCount(s) === 1);

    expect(suspendedOpponentCount(s)).toBe(1);
    s.engine.applyIntent(0, { type: "endPhase" });
    await nextOwnTurn;
  });

  it("does not trigger when a [Terriermon] is played from hand instead of by an effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-043", as: "terriermon" }],
          hand: [
            { card: "BT17-043", as: "handTerriermon" },
            { card: "BT1-009", as: "spare" },
          ],
        },
        1: { battleArea: OPPONENT_BOARD },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("handTerriermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("handTerriermon").instanceId,
      ),
    );
    await settle();

    expect(suspendedOpponentCount(s)).toBe(0);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("stays silent on the opponent's turn even when an own effect plays a [Terriermon]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-043", as: "terriermon" },
            { card: "BT17-046", dp: 6000, suspended: true, as: "gargomon" },
          ],
          trash: [{ card: "BT17-043", as: "trashedTerriermon" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009", "BT1-013"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-014", dp: 12_000, as: "attacker" },
            { card: "BT1-013", as: "bystander" },
          ],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const playedId = s.inst("trashedTerriermon").instanceId;
    await s.ready();

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    // Seat 1 deletes seat 0's Gargomon; its [On Deletion] plays a [Terriermon] from
    // seat 0's trash — an own effect-play, but on the opponent's turn.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("gargomon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === playedId));
    await settle();

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === playedId)).toBe(true);
    expect(s.perm("bystander").isSuspended).toBe(false);
    expect(suspendedOpponentCount(s)).toBe(1); // The attacker, suspended by attacking.
    expect(s.state.pendingDecision).toBeUndefined();

    s.engine.applyIntent(1, { type: "endPhase" });
    await opponentTurn;
  });

  it("leaves the opponent's board untouched when the optional suspend is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-043", as: "terriermon" },
            { card: "EX4-025", as: "turuiemon" },
          ],
          trash: [{ card: "BT17-043", as: "trashedTerriermon" }],
          hand: [
            { card: "BT17-049", as: "antylamon" },
            { card: "BT1-009", as: "spare" },
          ],
        },
        1: { battleArea: OPPONENT_BOARD },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    const playedId = s.inst("trashedTerriermon").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("turuiemon").permanentId,
        instanceId: s.inst("antylamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });

    // Accept BT17-049's optional play, then decline BT17-043's optional suspend.
    await declineOnlyTheSuspend(s);
    await settle();

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === playedId)).toBe(true);
    expect(suspendedOpponentCount(s)).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("grants the inherited +1000 DP only while the host is suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-046", dp: 6000, under: ["BT17-043"], as: "host" },
            { card: "BT17-046", dp: 6000, as: "peer" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.perm("peer").currentDP).toBe(6000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    await settle();

    // The peer carries no BT17-043 under it and is the control for the aura.
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.perm("peer").currentDP).toBe(6000);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await settle();
    expect(s.perm("host").currentDP).toBe(6000);
  });
});
