import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-046.js";
import "./index.js";

describe("BT20-046 Espimon", () => {
  it("reduces a battle-area Espimon's digivolution into a Cyborg or Machine by 1", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true, zone: "battleArea" },
          into: { nameOrTrait: [{ tokens: ["Cyborg", "Machine"], match: "trait" }] },
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });

  it("grants the inherited +1000 DP continuously on all turns", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
  });

  it("reduces the Cyborg alternate evolution in battle but not in breeding", async () => {
    for (const zone of ["battleArea", "breeding"] as const) {
      const s = setupEngine({
        0: {
          ...(zone === "battleArea"
            ? { battleArea: [{ card: "BT20-046", as: "espimon" }] }
            : { breeding: { card: "BT20-046", as: "espimon" } }),
          hand: [{ card: "BT20-050", as: "hover" }],
        },
      });
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("espimon").permanentId,
          instanceId: s.inst("hover").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("espimon").topCard.cardId === "BT20-050");
      // HoverEspimon's printed Lv.3 Cyborg evolution cost is 2. The
      // battle-area Your Turn replacement reduces it to 1; Q4369 confirms
      // that replacement does not trigger while Espimon remains in breeding.
      expect(s.state.memory).toBe(zone === "battleArea" ? 2 : 1);
    }
  });

  it.each([
    ["Machine", "BT20-049", 2, 2, 5000],
    ["non-Cyborg/non-Machine", "BT20-031", 3, 1, 6000],
  ] as const)(
    "publicly evolves into a black Lv.4 %s with the exact cost boundary",
    async (_label, target, printedCost, expectedMemory, expectedDP) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT20-046", as: "espimon" }],
          hand: [{ card: target, as: "target" }],
        },
      });
      s.state.memory = printedCost + 1;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("espimon").permanentId,
          instanceId: s.inst("target").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("espimon").topCard.cardId === target);
      expect(s.state.memory).toBe(expectedMemory);
      expect(s.perm("espimon").stack.map((card) => card.cardId)).toEqual(["BT20-046"]);
      expect(s.perm("espimon").currentDP).toBe(expectedDP);
    },
  );

  it("grants +1000 DP to its inherited host on both players' turns", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-050", dp: 4000, under: ["BT20-046"], as: "host" }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
