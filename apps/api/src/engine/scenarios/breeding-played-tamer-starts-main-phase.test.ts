import "#api/cards/index";
import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import fixture from "#api/engine/scenarios/breeding-played-tamer-starts-main-phase.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle } from "#api/engine/testkit/harness";
import { advance } from "#api/engine/testkit/advance";

it("triggers the Start of Main Phase effect of a Tamer played during the breeding phase", async () => {
  const preferred: string[] = [];
  const s = setupScenario(fixture, {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoChooseOption: true,
    preferOptionIndex: 1,
    preferInstanceIds: preferred,
  });
  preferred.push(
    s.inst("beelStarmon").instanceId,
    s.inst("blackGatomon").instanceId,
    s.inst("asuna").instanceId,
    s.inst("asunaCost").instanceId,
  );
  const loop = s.engine.runOneTurn();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("gazimon").permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);

    const player = s.state.players[0]!;
    const gazimon = s.perm("gazimon");
    expect(gazimon.topCard.instanceId).toBe(s.inst("blackGatomon").instanceId);
    expect(gazimon.stack.map((card) => card.instanceId)).toContain(s.inst("beelStarmon").instanceId);
    expect(player.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(s.inst("asuna").instanceId);
    expect(player.trash.map((card) => card.instanceId)).toContain(s.inst("asunaCost").instanceId);
    expect(player.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("turnDraw").instanceId,
        s.inst("digivolveDraw").instanceId,
        s.inst("asunaDraw").instanceId,
      ]),
    );
    expect(player.hand).toHaveLength(3);
    expect(s.state.memory).toBe(1);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.phase).toBe(Phase.Main);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
