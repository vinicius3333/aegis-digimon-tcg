import "#api/cards/BT27/BT27-072";
import "#api/cards/BT6/BT6-064";
import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import fixture from "#api/engine/scenarios/alliance-without-ally.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle, type EngineSetup } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";

type AllyState = "missing" | "suspended" | "active";

function fixtureWithAlly(allyState: AllyState) {
  const [attacker, ally] = fixture.board[0]!.battleArea!;
  const battleArea =
    allyState === "missing" ? [attacker!] : [attacker!, { ...(ally as object), suspended: allyState === "suspended" }];
  return { ...fixture, board: { ...fixture.board, 0: { ...fixture.board[0], battleArea } } };
}

function offeredAllianceKeys(s: EngineSetup) {
  return s.decisions
    .filter(({ req }) => req.kind === "orderTriggers")
    .flatMap(({ req }) => req.options?.triggerKeys ?? [])
    .filter((key) => key.includes("/alliance/"));
}

async function attackWithGrantedAlliance(allyState: AllyState) {
  const s = setupScenario(fixtureWithAlly(allyState), {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoOrderTriggers: false,
  });
  await s.ready();
  s.state.phase = Phase.Main;
  expect(s.perm("attacker").keywords).toContain("Alliance");
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  return s;
}

describe("Alliance without an eligible ally", () => {
  it.each<AllyState>(["missing", "suspended"])(
    "skips the Alliance trigger when the other Digimon is %s",
    async (allyState) => {
      const s = await attackWithGrantedAlliance(allyState);
      await settle(
        () =>
          s.state.pendingDecision?.kind === "orderTriggers" ||
          (!observe(s.engine).isAttacking() && s.state.pendingDecision === undefined),
      );
      expect(offeredAllianceKeys(s)).toEqual([]);
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      expect(s.events.some((event) => event.kind === "alliancePrompt")).toBe(false);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
    },
  );

  it("still offers Alliance when an unsuspended ally can pay its cost", async () => {
    const s = await attackWithGrantedAlliance("active");
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    expect(offeredAllianceKeys(s)).toHaveLength(1);
  });
});
