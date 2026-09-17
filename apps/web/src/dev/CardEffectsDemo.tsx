import { useEffect, useMemo, useState } from "react";
import type { DecisionRequest } from "@aegis/shared";
import { GameScreen } from "../game/GameScreen";
import type { UseRoomResult } from "../net/useRoom";
import { cardEffectsFixtures } from "./cardEffects";
import type { CardEffectsFixture } from "./cardEffects/fixture";

type DemoConnection = Pick<
  UseRoomResult,
  "room" | "status" | "state" | "events" | "decision" | "acknowledgeDecision" | "error" | "sessionId" | "roomCode"
> & {
  acknowledgeBlockWindow?: (blockerPermanentId?: string) => void;
};

export function CardEffectsDemo({ cardId }: { cardId: string }) {
  const params = new URLSearchParams(window.location.search);
  const effect = params.get("effect");
  const step = params.get("step");
  const fixture = useMemo<CardEffectsFixture | undefined>(
    () => cardEffectsFixtures[cardId]?.(cardId, effect, step),
    [cardId, effect, step],
  );
  const [decision, setDecision] = useState<DecisionRequest | undefined>(fixture?.decision);
  const [blockWindowAcknowledged, setBlockWindowAcknowledged] = useState(false);
  // The match screen treats the first batch of events it sees as replayed
  // history and narrates none of it. Holding the fixture's events back by one
  // commit makes them arrive as fresh events, which is what the demo is for.
  const [narrating, setNarrating] = useState(false);
  useEffect(() => setNarrating(true), []);

  if (!fixture) {
    return <main className="aegis-screen-fallback">No simulated match is registered for {cardId}. Try EX3-074.</main>;
  }

  const demoConnection: DemoConnection = {
    room: undefined,
    status: "connected",
    state: fixture.state,
    // Demo fixtures are plain ServerEvents (no live room stream to stamp them); synthesize the
    // sequencing envelope so the shape matches what useRoom actually hands GameScreen. The
    // values themselves are inert here — the demo has no batches for a stateVersion to gate.
    events: (!narrating
      ? []
      : blockWindowAcknowledged
        ? (fixture.events ?? []).filter((event) => event.kind !== "blockWindowOpened")
        : (fixture.events ?? [])
    ).map((event, index) => ({ ...event, seq: index + 1, batch: "demo", stateVersion: 0 })),
    decision,
    acknowledgeDecision: () => setDecision(undefined),
    acknowledgeBlockWindow: () => setBlockWindowAcknowledged(true),
    error: undefined,
    sessionId: fixture.sessionId ?? "card-effects-viewer",
    roomCode: "",
  };

  // Each fixture explains, in its own words, what the simulated moment proves. The match
  // notice beside it prints the card's own text instead (that is what a player needs during
  // a game), so this page states its scenario notes itself rather than smuggling them
  // through an event the board renders as printed rules text.
  const scenarioNotes = [
    ...new Set(
      (fixture.events ?? [])
        // Only the triggered-effect notice swaps its description for printed rules text;
        // every other narrated event still shows the words the fixture gave it.
        .map((event) => (event.kind === "effectTriggered" ? event.description : undefined))
        .filter((note): note is string => typeof note === "string" && note.trim().length > 0),
    ),
  ];

  return (
    <>
      <GameScreen
        joinOptions={{ displayName: "Effect tester", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Blue"
        onExit={() => window.location.assign("/")}
        demoConnection={demoConnection}
      />
      {scenarioNotes.length > 0 ? (
        <aside className="card-effects-demo-notes" aria-label="Scenario notes">
          {scenarioNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </aside>
      ) : null}
    </>
  );
}
