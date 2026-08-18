import { describe, expect, it } from "vitest";
import type { ParticipantView, RegistrationStatus, TournamentStatus } from "@aegis/shared";
import { entryActions, ownParticipant } from "./entry";
import type { TournamentDetail } from "./types";

function detail(status: TournamentStatus, participants: ParticipantView[], registeredCount = participants.length, maxPlayers = 8): TournamentDetail {
  return {
    id: "t-1", name: "Event", status, structure: "swiss", topCutEnabled: false, topCutSize: null,
    bestOf: 3, allowBots: false, rulesetPreset: "bandai_general", rulesetVersion: null,
    startsAt: 0, maxPlayers, registeredCount, banlistPolicy: { mode: "current" },
    block: "BT10", createdBy: null, winnerAccountId: null,
    rules: null, banlistCards: [], matches: [], participants,
  };
}

function human(displayName: string, status: RegistrationStatus): ParticipantView {
  return { id: `p-${displayName}-${status}`, kind: "human", displayName, status, seed: null };
}

describe("ownParticipant", () => {
  it("finds the signed-in player's row by display name", () => {
    const participants = [human("Tamer One", "registered"), human("Tamer Two", "checked_in")];
    expect(ownParticipant(participants, "Tamer Two")?.status).toBe("checked_in");
  });

  it("refuses to guess when the name is missing, absent or shared", () => {
    const shared = [human("Twin", "registered"), human("Twin", "dropped")];
    expect(ownParticipant(shared, "Twin")).toBeUndefined();
    expect(ownParticipant(shared, undefined)).toBeUndefined();
    expect(ownParticipant(shared, "Nobody")).toBeUndefined();
    // A bot with the same display name is never the signed-in human.
    expect(ownParticipant([{ id: "b", kind: "bot", displayName: "Tamer", status: "active", seed: null }], "Tamer")).toBeUndefined();
  });
});

describe("entryActions", () => {
  it("offers registration only while registration is open and the field has room", () => {
    expect(entryActions(detail("registration", []), undefined).register).toBe(true);
    expect(entryActions(detail("check_in", []), undefined).register).toBe(false);
    expect(entryActions(detail("running", []), undefined).register).toBe(false);
    expect(entryActions(detail("finished", []), undefined).register).toBe(false);
    expect(entryActions(detail("cancelled", []), undefined).register).toBe(false);
    expect(entryActions(detail("registration", [], 8, 8), undefined).register).toBe(false);
  });

  it("withdraws registration once the player already holds a seat", () => {
    for (const status of ["registered", "checked_in", "active"] as const) {
      const own = human("Me", status);
      expect(entryActions(detail("registration", [own]), own).register).toBe(false);
    }
    // A dropped player freed their seat, so registering again is offered.
    const dropped = human("Me", "dropped");
    expect(entryActions(detail("registration", [dropped]), dropped).register).toBe(true);
    const banned = human("Me", "disqualified");
    expect(entryActions(detail("registration", [banned]), banned).register).toBe(false);
  });

  it("offers check-in only in a check-in state and only to a registered player", () => {
    const registered = human("Me", "registered");
    expect(entryActions(detail("check_in", [registered]), registered).checkIn).toBe(true);
    expect(entryActions(detail("running", [registered]), registered).checkIn).toBe(false);

    const already = human("Me", "checked_in");
    expect(entryActions(detail("check_in", [already]), already).checkIn).toBe(false);
    const dropped = human("Me", "dropped");
    expect(entryActions(detail("check_in", [dropped]), dropped).checkIn).toBe(false);
  });

  it("offers dropping only to a player holding a seat in a live event", () => {
    const registered = human("Me", "registered");
    expect(entryActions(detail("running", [registered]), registered).drop).toBe(true);
    expect(entryActions(detail("finished", [registered]), registered).drop).toBe(false);

    const gone = human("Me", "dropped");
    expect(entryActions(detail("running", [gone]), gone).drop).toBe(false);
  });

  it("offers the action when identity is unknown, so a name clash never costs an action", () => {
    // Unidentified means "the payload cannot rule it out"; the server still decides.
    const actions = entryActions(detail("check_in", [human("Twin", "registered"), human("Twin", "registered")]), undefined);
    expect(actions.checkIn).toBe(true);
    expect(actions.drop).toBe(true);
  });
});
