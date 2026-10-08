import { getCardDefinition, Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/BT20/BT20-102.js";
import "../cards/BT9/BT9-092.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("#5324 actual turn: all printed traits exist; Cool Boy accepts Omni X, rejects plain Omnimon, and rewards same-level evolution", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true });
  layDevScenario("arena-github-5324-omnimon-traits", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const player = s.state.players[0]!;
    const fieldX = player.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-102")!;
    expect(getCardDefinition(fieldX.topCard.cardId)?.types).toEqual([
      "Holy Warrior",
      "X Antibody",
      "Royal Knight",
      "LIBERATOR",
    ]);
    const plain = player.battleArea.find((permanent) => permanent.topCard.cardId === "BT5-086")!;
    expect(getCardDefinition(plain.topCard.cardId)?.types).toEqual(["Holy Warrior", "Royal Knight"]);
    const searchX = player.deck[0]!;
    const searchPlain = player.deck[1]!;
    const nonX = player.deck[2]!;
    const handX = player.hand.find((card) => card.cardId === "BT20-102")!;
    expect(searchX.cardId).toBe("BT20-102");
    expect(searchPlain.cardId).toBe("BT5-086");
    const coolBoy = player.hand.find((card) => card.cardId === "BT9-092")!;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: coolBoy.instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const request = s.decisions.at(-1)!.req;
    expect(request.options).toMatchObject({ candidateInstanceIds: [searchX.instanceId], min: 1, max: 1 });
    for (const instanceIds of [[searchPlain.instanceId], [nonX.instanceId], []])
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: request.decisionId,
          response: { kind: "selectCards", instanceIds },
        }).ok,
      ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "selectCards", instanceIds: [searchX.instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => player.hand.some((card) => card.instanceId === searchX.instanceId) && s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(4);
    expect(player.hand.some((card) => card.instanceId === searchPlain.instanceId)).toBe(false);
    expect(player.hand.some((card) => card.instanceId === nonX.instanceId)).toBe(false);
    const handBeforeEvolution = player.hand.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: handX.instanceId,
        permanentId: plain.permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const survivor = s.decisions.at(-1)!.req;
    expect(survivor.sourceCardId).toBe("BT20-102");
    expect(survivor.options?.candidateInstanceIds).toContain(plain.permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: survivor.decisionId,
        response: { kind: "chooseTargets", instanceIds: [plain.permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        plain.topCard.instanceId === handX.instanceId && s.state.memory === 3 && s.state.pendingDecision === undefined,
    );
    expect(
      player.battleArea.find((permanent) => permanent.topCard.instanceId === coolBoy.instanceId)?.isSuspended,
    ).toBe(true);
    expect(player.hand).toHaveLength(handBeforeEvolution + 1); // Spend one, normal evolution draw, Cool Boy draw.
    expect(plain.stack.map((card) => card.cardId)).toEqual(["BT5-086"]);
    expect(player.battleArea.some((permanent) => permanent.permanentId === fieldX.permanentId)).toBe(false);
    expect(getCardDefinition(plain.topCard.cardId)?.types).toEqual(getCardDefinition(fieldX.topCard.cardId)?.types);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
