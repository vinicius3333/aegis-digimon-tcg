import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-035.js";
import "./P-036.js";
import "./P-037.js";
import "./P-038.js";
import "./P-039.js";
import "./P-040.js";

describe("Memory Boost support package", () => {
  it("resolves all six established Delay cards independently for 12 total memory", async () => {
    const cards = ["P-035", "P-036", "P-037", "P-038", "P-039", "P-040"];
    const s = setupEngine({
      0: {
        battleArea: cards.map((card, index) => ({ card, as: `boost${index}` })),
      },
    });
    s.state.memory = -2;
    for (let index = 0; index < cards.length; index += 1) {
      s.perm(`boost${index}`).placedByEffect = true;
    }

    for (let index = 0; index < cards.length; index += 1) {
      const delay = s.perm(`boost${index}`);
      delay.enterFieldTurnCount = s.state.turnCount - 1;
      (s.engine as unknown as { syncActivatableEffects(): void }).syncActivatableEffects();
      const entries = JSON.parse(delay.activatableEffectsJson ?? "[]") as Array<{
        instanceId: string;
        effectKey: string;
        description: string;
      }>;
      const entry = entries.find(({ instanceId, description }) =>
        instanceId === delay.topCard.instanceId && /delay/i.test(description)
      );
      expect(entry, cards[index]).toBeDefined();
      expect(s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: delay.topCard.instanceId,
        effectKey: entry!.effectKey,
      })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === cards[index]));
      const expectedMemory = -2 + ((index + 1) * 2);
      await settle(() => s.state.memory === expectedMemory);
      expect(s.state.memory, cards[index]).toBe(expectedMemory);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
        cards.slice(index + 1),
      );
    }

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(10);
  });
});
