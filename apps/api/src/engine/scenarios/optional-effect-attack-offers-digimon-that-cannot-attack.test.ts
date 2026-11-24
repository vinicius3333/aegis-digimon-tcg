import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "#api/cards/index";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/optional-effect-attack-offers-digimon-that-cannot-attack.fixture";

async function digivolveYukinamonAndChoose(alias: "playedThisTurn" | "establishedHost") {
  const preferred: string[] = [];
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
  const chosen = s.perm(alias);
  preferred.push(chosen.permanentId, chosen.topCard.instanceId);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      instanceId: s.inst("yukinamon").instanceId,
      permanentId: s.perm("establishedHost").permanentId,
    }),
  ).toEqual({ ok: true });
  const finish = async () => {
    if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat as 0 | 1, { type: "surrender" });
    await loop;
  };
  const offeredAttackerIds = () =>
    s.decisions
      .filter(({ req }) => req.kind === "chooseTargets" && req.options?.selectionContext === "attackSource")
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
  return { s, finish, offeredAttackerIds };
}

describe("optional effect attack with a Digimon played this turn on the board", () => {
  it("still offers the Digimon played this turn, and choosing it declares no attack (Q818)", async () => {
    const { s, finish, offeredAttackerIds } = await digivolveYukinamonAndChoose("playedThisTurn");
    try {
      await settle(() => offeredAttackerIds().length > 0 && !s.state.pendingDecision);

      expect(offeredAttackerIds()).toEqual(
        expect.arrayContaining([s.perm("playedThisTurn").permanentId, s.perm("establishedHost").permanentId]),
      );
      expect(s.perm("playedThisTurn").isSuspended).toBe(false);
      expect(s.state.players[1]!.security).toHaveLength(3);
      expect(s.state.phase).toBe(Phase.Main);
    } finally {
      await finish();
    }
  });

  it("attacks security when the Digimon that can attack is chosen", async () => {
    const { s, finish } = await digivolveYukinamonAndChoose("establishedHost");
    try {
      await settle(() => !s.state.pendingDecision && s.state.players[1]!.security.length === 2);

      expect(s.perm("establishedHost").topCard.instanceId).toBe(s.inst("yukinamon").instanceId);
      expect(s.perm("establishedHost").isSuspended).toBe(false);
      expect(s.state.players[1]!.security).toHaveLength(2);
      expect(s.state.memory).toBe(2);
      expect(s.state.turnSeat).toBe(0);
    } finally {
      await finish();
    }
  });
});
