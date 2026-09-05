import { describe, it, expect } from "vitest";
import { type PlayerState, type Seat } from "@aegis/shared";
import type { GameEngine } from "../../engine/GameEngine.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
// Self-register every card module so the engine drives the REGISTERED RB1-030 IR.
import "../index.js";

/**
 * A3 — RB1-030 Regulusmon (Purple): the granted custom [On Deletion] effect.
 *
 * source (documented behavior): a [When Digivolving]/[When Attacking] [Once Per Turn]
 * ability — "By trashing 1 card with [Gammamon] in its text in your hand, 1 of your Digimon gains
 * '[On Deletion] Delete 1 of your opponent's Digimon with the lowest level' until the end of your
 * opponent's turn." (documented behavior AddEffectToPermanent(targetPermanent, UntilOpponentTurnEnd, … timing:
 * OnDestroyedAnyone), whose granted effect targets IsPermanentExistsOnOpponentBattleAreaDigimon ∧
 * IsMinLevel(enemy) — documented behavior).
 *
 * The port routes this through GrantStatic grant:"effects" + tokens:["OnDeletionDeleteLowest"],
 * which installs a duration-scoped custom-effect grant (ContinuousEffectLedger.customEffectGrants).
 * The effect collector compiles the token to an [On Deletion] effect anchored on the GRANTED
 * permanent and gathers it at the SAME OnDestroyedAnyone window as a printed [On Deletion]
 * (gatherTriggeredEffects -> collectGrantedCustomEffects). The Delete target's
 * superlative:"lowestLevel" narrows the opponent's battle-area Digimon to minimum printed level
 * (== documented behavior IsMinLevel; ties: all extrema).
 *
 * The grant is conferred over the REAL digivolve intent (paying the real trash-1-Gammamon-text
 * cost), and the granted Digimon is deleted through the REAL deletePermanent primitive — both the
 * production seams.
 *
 * FAILS-WHEN-REVERTED levers (each reverts this proof to RED):
 *   1. Neuter the deletion-seam consumer (collectGrantedCustomEffects returns [], or remove the
 *      `...granted` spread in gatherTriggeredEffects): the grant installs but never fires on
 *      deletion -> the opponent's lowest-level Digimon survives.
 *   2. Neuter the grant store (grantCustomEffect / addCustomEffectGrant becomes a no-op): nothing
 *      is recorded -> nothing fires on deletion.
 *   3. Break the cost (no Gammamon-text card in hand): the trash cost is unpayable -> the grant
 *      never installs -> deleting the recipient deletes no opponent Digimon (NEGATIVE test below).
 */

const RB1_030 = "RB1-030"; // Regulusmon, Purple Lv.5, evoCost Purple/Lv.4/4
const GULUS_LV4 = "BT10-078"; // GulusGammamon, Purple Lv.4 (name+text contains "Gammamon")
const GAMMAMON_TEXT_OPTION = "BT10-094"; // Breaclaw — Option with "Gammamon" in effect text
const NON_GAMMAMON_OPTION = "BT1-085"; // an Option WITHOUT "Gammamon" in its text
const OPP_L3 = "BT1-009"; // Monodramon, vanilla Lv.3 (3000 DP)
const OPP_L4 = "BT1-014"; // Kokatorimon, vanilla Lv.4 (4000 DP)
const OPP_L5 = "BT1-020"; // Groundramon, vanilla Lv.5 (6000 DP)
const MY_RECIPIENT = "BT1-024"; // MetalTyrannomon, vanilla Lv.5 — the Digimon that gets the grant
const GAMMAMON_EFFECT_SOURCE = "BT10-078"; // GulusGammamon: [All Turns] Retaliation while Gammamon is in its stack

// The engine surface this A3 drives: the public intent/seat API plus the engine-internal seams
// that mechanic.test.ts already reaches the same way (recomputeContinuousEffects / primitives /
// continuous). Typed as an explicit shape (not `GameEngine & …`, which would collapse the
// private members to `never`).
type TestEngine = Pick<GameEngine, "applyIntent" | "seatPlayer"> & {
  recomputeContinuousEffects(): Promise<void>;
  primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
  continuous: {
    listCustomEffectGrants(): readonly { instanceId: string; token: string }[];
    sweep(state: import("@aegis/shared").GameState, boundary: "opponentTurnEnd", seat: Seat): void;
  };
};

/**
 * Build a board with a Purple Lv.4 Gammamon base for P0, opponent Digimon at distinct levels,
 * a dedicated grant-recipient Digimon for P0, and `costCardId` (if any) in P0's hand. Drive the
 * REAL digivolve into RB1-030 so its [When Digivolving] grant resolves. The recipient's permanent
 * is biased into `preferInstanceIds` so the chooseTargets decision hook selects it as the grant
 * target deterministically (not the freshly-evolved RB1-030).
 */
async function setupGranted(costCardId: string | undefined) {
  // Bias the grant-target chooseTargets decision toward the recipient (mutated below once its
  // instance id is known — the same array reference is read at decision time).
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          // P0 base: Purple Lv.4 Gammamon (the digivolution requirement) — high DP so it stays alive.
          { card: GULUS_LV4, dp: 4000, as: "base" },
          // P0 grant recipient — biased into preferInstanceIds below.
          { card: MY_RECIPIENT, dp: 7000, as: "recipient" },
        ],
        hand: [...(costCardId !== undefined ? [{ card: costCardId }] : []), { card: RB1_030, as: "evolving" }],
      },
      1: {
        // Opponent Digimon at levels 3/4/5 — the lowest level is 3 (Monodramon).
        battleArea: [
          { card: OPP_L5, dp: 6000, as: "oppL5" },
          { card: OPP_L4, dp: 4000, as: "oppL4" },
          { card: OPP_L3, dp: 3000, as: "oppL3" },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
  );
  const p0 = s.state.players[0] as PlayerState;
  const p1 = s.state.players[1] as PlayerState;
  const base = s.perm("base");
  const recipient = s.perm("recipient");
  const oppL3 = s.perm("oppL3");
  const oppL4 = s.perm("oppL4");
  const oppL5 = s.perm("oppL5");
  const evolving = s.inst("evolving");
  const engine = s.engine as unknown as TestEngine;

  preferInstanceIds.push(recipient.permanentId);

  s.state.memory = 10;

  await engine.recomputeContinuousEffects();
  engine.applyIntent(0, {
    type: "digivolve",
    permanentId: base.permanentId,
    instanceId: evolving.instanceId,
  });
  // Settle until RB1-030 is on the field AND the [When Digivolving] grant has fully resolved
  // (the grant resolves in the digivolve continuation, AFTER the evolved permanent appears).
  // When no cost card is supplied (negative case) the grant never installs, so also stop once
  // the cost card has either been trashed or the decision flow has quiesced.
  const expectGrant = costCardId !== undefined;
  await settle(() => {
    const evolved = p0.battleArea.some((p) => p.topCard?.cardId === RB1_030);
    if (!evolved) return false;
    if (expectGrant) return engine.continuous.listCustomEffectGrants().length > 0;
    return p0.hand.every((c) => c.cardId !== RB1_030);
  });

  return {
    s,
    engine,
    p0,
    p1,
    recipient,
    oppL3,
    oppL4,
    oppL5,
    evolvedRB: p0.battleArea.some((p) => p.topCard?.cardId === RB1_030),
  };
}

describe("A3 RB1-030 — granted '[On Deletion] delete lowest-level opponent Digimon'", () => {
  it("uses the Lv.4 Gammamon evolution requirement and copies an All Turns effect from a Gammamon-name stack card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GULUS_LV4, as: "base", under: [GAMMAMON_EFFECT_SOURCE] }],
          hand: [{ card: RB1_030, as: "evolving" }, GAMMAMON_TEXT_OPTION],
        },
        1: { battleArea: [{ card: OPP_L4, as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === RB1_030);

    expect(s.perm("base").topCard?.cardId).toBe(RB1_030);
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain(GAMMAMON_EFFECT_SOURCE);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Retaliation")).toBe(true);
  });

  it("copies Gammamon-name effects through RB1-030's inherited text on a higher host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-031", as: "host", under: [GAMMAMON_EFFECT_SOURCE, RB1_030] }] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
  });

  it("does not copy an effect from a non-Gammamon-name source card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-031", as: "host", under: ["BT11-078", RB1_030] }] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(false);
  });

  it("POSITIVE: granted Digimon's deletion deletes the opponent's LOWEST-level Digimon", async () => {
    const { s, engine, p1, recipient, oppL3, oppL4, oppL5, evolvedRB } = await setupGranted(GAMMAMON_TEXT_OPTION);
    expect(evolvedRB).toBe(true);

    // The grant landed on the recipient (paying the Gammamon-text trash cost).
    const grants = engine.continuous.listCustomEffectGrants();
    expect(
      grants.some((g) => g.instanceId === recipient.topCard.instanceId && g.token === "OnDeletionDeleteLowest"),
    ).toBe(true);

    // Delete the granted Digimon through the REAL effect-deletion primitive.
    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([recipient.permanentId], "byEffect");
    await settle(() => !p1.battleArea.some((p) => p.permanentId === oppL3.permanentId));

    // The lowest-level opponent Digimon (Lv.3 Monodramon) was deleted; the higher-level ones live.
    expect(p1.battleArea.some((p) => p.permanentId === oppL3.permanentId)).toBe(false);
    expect(p1.battleArea.some((p) => p.permanentId === oppL4.permanentId)).toBe(true);
    expect(p1.battleArea.some((p) => p.permanentId === oppL5.permanentId)).toBe(true);

    // No loud gap surfaced.
    expect(
      s.events.find((e) => e.kind === "actionRejected" && "reason" in e && /Unsupported effect/.test(e.reason)),
    ).toBeUndefined();
  });

  it("NEGATIVE (cost): no Gammamon-text card in hand => no grant => deletion deletes nothing", async () => {
    const { s, engine, p1, recipient, oppL3, oppL4, oppL5, evolvedRB } = await setupGranted(NON_GAMMAMON_OPTION);
    expect(evolvedRB).toBe(true);

    // The trash cost is unpayable (the only hand card has no "Gammamon" in its text) -> no grant.
    const grants = engine.continuous.listCustomEffectGrants();
    expect(grants.some((g) => g.instanceId === recipient.topCard.instanceId)).toBe(false);

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([recipient.permanentId], "byEffect");
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === recipient.permanentId));

    // No granted [On Deletion] fired: every opponent Digimon survives.
    expect(p1.battleArea.some((p) => p.permanentId === oppL3.permanentId)).toBe(true);
    expect(p1.battleArea.some((p) => p.permanentId === oppL4.permanentId)).toBe(true);
    expect(p1.battleArea.some((p) => p.permanentId === oppL5.permanentId)).toBe(true);
  });

  it("EXPIRY: the grant lapses at the end of the opponent's turn (UntilOpponentTurnEnd)", async () => {
    const { s, engine, recipient, evolvedRB } = await setupGranted(GAMMAMON_TEXT_OPTION);
    expect(evolvedRB).toBe(true);
    expect(engine.continuous.listCustomEffectGrants().some((g) => g.instanceId === recipient.topCard.instanceId)).toBe(
      true,
    );

    // Sweep the opponent-turn-end boundary as the opponent (seat 1): UntilOpponentTurnEnd grants
    // (framed from the granter seat 0) clear at the end of seat-0's opponent's turn.
    engine.continuous.sweep(s.state, "opponentTurnEnd", 1 as Seat);

    expect(engine.continuous.listCustomEffectGrants().some((g) => g.instanceId === recipient.topCard.instanceId)).toBe(
      false,
    );
  });
});
