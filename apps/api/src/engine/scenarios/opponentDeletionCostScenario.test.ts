import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

async function chooseOpponentCost(
  s: ReturnType<typeof setupEngine>,
  expectedCandidates: readonly string[],
  opponentCostId: string,
): Promise<void> {
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  const decision = s.decisions.at(-1)!.req;
  expect(decision.options?.candidateInstanceIds?.toSorted()).toEqual(expectedCandidates.toSorted());
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [opponentCostId] },
    }),
  ).toEqual({ ok: true });
}

describe("Discord 1557564616920408185 opponent deletion cost arenas", () => {
  it.each([true, false])("plays Velgrmon through the real turn loop (accept=%s)", async (accept) => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-bt18-velgrmon-opponent-cost", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const hostId = "dev-perm-0-velgrmon";
    const ownCostId = "dev-perm-0-velgrmon-own-cost";
    const opponentCostId = "dev-perm-1-velgrmon-opponent-cost";
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept },
      }),
    ).toEqual({ ok: true });
    if (accept) await chooseOpponentCost(s, [hostId, ownCostId, opponentCostId], opponentCostId);
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(human.battleArea.map(({ permanentId }) => permanentId)).toEqual([hostId, ownCostId]);
    expect(human.trash).toHaveLength(0);
    expect(human.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(["BT2-067"]);
    expect(opponent.security).toHaveLength(4);
    expect(opponent.battleArea.map(({ permanentId }) => permanentId)).toEqual(
      accept
        ? ["dev-perm-1-velgrmon-higher"]
        : [
            opponentCostId,
            "dev-perm-1-velgrmon-lowest-one",
            "dev-perm-1-velgrmon-lowest-two",
            "dev-perm-1-velgrmon-higher",
          ],
    );
    expect(opponent.trash.map(({ cardId }) => cardId).toSorted()).toEqual(
      (accept ? ["BT1-010", "BT18-077", "BT1-038", "BT1-039"] : ["BT1-010"]).toSorted(),
    );
    assertNoLoudGap(s);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([true, false])(
    "plays Targetmon's inherited replacement through the real turn loop (accept=%s)",
    async (accept) => {
      const s = setupEngine({ 0: {}, 1: {} });
      layDevScenario("arena-ex5-targetmon-opponent-cost", s.state, [BLUE_DECK, RED_DECK]);
      const loop = s.engine.startTurnLoop();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);

      const human = s.state.players[0]!;
      const opponent = s.state.players[1]!;
      const hostId = "dev-perm-0-targetmon-host";
      const ownCostId = "dev-perm-0-targetmon-own-cost";
      const opponentCostId = "dev-perm-1-targetmon-opponent-cost";
      const wallId = "dev-perm-1-targetmon-wall";
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: hostId,
          target: { kind: "permanent", permanentId: wallId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
      if (accept) await chooseOpponentCost(s, [ownCostId, opponentCostId], opponentCostId);
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

      expect(human.battleArea.map(({ permanentId }) => permanentId)).toEqual(
        accept ? [hostId, ownCostId] : [ownCostId],
      );
      expect(
        human.battleArea.find(({ permanentId }) => permanentId === hostId)?.stack.map(({ cardId }) => cardId),
      ).toEqual(accept ? ["EX5-046"] : undefined);
      expect(human.trash.map(({ cardId }) => cardId).toSorted()).toEqual(
        (accept ? [] : ["BT1-058", "EX5-046"]).toSorted(),
      );
      expect(opponent.battleArea.map(({ permanentId }) => permanentId)).toEqual(
        accept ? [wallId] : [wallId, opponentCostId],
      );
      expect(opponent.trash.some(({ cardId }) => cardId === "BT11-040")).toBe(accept);
      // Sukamon's own On Deletion also reveals and trashes three unrelated deck cards.
      expect(opponent.trash).toHaveLength(accept ? 4 : 0);
      assertNoLoudGap(s);
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  );
});
