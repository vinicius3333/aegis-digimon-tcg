import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

/**
 * Ends a turn with [RB1-034 Ruli Tsukiyono] and a suspended [RB1-025 Diarbbitmon] whose
 * [End of Your Turn] effects trigger together.
 */
export async function endTurnWithSuspendedDiarbbitmon() {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "RB1-034", as: "ruli" },
          { card: "RB1-025", as: "diarbbit" },
        ],
      },
      1: { battleArea: [{ card: "EX2-045", as: "target" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["RB1-034"] },
  );
  s.state.turnSeat = 0;
  const diarbbitId = s.perm("diarbbit").permanentId;

  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  await advance(s.engine).verb.suspend([diarbbitId]);
  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
  await settle();

  const attackIndex = s.events.findIndex(
    (event) => event.kind === "attackDeclared" && event.attackerPermanentId === diarbbitId && event.redirected !== true,
  );
  const ruliResolvedIndex = s.events.findIndex(
    (event) => event.kind === "effectResolved" && event.sourceCardId === "RB1-034",
  );
  return {
    attacked: attackIndex >= 0,
    unsuspendedBeforeAttack: ruliResolvedIndex >= 0 && ruliResolvedIndex < attackIndex,
    targetDeleted: s.state.players[1]!.trash.some((card) => card.cardId === "EX2-045"),
  };
}

/**
 * Ends a turn with [RB1-034 Ruli Tsukiyono], an unsuspended [RB1-025 Diarbbitmon], and an
 * [RB1-020 Angoramon] suspended during the main phase, so both [End of Your Turn] effects are
 * pending together and the turn player resolves `first` before the other. Diarbbitmon's
 * attacker choice prefers Angoramon.
 */
export async function endTurnResolvingFirst(first: "RB1-034" | "RB1-025") {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "RB1-034", as: "ruli" },
          { card: "RB1-025", as: "diarbbit" },
          { card: "RB1-020", as: "angoramon" },
        ],
      },
      1: { battleArea: [{ card: "EX2-045", as: "target" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: [first], preferInstanceIds },
  );
  s.state.turnSeat = 0;
  const angoramonId = s.perm("angoramon").permanentId;
  preferInstanceIds.push(s.perm("angoramon").topCard.instanceId);

  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  await advance(s.engine).verb.suspend([angoramonId]);
  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
  await settle();

  const orderPrompt = s.decisions.find(({ req }) => req.kind === "orderTriggers");
  return {
    offeredOrder: orderPrompt?.req.options?.triggerCardIds ?? [],
    attackerIds: s.events.flatMap((event) =>
      event.kind === "attackDeclared" && event.redirected !== true ? [event.attackerPermanentId] : [],
    ),
    angoramonId,
    diarbbitId: s.perm("diarbbit").permanentId,
  };
}
