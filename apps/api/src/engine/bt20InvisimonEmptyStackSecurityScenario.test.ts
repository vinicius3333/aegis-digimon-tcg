import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

async function attackIntoFaceUpSecurity(scenario: "arena-bt20-invisimon-empty-stack" | "arena-bt20-invisimon-stacked") {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  layDevScenario(scenario, s.state, [BLUE_DECK, RED_DECK]);
  await s.ready();
  const human = s.state.players[0]!;
  const invisimon = human.battleArea[0]!;
  const securityBefore = human.security.length;
  expect(invisimon.topCard.cardId).toBe("BT20-055");
  expect(s.state.players[1]!.security[0]!.faceUp).toBe(true);

  const ownTurn = s.engine.runOneTurn();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: invisimon.permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  const decisionsBeforeAttack = s.decisions.length;
  const eventsBeforeAttack = s.events.length;
  await settle(() => s.events.some((event) => event.kind === "securityChecked"));
  await settle();
  const optionalPrompts = s.decisions
    .slice(decisionsBeforeAttack)
    .filter(({ seat, req }) => seat === 0 && req.kind === "optional");
  const invisimonAnnouncements = s.events
    .slice(eventsBeforeAttack)
    .filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT20-055");
  return { s, human, invisimon, securityBefore, ownTurn, optionalPrompts, invisimonAnnouncements };
}

describe("BT20 Invisimon face-up security scenario", () => {
  it("keeps Invisimon with no digivolution cards in the battle area", async () => {
    const { s, human, invisimon, securityBefore, ownTurn, optionalPrompts, invisimonAnnouncements } =
      await attackIntoFaceUpSecurity("arena-bt20-invisimon-empty-stack");

    expect(optionalPrompts).toHaveLength(0);
    expect(invisimonAnnouncements).toHaveLength(0);

    expect(human.security).toHaveLength(securityBefore);
    expect(human.security.map(({ cardId }) => cardId)).not.toContain("BT20-055");
    expect(human.battleArea.map(({ permanentId }) => permanentId)).toEqual([invisimon.permanentId]);
    expect(invisimon.topCard.cardId).toBe("BT20-055");

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("places only the top card of a stacked Invisimon and keeps the stack below in play", async () => {
    const { s, human, invisimon, securityBefore, ownTurn, optionalPrompts, invisimonAnnouncements } =
      await attackIntoFaceUpSecurity("arena-bt20-invisimon-stacked");

    expect(optionalPrompts).toHaveLength(1);
    expect(invisimonAnnouncements).toHaveLength(1);

    expect(human.security).toHaveLength(securityBefore + 1);
    expect(human.security.at(-1)).toMatchObject({ cardId: "BT20-055", faceUp: true });
    expect(human.battleArea.map(({ permanentId }) => permanentId)).toEqual([invisimon.permanentId]);
    expect(invisimon.topCard.cardId).toBe("BT20-054");
    expect(invisimon.stack.map(({ cardId }) => cardId)).toEqual(["BT20-050"]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });
});
