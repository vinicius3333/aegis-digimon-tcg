import { describe, expect, it } from "vitest";
import "#api/cards/index";
import fixture from "#api/engine/scenarios/self-deletion-cost-offers-inherited-on-deletion.fixture";
import { advance } from "#api/engine/testkit/advance";
import { finishTurnLoop } from "#api/engine/testkit/finishTurnLoop";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";

describe("inherited On Deletion when a Digimon deletes itself as an effect cost", () => {
  it("offers LadyDevimon's inherited effect after Cherubimon deletes itself and replays that LadyDevimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupScenario(fixture, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      declineDigiXros: true,
      preferInstanceIds,
    });
    await s.ready();
    const ladyDevimonId = s.perm("ladyDevimon").topCard.instanceId;
    const gazimonId = s.inst("gazimon").instanceId;
    preferInstanceIds.push(ladyDevimonId, gazimonId);
    const player = s.state.players[0]!;
    const topCardIds = () => player.battleArea.map((permanent) => permanent.topCard.instanceId);
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          instanceId: s.inst("cherubimon").instanceId,
          permanentId: s.perm("ladyDevimon").permanentId,
        }),
      ).toEqual({ ok: true });
      await settle(() => topCardIds().includes(gazimonId) && s.state.pendingDecision === undefined, 2000);

      expect(topCardIds()).toEqual(expect.arrayContaining([ladyDevimonId, gazimonId]));
      expect(player.trash.map((card) => card.cardId)).toContain("BT26-078");
    } finally {
      await finishTurnLoop({ setup: s, loop });
    }
  });
});
