import { expect } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type BoardSpec } from "../../engine/testkit/harness.js";

/**
 * EX7-052 Tsukaimon and EX7-054 BlackGatomon share the inherited
 * "[Opponent's Turn] When an opponent's Digimon attacks, by deleting 1 of your other Digimon, end the attack."
 */
type Scenario = { host: string; inheritedCard: string };

async function declareOpponentPlayerAttack(board: BoardSpec, preferredAlias?: string) {
  const preferred: string[] = [];
  const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
  if (preferredAlias !== undefined)
    preferred.push(s.perm(preferredAlias).permanentId, s.perm(preferredAlias).topCard.instanceId);
  s.state.turnSeat = 1;
  await s.ready();
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  return s;
}

export async function attackIntoPreventedDeletionCost({ host, inheritedCard }: Scenario) {
  const s = await declareOpponentPlayerAttack({
    0: {
      battleArea: [
        { card: host, as: "host", under: [inheritedCard] },
        { card: "BT8-039", as: "armorPurge", under: [{ card: "BT8-046", as: "armorPurgeSource" }] },
      ],
      security: [{ card: "BT1-090", as: "security" }],
    },
    1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
  });
  await settle(() => s.state.players[0]!.security.length === 0 && !observe(s.engine).isAttacking());
  return s;
}

export async function attackIntoEndedAttackWithBlockerReady({ host, inheritedCard }: Scenario) {
  const s = await declareOpponentPlayerAttack(
    {
      0: {
        battleArea: [
          { card: host, as: "host", under: [inheritedCard] },
          { card: "BT1-009", as: "cost" },
          { card: "ST1-06", as: "blocker" },
        ],
        security: [{ card: "BT1-090", as: "security" }],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    },
    "cost",
  );
  const costPermanentId = s.perm("cost").permanentId;
  await settle(
    () =>
      !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === costPermanentId) &&
      !observe(s.engine).isAttacking() &&
      s.state.pendingDecision === undefined,
  );
  return s;
}
