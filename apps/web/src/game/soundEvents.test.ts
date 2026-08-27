import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { CUE_REPEAT_WINDOW_MS, shouldPlayCue, soundForEvent } from "./soundEvents";

describe("soundForEvent", () => {
  it("maps board actions to their cues regardless of the acting seat", () => {
    const cases: { event: ServerEvent; cue: string }[] = [
      { event: { kind: "cardPlayed", seat: 0, cardId: "BT1-001" }, cue: "cardPlay" },
      { event: { kind: "cardPlayed", seat: 1, cardId: "BT1-001" }, cue: "cardPlay" },
      {
        event: { kind: "digivolved", seat: 1, permanentId: "p1", cardId: "BT1-010", mechanic: "normal" },
        cue: "digivolve",
      },
      { event: { kind: "hatched", seat: 0, permanentId: "p2", cardId: "BT1-002" }, cue: "hatch" },
      {
        event: {
          kind: "attackDeclared",
          seat: 1,
          attackerPermanentId: "p3",
          attackerCardId: "BT1-020",
          target: { kind: "player" },
        },
        cue: "attackDeclare",
      },
      {
        event: { kind: "securityRevealed", seat: 0, revealedCardId: "BT1-030", attackerPermanentId: "perm-1" },
        cue: "securityHit",
      },
      { event: { kind: "turnEnded", endingSeat: 0, nextSeat: 1, turnCount: 4 }, cue: "turnChange" },
    ];
    for (const { event, cue } of cases) expect(soundForEvent(event, 0)).toBe(cue);
  });

  it("picks the win cue only for the viewer who won", () => {
    const event: ServerEvent = { kind: "gameOver", result: { outcome: "win", winnerSeat: 0 }, reason: "security" };
    expect(soundForEvent(event, 0)).toBe("win");
    expect(soundForEvent(event, 1)).toBe("lose");
  });

  it("treats a draw as a losing cue for both seats", () => {
    const event: ServerEvent = { kind: "gameOver", result: { outcome: "draw" }, reason: "effect" };
    expect(soundForEvent(event, 0)).toBe("lose");
    expect(soundForEvent(event, 1)).toBe("lose");
  });

  it("stays silent for events without audio", () => {
    const silent: ServerEvent[] = [
      { kind: "matchStarted", firstSeat: 0 },
      { kind: "phaseChanged", phase: "main", turnSeat: 0, turnCount: 1 },
      { kind: "memoryChanged", from: 0, to: 3, reason: "playCard" },
      { kind: "actionRejected", intent: "playCard", reason: "notEnoughMemory" },
      { kind: "cardsMoved", instanceIds: ["i1"], from: "hand", to: "trash" },
      { kind: "movedFromBreeding", seat: 0, permanentId: "p1", cardId: "BT1-002" },
    ];
    for (const event of silent) expect(soundForEvent(event, 0)).toBeNull();
  });
});

describe("shouldPlayCue", () => {
  it("plays a cue that has never been played", () => {
    expect(shouldPlayCue("cardPlay", 1_000, {})).toBe(true);
  });

  it("suppresses the same cue inside the repeat window", () => {
    expect(shouldPlayCue("cardPlay", 1_000, { cardPlay: 1_000 - CUE_REPEAT_WINDOW_MS + 1 })).toBe(false);
  });

  it("plays the same cue again once the window has passed", () => {
    expect(shouldPlayCue("cardPlay", 1_000, { cardPlay: 1_000 - CUE_REPEAT_WINDOW_MS })).toBe(true);
  });

  it("never suppresses a different cue", () => {
    expect(shouldPlayCue("digivolve", 1_000, { cardPlay: 999 })).toBe(true);
  });
});
