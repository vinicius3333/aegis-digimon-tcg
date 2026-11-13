import { Phase } from "@aegis/shared/schema/enums";
import { describe, expect, it } from "vitest";
import "#api/cards/index";
import securityPlayFixture from "#api/engine/scenarios/security-play-on-play-before-next-check.fixture";
import attackerWinFixture from "#api/engine/scenarios/attacker-win-play-on-play-before-next-check.fixture";
import type { ScenarioFixture } from "#api/engine/scenario/types";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";

type Scenario = ReturnType<typeof setupScenario>;

async function attackPlayer(fixture: ScenarioFixture, directed: boolean): Promise<{ s: Scenario; reveals: number[] }> {
  const preferred: string[] = [];
  const s = setupScenario(fixture, {
    autoAcceptOptional: true,
    autoSelectCards: true,
    preferInstanceIds: preferred,
  });
  preferred.push(s.perm("attacker").permanentId);
  await s.ready();
  s.state.phase = Phase.Main;
  const result = directed
    ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("director").instanceId })
    : s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      });
  expect(result).toEqual({ ok: true });
  await settle(
    () =>
      s.events.some((event) => event.kind === "attackEnded") &&
      !observe(s.engine).isAttacking() &&
      !s.state.pendingDecision,
  );
  const reveals = s.events.flatMap((event, index) => (event.kind === "securityRevealed" ? [index] : []));
  return { s, reveals };
}

describe("On Play of a Digimon played during a security check", () => {
  it.each([false, true])(
    "resolves a security-effect play's On Play before the next check with an effect-directed attack=%s",
    async (directed) => {
      const { s, reveals } = await attackPlayer(securityPlayFixture, directed);
      expect(reveals).toHaveLength(2);
      const defender = s.state.players[1]!;
      expect(defender.hand.map((card) => card.cardId)).toEqual(["BT20-102"]);
      expect(defender.battleArea.map((permanent) => permanent.topCard.cardId).sort()).toEqual(["BT20-083", "BT20-100"]);
      expect(defender.security).toHaveLength(1);
      expect(
        s.events.some(
          (event, index) =>
            index > reveals[1]! &&
            (event.kind === "effectTriggered" || event.kind === "effectResolved") &&
            event.sourceCardId === "BT20-083",
        ),
      ).toBe(false);
    },
  );

  it.each([false, true])(
    "resolves an attacker-played Digimon's On Play before the next check with an effect-directed attack=%s",
    async (directed) => {
      const { s, reveals } = await attackPlayer(attackerWinFixture, directed);
      expect(reveals).toHaveLength(2);
      const breakdramonOnPlay = s.events.findIndex(
        (event) =>
          event.kind === "effectResolved" && event.sourceCardId === "EX13-044" && event.effectKey === "EX13-044/ir-6-0",
      );
      expect(breakdramonOnPlay).toBeGreaterThan(reveals[0]!);
      expect(breakdramonOnPlay).toBeLessThan(reveals[1]!);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("EX13-044");
      const tamer = s.state.players[1]!.battleArea.find((permanent) => permanent.topCard.cardId === "AD1-022");
      expect(tamer).toBeDefined();
      expect(tamer!.isSuspended).toBe(false);
      expect(s.state.players[1]!.security).toHaveLength(1);
    },
  );
});
