import { describe, expect, it } from "vitest";
import "#api/cards/index";
import fixture from "#api/engine/scenarios/inherited-on-deletion-survives-source-replay.fixture";
import { advance } from "#api/engine/testkit/advance";
import { finishTurnLoop } from "#api/engine/testkit/finishTurnLoop";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";

describe("inherited On Deletion after its digivolution card is replayed from trash", () => {
  it("still offers Crowmon's inherited effect once Ravemon's On Deletion plays Crowmon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupScenario(fixture, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      declineDigiXros: true,
      declinePrompts: ["Digivolve"],
      preferTriggerKeys: ["BT27-083"],
      preferInstanceIds,
    });
    await s.ready();
    const crowmonId = s.inst("crowmon").instanceId;
    const peckmonId = s.inst("peckmon").instanceId;
    const ravemonId = s.perm("ravemon").topCard.instanceId;
    preferInstanceIds.push(crowmonId);
    const player = s.state.players[0]!;
    const topCardIds = () => player.battleArea.map((permanent) => permanent.topCard.instanceId);
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("ravemon").permanentId,
          target: { kind: "digimon", permanentId: s.perm("strongerDigimon").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          topCardIds().includes(peckmonId) &&
          s.state.pendingDecision === undefined &&
          s.state.combatWindow === undefined,
        2000,
      );

      const ravemonPlay = s.decisions.findIndex(
        ({ req }) => req.kind === "selectCards" && req.options?.effectKey?.startsWith("BT27-083/") === true,
      );
      const crowmonInherited = s.decisions.findIndex(
        ({ req }) =>
          req.kind === "optional" &&
          req.options?.timing === "OnDeletion" &&
          req.options.isInherited === true &&
          req.options.effectKey?.startsWith("BT26-076/") === true,
      );
      expect(ravemonPlay).toBeGreaterThanOrEqual(0);
      expect(crowmonInherited).toBeGreaterThan(ravemonPlay);
      expect(topCardIds()).toEqual(expect.arrayContaining([crowmonId, peckmonId]));
      expect(player.trash.map((card) => card.instanceId)).toContain(ravemonId);
    } finally {
      await finishTurnLoop({ setup: s, loop });
    }
  });
});
