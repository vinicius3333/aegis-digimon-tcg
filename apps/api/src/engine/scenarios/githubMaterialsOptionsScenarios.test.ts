import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import type { IssueReproScenarioId } from "../issueReproScenarios.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

async function start(id: IssueReproScenarioId, decline = false) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: !decline,
      autoDeclineOptional: decline,
      autoSelectCards: true,
      autoChooseOption: true,
      declinePrompts: ["Arts Digivolve"],
    },
  );
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

it("#5167 arena rejects Yokomon and accepts a Digimon for Assembly", async () => {
  const { s, loop } = await start("arena-issue-5167-assembly-digimon", true);
  const player = s.state.players[0]!;
  const dark = player.hand.find((c) => c.cardId === "BT26-073")!;
  const egg = player.trash.find((c) => c.cardId === "BT26-001")!;
  const digimon = player.trash.find((c) => c.cardId === "BT26-069")!;
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: dark.instanceId,
      assembly: { materialInstanceIds: [egg.instanceId] },
    }),
  ).toEqual({ ok: false, reason: "invalid-material" });
  expect(s.state.memory).toBe(10);
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: dark.instanceId,
      assembly: { materialInstanceIds: [digimon.instanceId] },
    }),
  ).toEqual({ ok: true });
  await settle();
  expect(
    player.battleArea.find((p) => p.topCard.instanceId === dark.instanceId)?.stack.map((c) => c.instanceId),
  ).toEqual([digimon.instanceId]);
  expect(player.trash.map((c) => c.instanceId)).toEqual([egg.instanceId]);
  expect(s.state.memory).toBe(4);
  expect(s.state.pendingDecision).toBeUndefined();
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});

it("#5171 arena digivolves Taomon ACE and uses only Famis for free", async () => {
  const { s, loop } = await start("arena-issue-5171-taomon-famis");
  const player = s.state.players[0]!;
  const base = player.battleArea.find((p) => p.topCard.cardId === "BT1-051")!;
  const tao = player.hand.find((c) => c.cardId === "BT19-037")!;
  const famis = player.hand.find((c) => c.cardId === "BT26-032")!;
  const dualColor = player.hand.find((c) => c.cardId === "BT26-033")!;
  expect(
    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: tao.instanceId }),
  ).toEqual({ ok: true });
  await settle(
    () => player.trash.some((c) => c.instanceId === famis.instanceId) && s.state.pendingDecision === undefined,
  );
  expect(base.topCard.instanceId).toBe(tao.instanceId);
  expect(base.stack.map((c) => c.cardId)).toEqual(["BT1-051"]);
  expect(player.hand.map((c) => c.instanceId)).toContain(dualColor.instanceId);
  expect(s.decisions.flatMap((d) => d.req.options?.candidateInstanceIds ?? [])).not.toContain(dualColor.instanceId);
  expect(s.state.players[1]!.battleArea.every((p) => p.isSuspended)).toBe(true);
  expect(s.state.memory).toBe(7);
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
