import "#api/cards/index";
import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import fixture from "#api/engine/scenarios/start-of-main-played-tamer-misses-main-phase.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle } from "#api/engine/testkit/harness";
import { advance } from "#api/engine/testkit/advance";

it("does not trigger the Start of Main Phase effect of a Tamer played by a start of main phase effect", async () => {
  const preferred: string[] = [];
  const s = setupScenario(fixture, {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoChooseOption: true,
    preferOptionIndex: 1,
    preferInstanceIds: preferred,
  });
  preferred.push(
    s.inst("musketeersOption").instanceId,
    s.perm("sparrowmon").permanentId,
    s.inst("blackGatomon").instanceId,
    s.inst("asuna").instanceId,
  );
  const loop = s.engine.runOneTurn();
  try {
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);

    const player = s.state.players[0]!;
    const sparrowmon = s.perm("sparrowmon");
    expect(sparrowmon.topCard.instanceId).toBe(s.inst("blackGatomon").instanceId);
    expect(sparrowmon.stack[0]!.instanceId).toBe(s.inst("musketeersOption").instanceId);
    expect(player.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(s.inst("asuna").instanceId);
    expect(player.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("turnDraw").instanceId,
        s.inst("sparrowmonDraw").instanceId,
        s.inst("digivolveDraw").instanceId,
        s.inst("asunaCost").instanceId,
      ]),
    );
    expect(player.hand).toHaveLength(4);
    expect(player.deck.map((card) => card.instanceId)).toContain(s.inst("asunaDraw").instanceId);
    expect(player.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.phase).toBe(Phase.Main);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
