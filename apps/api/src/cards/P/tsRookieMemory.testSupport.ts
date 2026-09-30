import type { ServerEvent } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

/**
 * Opens seat 0's main phase at 0 memory with [BT12-092 Marcus Damon], an [ST1-03 Agumon], and
 * `rookieCardId` (a [TS] Rookie whose [Start of Your Main Phase] needs 4 or less memory). Marcus's
 * simultaneous start-of-main effect resolves first and pays 1 memory, so the Rookie's condition is
 * read with the memory on the opponent's side.
 */
export async function startMainAfterMarcusPaysIntoNegativeMemory(rookieCardId: string) {
  const memoryWhenResolved = new Map<string, number>();
  let s: EngineSetup | undefined;
  const recordResolution = (event: ServerEvent) => {
    if (event.kind === "effectResolved" && s !== undefined && !memoryWhenResolved.has(event.sourceCardId)) {
      memoryWhenResolved.set(event.sourceCardId, s.state.memory);
    }
  };
  s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT12-092", as: "marcus" },
          { card: "ST1-03", as: "agumon" },
          { card: rookieCardId, as: "rookie" },
        ],
        hand: [{ card: "P-194", as: "aegiomon" }],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["BT12-092"], onEvent: recordResolution },
  );
  const setup = s;
  setup.state.memory = 0;
  await setup.ready();
  const rookieDigivolved = () => setup.perm("rookie").topCard.instanceId === setup.inst("aegiomon").instanceId;
  const loop = setup.engine.startTurnLoop();
  await settle(() => memoryWhenResolved.has(rookieCardId) && setup.state.pendingDecision === undefined, 2000);

  const result = {
    memoryAfterMarcus: memoryWhenResolved.get("BT12-092"),
    memoryAfterRookie: memoryWhenResolved.get(rookieCardId),
    digivolved: rookieDigivolved(),
  };
  setup.engine.applyIntent(setup.state.turnSeat as 0 | 1, { type: "surrender" });
  await loop;
  return result;
}
