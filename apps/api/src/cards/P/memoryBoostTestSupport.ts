import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

type MemoryBoostCase = {
  cardId: string;
  name: string;
  colorSource: string;
  matchingDigimon: string;
  offColorDigimon: string;
};

export function memoryBoostTests(testCase: MemoryBoostCase): void {
  const matchingColorFiller =
    (
      {
        "BT1-009": "ST1-16",
        "BT1-027": "BT1-101",
        "BT1-045": "BT1-107",
        "BT1-064": "BT1-108",
        "BT2-052": "BT10-105",
        "BT10-079": "BT10-107",
      } as Record<string, string>
    )[testCase.colorSource] ?? "ST1-16";

  describe(`${testCase.cardId} ${testCase.name}`, () => {
    it("shows all 4 revealed cards, enables only the matching-color Digimon, and orders the rest", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: testCase.colorSource }],
            hand: [{ card: testCase.cardId, as: "option" }],
            deck: [
              { card: testCase.matchingDigimon, as: "matching" },
              { card: testCase.offColorDigimon, as: "offColor" },
              { card: "ST1-16", as: "nonDigimonOption" },
              { card: "BT1-089", as: "tamer" },
            ],
          },
        },
        { autoSelectCards: false, autoOrderCards: false },
      );
      s.state.memory = 3;
      const optionId = s.inst("option").instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: optionId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "selectCards");

      const selection = s.decisions.at(-1)!.req;
      expect(selection.options?.visibleInstanceIds).toEqual([
        s.inst("matching").instanceId,
        s.inst("offColor").instanceId,
        s.inst("nonDigimonOption").instanceId,
        s.inst("tamer").instanceId,
      ]);
      expect(selection.options?.candidateInstanceIds).toEqual([s.inst("matching").instanceId]);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: selection.decisionId,
          response: { kind: "selectCards", instanceIds: [s.inst("matching").instanceId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "orderCards");

      const order = s.decisions.at(-1)!.req;
      const bottomOrder = [
        s.inst("tamer").instanceId,
        s.inst("nonDigimonOption").instanceId,
        s.inst("offColor").instanceId,
      ];
      expect(order.options?.visibleCards?.map((card) => card.instanceId)).toEqual(expect.arrayContaining(bottomOrder));
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: order.decisionId,
          response: { kind: "orderCards", order: bottomOrder },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

      expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(bottomOrder);
    });

    it("adds only its matching-color Digimon, then Delays for 2 memory on a later turn", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: testCase.colorSource }],
            hand: [{ card: testCase.cardId, as: "option" }],
            deck: [
              { card: testCase.matchingDigimon, as: "matching" },
              { card: testCase.offColorDigimon, as: "offColor" },
              matchingColorFiller,
              matchingColorFiller,
            ],
          },
        },
        { autoSelectCards: true, autoOrderCards: true },
      );
      s.state.memory = 3;
      const optionInstanceId = s.inst("option").instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: optionInstanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === testCase.cardId),
      );

      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("matching").instanceId)).toBe(true);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("offColor").instanceId)).toBe(false);

      const delay = s.state.players[0]!.battleArea.find(
        (permanent) => permanent.topCard?.instanceId === optionInstanceId,
      );
      expect(delay).toBeDefined();
      if (!delay) return;
      delay.enterFieldTurnCount = s.state.turnCount - 1;
      (s.engine as unknown as { syncActivatableEffects(): void }).syncActivatableEffects();
      const entries = JSON.parse(delay.activatableEffectsJson ?? "[]") as Array<{
        instanceId: string;
        effectKey: string;
        description: string;
      }>;
      const entry = entries.find(
        ({ instanceId, description }) => instanceId === delay.topCard.instanceId && /delay/i.test(description),
      );
      expect(entry).toBeDefined();

      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: delay.topCard.instanceId,
          effectKey: entry!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(
        () => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === delay.permanentId),
      );
      await settle(() => s.state.memory === 2);

      expect(s.state.memory).toBe(2);
      expect(s.state.players[0]!.trash.some((card) => card.cardId === testCase.cardId)).toBe(true);
    });

    it("does not let an Option permanent satisfy another copy's color requirement", () => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: testCase.cardId, as: "placedBoost" }],
          hand: [{ card: testCase.cardId, as: "secondBoost" }],
        },
      });
      s.perm("placedBoost").placedByEffect = true;
      s.state.memory = 3;

      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("secondBoost").instanceId,
        }),
      ).toEqual({ ok: false, reason: "color-requirement-unmet" });
    });

    it("places itself from a real security attack and offers Delay on the next natural turn", async () => {
      const s = setupEngine({
        0: {
          security: [{ card: testCase.cardId, as: "securityBoost", faceUp: true }],
          hand: ["ST1-16"],
          deck: Array.from({ length: 20 }, () => "ST1-16"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 5000 }],
          deck: Array.from({ length: 20 }, () => "ST1-16"),
        },
      });
      const optionId = s.inst("securityBoost").instanceId;

      await s.ready();
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player", seat: 0 },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId) &&
          s.state.pendingDecision === undefined &&
          s.state.players[0]!.security.length === 0 &&
          !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
      );
      const delay = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === optionId);
      expect(delay).toBeDefined();
      if (!delay) return;

      (s.engine as unknown as { syncActivatableEffects(): void }).syncActivatableEffects();
      expect(JSON.parse(delay.activatableEffectsJson || "[]")).toHaveLength(0);

      advance(s.engine).endMainPhaseIfOpen(1);
      await advance(s.engine).waitForMainPhase(0);
      (s.engine as unknown as { syncActivatableEffects(): void }).syncActivatableEffects();
      const entries = JSON.parse(delay.activatableEffectsJson || "[]") as Array<{
        instanceId: string;
        effectKey: string;
        description: string;
      }>;
      const entry = entries.find(({ description }) => /delay/i.test(description));
      expect(entry).toBeDefined();
      const beforeMemory = s.state.memory;

      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: optionId,
          effectKey: entry!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.memory === beforeMemory + 2);

      expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });
  });
}
