import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-105.js";
describe("BT7-105 Pride Memory Boost!", () => {
  it("reveals and plays a low-cost black Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT7-056"],
          hand: [{ card: "BT7-105", as: "option" }],
          deck: ["BT7-057", "BT7-001", "BT7-002"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT7-105"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT7-105")).toBe(true);
  });
});

describe("BT7-105 Pride Memory Boost! — KB Q&A rulings", () => {
  it("is placed in the battle area whether or not a Digimon is played from the reveal (Q1670)", async () => {
    const usePrideMemoryBoost = async (deck: string[]) => {
      const s = setupEngine({
        0: { battleArea: ["BT7-056"], hand: [{ card: "BT7-105", as: "option" }], deck },
      });
      s.state.memory = 7;
      await s.ready();
      const optionId = s.inst("option").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
      await settle();
      const offered = s.decisions.flatMap(
        ({ req }) => (req.options?.candidateInstanceIds as string[] | undefined) ?? [],
      );
      const revealedCardIds = new Map(
        s.decisions.flatMap(({ req }) =>
          ((req.options?.visibleCards as { instanceId: string; cardId: string }[] | undefined) ?? []).map(
            ({ instanceId, cardId }) => [instanceId, cardId] as const,
          ),
        ),
      );
      const pending = s.decisions.at(-1)?.req;
      const declineResult =
        pending === undefined
          ? undefined
          : s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: pending.decisionId,
              response: { kind: "selectCards", instanceIds: [] },
            });
      await settle();
      const player = s.state.players[0]!;
      return {
        pending: pending && { kind: pending.kind, min: pending.options?.min },
        declineResult,
        offeredCardIds: offered.map((instanceId) => revealedCardIds.get(instanceId)),
        placed: player.battleArea.some((permanent) => permanent.topCard.instanceId === optionId),
        trashed: player.trash.some((card) => card.instanceId === optionId),
        trashCardIds: player.trash.map((card) => card.cardId),
      };
    };

    const noEligibleCard = await usePrideMemoryBoost(["BT7-044", "BT7-051", "BT2-087"]);
    expect(noEligibleCard).toMatchObject({
      pending: undefined,
      offeredCardIds: [],
      placed: true,
      trashed: false,
    });
    expect(noEligibleCard.trashCardIds).toEqual(expect.arrayContaining(["BT7-044", "BT7-051", "BT2-087"]));

    const declinedPlay = await usePrideMemoryBoost(["BT7-057", "BT7-044", "BT7-051"]);
    expect(declinedPlay).toMatchObject({
      pending: { kind: "selectCards", min: 0 },
      declineResult: { ok: true },
      offeredCardIds: ["BT7-057"],
      placed: true,
      trashed: false,
    });
    expect(declinedPlay.trashCardIds).toEqual(expect.arrayContaining(["BT7-057", "BT7-044", "BT7-051"]));
  });
});
