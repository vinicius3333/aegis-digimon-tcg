import { gzipSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CATALOG_DECKS, type DecisionRequest } from "@aegis/shared";
import { ReplayRecording, projectReplay } from "../../../api/src/replays/recording.js";
import { openScenarioRoom } from "../pacing/scenarioRoom";
import { SKIP, answerCombatWindow, answerDecision } from "../pacing/scenarios";
import { REPLAY_PLANS } from "./scenarioPlans";
import { readReplay } from "../../src/replays/files";

describe("authoritative complex replay recordings", () => {
  for (const plan of REPLAY_PLANS)
    it(`${plan.id}`, async () => {
      vi.useFakeTimers();
      vi.setSystemTime(Date.parse("2026-09-30T12:00:00Z"));
      const id = plan.id;
      const deck = CATALOG_DECKS.find((entry) => entry.deckId === "bt26-dgo-2026-08-28-7-chronomon")!;
      let decision: DecisionRequest | undefined;
      const resolved: [number, number] = [0, 0];
      const session = openScenarioRoom({
        scenario: id,
        seed: 412,
        humanDeck: { mainDeck: [...deck.decklist.mainDeck], eggDeck: [...deck.decklist.eggDeck] },
        botDeckId: "bt26-dgo-2026-08-28-8-plutomon",
        presentationPacing: "sequential",
        onMessage(message) {
          if (message.channel === "decision") decision = message.request;
          if (message.channel === "event" && message.event.kind === "effectResolved") resolved[message.event.seat]++;
        },
      });
      vi.spyOn(session.room, "lock").mockResolvedValue(undefined);
      const recording = new ReplayRecording(Date.now());
      // Dev layouts intentionally disable participant downloads. Use the room's normal
      // recording seam after initialization so every subsequent batch is captured at close.
      (session.room as unknown as { replayRecording: ReplayRecording }).replayRecording = recording;
      recording.capture(session.room.state, []);
      let move = 0;
      let done = false;
      const errors: string[] = [];
      const off = vi.spyOn(console, "error").mockImplementation((...args) => errors.push(String(args[0])));
      try {
        for (let elapsed = 0; elapsed < plan.maxMs; elapsed += 50) {
          await vi.advanceTimersByTimeAsync(50);
          const state = session.room.state;
          if (state.gameOver) break;
          if (decision && state.pendingDecision?.decisionId === decision.decisionId) {
            const response = answerDecision(decision, state, plan.answers);
            if (response) {
              session.send({ type: "respondDecision", decisionId: decision.decisionId, response });
              decision = undefined;
            }
          } else if (state.combatWindow) {
            const intent = answerCombatWindow(state, plan.answers);
            if (intent) session.send(intent);
          } else if (!state.pendingDecision) {
            if (move < plan.moves.length) {
              const intent = plan.moves[move]!(state);
              if (intent === SKIP) move++;
              else if (intent) {
                session.send(intent);
                move++;
              }
            } else if (plan.finished(state, resolved)) {
              done = true;
              break;
            }
          }
        }
        expect(done, `${id}: moves=${move}, resolved=${resolved}, phase=${session.room.state.phase}`).toBe(true);
        session.send({ type: "surrender" });
        await vi.advanceTimersByTimeAsync(50);
        const replay = projectReplay(recording.complete("bot")!, 0);
        replay.players = ["Agumon Player", "Gabumon Player"];
        for (const frame of replay.frames)
          for (const player of frame.state.players) player.displayName = replay.players[player.seat]!;
        const bytes = gzipSync(JSON.stringify(replay));
        expect(await readReplay(new Blob([bytes]))).toMatchObject({ visibleHandSeats: [0, 1] });
        expect(replay.frames.length).toBeGreaterThan(5);
        expect(errors).toEqual([]);
        if (process.env.REPLAY_FIXTURE_OUTPUT) {
          mkdirSync(process.env.REPLAY_FIXTURE_OUTPUT, { recursive: true });
          writeFileSync(join(process.env.REPLAY_FIXTURE_OUTPUT, `${id}.aegis-replay`), bytes);
        }
      } finally {
        off.mockRestore();
        session.dispose();
        vi.useRealTimers();
      }
    }, 30000);
});
