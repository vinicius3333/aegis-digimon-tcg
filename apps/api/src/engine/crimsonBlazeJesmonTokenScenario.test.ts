import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("reproduces Decoy followed by Jesmon's blocked next-turn token (Discord 1556299783898005544)", async () => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: ["dev-field-1-crimson-decoy-token", "dev-field-1-crimson-protected-huckmon"],
    },
  );
  layDevScenario("arena-crimson-blaze-jesmon-token", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  expect(s.state.players[1]!.battleArea).toHaveLength(6);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-crimson-blaze" })).toEqual({ ok: true });
  await settle(
    () => s.state.players[0]!.trash.some((c) => c.cardId === "BT8-097") && s.state.pendingDecision === undefined,
  );
  expect(s.state.memory).toBe(3);
  expect(s.events).toContainEqual(
    expect.objectContaining({ kind: "deletionPrevented", keyword: "Decoy", cardId: "BT23-006" }),
  );
  expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId).sort()).toEqual(["BT23-006", "BT23-013"]);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  const jesmon = s.state.players[1]!.battleArea.find((p) => p.topCard.cardId === "BT23-013")!;
  expect(
    s.engine.applyIntent(1, { type: "attack", attackerPermanentId: jesmon.permanentId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
  await settle(() => combat.hasOpenAllianceDecision);
  expect(s.engine.applyIntent(1, { type: "respondAlliance" })).toEqual({ ok: true });
  await settle(() => s.events.some((e) => e.kind === "attackEnded") && s.state.pendingDecision === undefined);
  const tokens = s.state.players[1]!.battleArea.filter((p) => p.topCard.cardId === "TOKEN-AthoRenePor-Token");
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
  expect(tokens).toHaveLength(0);
  expect(s.decisions.some(({ req }) => req.promptText === "Modal" && req.sourceCardId === "BT23-013")).toBe(false);
});
