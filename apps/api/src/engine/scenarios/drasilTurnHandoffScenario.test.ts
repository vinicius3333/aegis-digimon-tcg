import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

it("Discord 1558122159975567360: Gallantmon's turn DP expires before King Drasil starts the next Main phase", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true, autoSelectCards: true });
  layDevScenario("arena-discord1558122159-drasil-turn-handoff", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  const gallantmon = s.state.players[1]!.battleArea[0]!;
  expect(gallantmon.currentDP).toBe(17000);
  const drasil = s.state.players[0]!.breeding!;
  const eggsBefore = s.state.players[0]!.eggDeck.length;
  const start = s.events.length;
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  await settle(() => s.state.pendingDecision === undefined && drasil.stack.length === 1);
  expect(gallantmon.currentDP).toBe(12000);
  expect(s.state.players[0]!.eggDeck.length).toBe(eggsBefore - 1);
  const handoff = s.events.slice(start).flatMap((event) => {
    if (event.kind === "turnEnded") return ["end"];
    if (event.kind === "phaseChanged") return [event.phase];
    if (event.kind === "effectTriggered" && event.sourceCardId === "BT13-007") return ["drasil"];
    return [];
  });
  expect(handoff).toEqual(["end", Phase.Active, Phase.Draw, Phase.Breeding, Phase.Main, "drasil"]);
  assertNoLoudGap(s);
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
