import { expect } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

const BETELGAMMAMON_PLAYS_HIRO = "RB1-008";
const BETELGAMMAMON_BLITZ = "BT8-013";
const HIRO_AMANOKAWA = "RB1-032";
const GAMMAMON_WITH_INHERITED_DP = "RB1-005";

async function digivolveOnto(s: EngineSetup, evolvingAlias: string): Promise<void> {
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst(evolvingAlias).instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("host").topCard.instanceId === s.inst(evolvingAlias).instanceId);
}

/**
 * Digivolves `cardId` onto an [RB1-008 BetelGammamon], whose [When Digivolving] plays
 * [Hiro Amanokawa] from hand, and settles. The copied [When Digivolving] only reaches the
 * new top card through its "gains all effects of cards with [Gammamon] in their names".
 */
export async function digivolveOverWhenDigivolvingGammamon(cardId: string): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: BETELGAMMAMON_PLAYS_HIRO, as: "host" }],
        hand: [
          { card: cardId, as: "evolving" },
          { card: HIRO_AMANOKAWA, as: "hiro" },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: [BETELGAMMAMON_PLAYS_HIRO] },
  );
  s.state.memory = 10;
  await digivolveOnto(s, "evolving");
  await settle(() => s.state.pendingDecision === undefined);
  return s;
}

export function hiroWasPlayed(s: EngineSetup): boolean {
  return s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === HIRO_AMANOKAWA);
}

/**
 * Digivolves `cardId` onto a [BT8-013 BetelGammamon] ([When Digivolving] ＜Blitz＞) for a
 * cost that leaves the opponent with 1 memory, accepts the Blitz offer, and attacks the player.
 */
export async function blitzThroughCopiedGammamon(cardId: string): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: BETELGAMMAMON_BLITZ, as: "host" }],
        hand: [{ card: cardId, as: "evolving" }],
      },
      1: { security: ["BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 2;
  await digivolveOnto(s, "evolving");
  await settle(() => s.engine.hasAcceptedBlitzAttack(s.perm("host").permanentId));
  expect(s.state.memory).toBe(-1);
  expect(s.decisions.some(({ req }) => JSON.stringify(req).includes("activateBlitz"))).toBe(true);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.security.length === 0);
  return s;
}

/**
 * [RB1-005 Gammamon]'s inherited "+2000 DP" is inherited by the host once as a normal
 * inherited effect. Copying it again as an effect of the top card would double it.
 */
export async function hostDpWithGammamonInheritedSource(stack: string[], hostCardId: string): Promise<number> {
  const s = setupEngine({
    0: { battleArea: [{ card: hostCardId, as: "host", under: [GAMMAMON_WITH_INHERITED_DP, ...stack] }] },
  });
  await s.ready();
  return s.perm("host").currentDP;
}
